-- Kasbah La Moun PMS : schéma initial.
-- Appliquer avec `supabase db push` ou en collant dans l'éditeur SQL du tableau de bord.

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

create type staff_role as enum ('reception', 'driver', 'spa', 'kitchen', 'guide', 'housekeeping');
create type resource_kind as enum ('spa', 'vehicle', 'dining', 'guide');
create type order_kind as enum ('transfer', 'spa', 'dinner', 'concierge');
create type order_status as enum ('pending', 'confirmed', 'declined', 'cancelled', 'done');
create type event_kind as enum ('order', 'block');

-- Équipe : chaque personne a son calendrier (events.staff_id), son lien Telegram et son flux iCal.
create table staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role staff_role not null,
  phone text,
  email text unique,                      -- doit correspondre au compte Supabase Auth pour l'appli équipe
  telegram_chat_id bigint unique,         -- rempli quand la personne ouvre le bot avec son code
  link_code text unique not null default encode(gen_random_bytes(4), 'hex'),
  ical_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Ressources réservables : le spa (privatisé, donc exclusif), le véhicule, la table, le guide.
create table resources (
  id uuid primary key default gen_random_uuid(),
  kind resource_kind not null,
  name text not null,
  exclusive boolean not null default true,   -- true : un seul créneau à la fois (contrainte d'exclusion)
  capacity int not null default 1,           -- couverts pour la table ; ignoré si exclusive
  buffer_min int not null default 0,         -- marge ajoutée après chaque créneau (nettoyage du spa, trajet retour)
  default_staff_id uuid references staff(id) on delete set null,
  active boolean not null default true
);

create table resource_hours (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references resources(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),   -- 0 = dimanche (comme extract(dow))
  open_time time not null,
  close_time time not null,
  slot_minutes int not null default 30
);

create table guests (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null default '',
  email text,
  phone_e164 text unique,
  nationality text,
  country text,
  city text,
  lang text not null default 'fr',
  offers_optin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Un séjour = un check-in en ligne. Le token est la clé que garde le téléphone du client.
create table stays (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references guests(id) on delete cascade,
  token uuid unique not null default gen_random_uuid(),
  arrival date,
  departure date,
  people int not null default 2,
  suite text,
  purpose text,
  purpose_other text,
  source text,
  source_other text,
  checkout_time time,
  flight_out time,
  transfer_wish text,
  checkin_at timestamptz not null default now(),
  raw jsonb
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  short_id text unique not null default upper(encode(gen_random_bytes(3), 'hex')),
  stay_id uuid references stays(id) on delete set null,
  guest_id uuid references guests(id) on delete set null,
  kind order_kind not null,
  status order_status not null default 'pending',
  requested_at timestamptz not null default now(),
  lang text not null default 'fr',
  notes text,
  guest_message text,          -- le texte WhatsApp en français, gardé pour mémoire
  details jsonb not null default '{}'::jsonb,
  total_mad int,
  created_by text not null default 'guest',   -- guest | staff:<id>
  decided_by uuid references staff(id) on delete set null,
  decided_at timestamptz,
  decided_via text              -- telegram | admin
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  label_fr text not null,
  qty int not null default 1,
  unit_price_mad int,
  duration_min int,
  catalog_key text
);

-- Le calendrier. Un seul tableau : la vue "maître" est tout, le calendrier d'une personne est
-- events where staff_id, celui d'une ressource est events where resource_id. Les fermetures
-- manuelles sont des events kind = 'block'.
create table events (
  id uuid primary key default gen_random_uuid(),
  kind event_kind not null default 'order',
  order_id uuid references orders(id) on delete cascade,
  resource_id uuid references resources(id) on delete set null,
  staff_id uuid references staff(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  title text not null,
  status order_status not null default 'pending',
  party_size int not null default 1,
  exclusive boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Deux créneaux actifs sur une même ressource exclusive ne peuvent pas se chevaucher,
  -- même si deux commandes arrivent en même temps.
  exclude using gist (resource_id with =, tstzrange(starts_at, ends_at) with &&)
    where (exclusive and status in ('pending', 'confirmed') and resource_id is not null)
);
create index events_starts_idx on events (starts_at);
create index events_staff_idx on events (staff_id, starts_at);
create index events_order_idx on events (order_id);

-- Trace des messages envoyés (évite les doublons de rappels, permet d'éditer les messages Telegram).
create table notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  staff_id uuid references staff(id) on delete cascade,
  chat_id bigint,
  message_id bigint,
  channel text not null default 'telegram',
  kind text not null,                -- new | checkin | reminder_eve | reminder_1h | digest
  sent_at timestamptz not null default now(),
  unique (event_id, staff_id, kind)
);

create table settings (
  key text primary key,
  value text
);
insert into settings (key, value) values
  ('timezone', 'Africa/Casablanca'),
  ('telegram_bot_username', ''),
  ('apps_script_url', ''),
  ('telegram_group_id', ''),            -- id du groupe (négatif) ; /id dans le groupe le renvoie
  ('topic_transfer', ''), ('topic_spa', ''), ('topic_dinner', ''), ('topic_concierge', ''), ('topic_checkin', ''),
  ('reminder_eve_hour', '20'),
  ('reminder_before_min', '60'),
  ('master_ical_token', encode(gen_random_bytes(16), 'hex'));

-- ---------------------------------------------------------------------------
-- Disponibilités : créneaux libres d'un type de ressource pour une date et une durée.
-- Ne renvoie rien de personnel : utilisable par la clé anonyme.
-- ---------------------------------------------------------------------------
create or replace function free_slots(p_kind resource_kind, p_date date, p_duration_min int default 60)
returns table (resource_id uuid, starts_at timestamptz, ends_at timestamptz, label text)
language sql stable security definer set search_path = public as $$
  with tz as (select coalesce((select value from settings where key = 'timezone'), 'Africa/Casablanca') as name),
  res as (
    select r.id, r.buffer_min from resources r where r.kind = p_kind and r.active
  ),
  slots as (
    select res.id as resource_id, res.buffer_min,
           ((p_date::text || ' ' || h.open_time::text)::timestamp at time zone tz.name)
             + (n * h.slot_minutes || ' minutes')::interval as s,
           (p_date::text || ' ' || h.close_time::text)::timestamp at time zone tz.name as closing
    from res
    join resource_hours h on h.resource_id = res.id
    cross join tz
    cross join generate_series(0, 48) as n
    where h.weekday = extract(dow from p_date)
  )
  select s.resource_id, s.s, s.s + (p_duration_min || ' minutes')::interval,
         to_char(s.s at time zone tz.name, 'HH24:MI')
  from slots s cross join tz
  where s.s + (p_duration_min || ' minutes')::interval <= s.closing
    and s.s > now()
    and not exists (
      select 1 from events e
      where e.resource_id = s.resource_id
        and e.status in ('pending', 'confirmed')
        and e.exclusive
        and tstzrange(e.starts_at, e.ends_at + (s.buffer_min || ' minutes')::interval)
            && tstzrange(s.s, s.s + (p_duration_min || ' minutes')::interval)
    )
  order by s.s, s.resource_id;
$$;

-- Couverts déjà pris sur la table du riad autour d'une heure (capacité partagée, non exclusive).
create or replace function dining_load(p_resource uuid, p_start timestamptz, p_end timestamptz)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(party_size), 0)::int from events
  where resource_id = p_resource and status in ('pending', 'confirmed')
    and tstzrange(starts_at, ends_at) && tstzrange(p_start, p_end);
$$;

-- ---------------------------------------------------------------------------
-- Sécurité : tout est verrouillé ; l'équipe (compte Auth dont l'e-mail est dans staff) lit et
-- écrit ; le public ne passe que par les fonctions Edge (clé service) et free_slots.
-- ---------------------------------------------------------------------------
create or replace function is_staff() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff s where s.active and s.email is not null
                 and lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

do $$ declare t text; begin
  foreach t in array array['staff','resources','resource_hours','guests','stays','orders','order_items','events','notifications','settings'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy staff_all on %I for all to authenticated using (is_staff()) with check (is_staff())', t);
  end loop;
end $$;

revoke all on all tables in schema public from anon;
grant execute on function free_slots(resource_kind, date, int) to anon, authenticated;
grant execute on function dining_load(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function is_staff() to authenticated;

-- Temps réel pour l'appli équipe (agenda et demandes se mettent à jour sans recharger).
alter publication supabase_realtime add table events, orders;
