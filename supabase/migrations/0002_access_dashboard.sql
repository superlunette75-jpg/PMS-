-- Kasbah La Moun PMS : niveaux d'accès, données Little Hotel (tableau de bord), notifications push.
-- Idempotent : peut être rejoué sans risque.

-- ---------------------------------------------------------------------------
-- 1. Niveaux d'accès
--    manager   : gérant, voit tout (tableau de bord, chiffres, équipe, réglages)
--    reception : réception, toute l'activité du jour (agenda, demandes, clients), sans les chiffres
--    own       : métier (chauffeur, spa, cuisine, guide, ménage), seulement son propre planning
-- ---------------------------------------------------------------------------
alter table staff add column if not exists access text not null default 'own';
alter table staff drop constraint if exists staff_access_chk;
alter table staff add constraint staff_access_chk check (access in ('manager', 'reception', 'own'));
update staff set access = 'reception' where role = 'reception' and access = 'own';

create or replace function my_staff_id() returns uuid language sql stable security definer set search_path = public as $$
  select s.id from staff s where s.active and s.email is not null
    and lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', '')) limit 1;
$$;
create or replace function staff_access() returns text language sql stable security definer set search_path = public as $$
  select s.access from staff s where s.active and s.email is not null
    and lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', '')) limit 1;
$$;
create or replace function is_office() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(staff_access() in ('manager', 'reception'), false);
$$;
create or replace function is_manager() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(staff_access() = 'manager', false);
$$;
grant execute on function my_staff_id(), staff_access(), is_office(), is_manager() to authenticated;

-- Règles : on remplace la règle unique « toute l'équipe voit tout » par des règles par niveau.
do $$ declare t text; p record; begin
  foreach t in array array['staff','resources','resource_hours','guests','stays','orders','order_items','events','notifications','settings'] loop
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on %I', p.policyname, t);
    end loop;
  end loop;
end $$;

create policy staff_read on staff for select to authenticated using (is_office() or id = my_staff_id());
create policy staff_write on staff for all to authenticated using (is_manager()) with check (is_manager());

create policy resources_read on resources for select to authenticated using (is_staff());
create policy resources_write on resources for all to authenticated using (is_manager()) with check (is_manager());
create policy hours_read on resource_hours for select to authenticated using (is_staff());
create policy hours_write on resource_hours for all to authenticated using (is_office()) with check (is_office());

create policy settings_read on settings for select to authenticated using (is_office());
create policy settings_write on settings for all to authenticated using (is_manager()) with check (is_manager());

do $$ declare t text; begin
  foreach t in array array['guests','stays','orders','order_items','notifications'] loop
    execute format('create policy office_all on %I for all to authenticated using (is_office()) with check (is_office())', t);
  end loop;
end $$;

create policy events_office on events for all to authenticated using (is_office()) with check (is_office());
create policy events_own_read on events for select to authenticated using (staff_id = my_staff_id());

-- ---------------------------------------------------------------------------
-- 2. Planning d'un membre « métier » : ses créneaux, avec ce qu'il faut savoir du client.
--    Ses propres créneaux, plus ceux de son métier qui ne sont encore attribués à personne.
-- ---------------------------------------------------------------------------
create or replace function my_jobs(p_from timestamptz, p_to timestamptz)
returns jsonb language sql stable security definer set search_path = public as $$
  with me as (select id, role from staff where id = my_staff_id())
  select coalesce(jsonb_agg(j order by (j->>'starts_at')), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', e.id, 'order_id', e.order_id, 'kind', e.kind, 'title', e.title, 'starts_at', e.starts_at, 'ends_at', e.ends_at,
      'status', e.status, 'party_size', e.party_size, 'staff_id', e.staff_id, 'resource', r.name,
      'order', case when o.id is null then null else jsonb_build_object(
        'id', o.id, 'short_id', o.short_id, 'kind', o.kind, 'status', o.status, 'details', o.details, 'notes', o.notes,
        'lang', o.lang, 'total_mad', o.total_mad,
        'items', (select coalesce(jsonb_agg(jsonb_build_object('label_fr', i.label_fr, 'qty', i.qty, 'duration_min', i.duration_min)), '[]'::jsonb) from order_items i where i.order_id = o.id),
        'guest', jsonb_build_object('first_name', g.first_name, 'last_name', g.last_name, 'phone_e164', g.phone_e164),
        'suite', coalesce(st.suite, o.details->>'suite')
      ) end) as j
    from events e
    cross join me
    left join orders o on o.id = e.order_id
    left join guests g on g.id = o.guest_id
    left join stays st on st.id = o.stay_id
    left join resources r on r.id = e.resource_id
    where e.starts_at >= p_from and e.starts_at < p_to
      and e.status in ('pending', 'confirmed', 'done')
      and (e.staff_id = me.id
        or (e.staff_id is null and o.kind is not null and me.role::text =
            case o.kind when 'transfer' then 'driver' when 'spa' then 'spa' when 'dinner' then 'kitchen' when 'concierge' then 'guide' end))
  ) x;
$$;
grant execute on function my_jobs(timestamptz, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Données Little Hotel (exports CSV importés depuis l'appli : Tableau de bord > Importer)
-- ---------------------------------------------------------------------------
create table if not exists lh_reservations (
  ref text primary key,
  booked_on date,
  channel text,
  first_name text,
  last_name text,
  email text,
  phone text,
  country text,
  city text,
  arrival date,
  departure date,
  nights int,
  eta text,
  comments text,
  notes text,
  status text,                 -- Réservation confirmée | Arrivée effectuée | Départ effectué | Paiement annulé
  cancelled_on date,
  room_types text,
  rooms text,                  -- « Deluxe, Suite prestige 4 » tel que dans Little Hotel
  rooms_count int not null default 1,
  adults int,
  children int,
  subtotal numeric,            -- sous-total TTC (hébergement + suppléments)
  extras numeric,              -- suppléments
  tourist_tax numeric,         -- taxes fixes (taxe de séjour)
  total numeric,
  paid numeric,
  due numeric,
  invoice text,
  updated_at timestamptz not null default now()
);
create index if not exists lh_res_arrival_idx on lh_reservations (arrival);
create index if not exists lh_res_departure_idx on lh_reservations (departure);

create table if not exists lh_payments (
  id text primary key,         -- empreinte stable de la ligne (réimport sans doublon)
  paid_on date,
  paid_time text,
  ref text,
  guest text,
  txn_type text,               -- Payment | Remboursement
  method text,                 -- Card | Cash | Other | OTA Paid
  card text,                   -- Visa | Mastercard | American Express
  description text,
  amount numeric,
  updated_at timestamptz not null default now()
);
create index if not exists lh_pay_date_idx on lh_payments (paid_on);

create table if not exists lh_imports (
  id uuid primary key default gen_random_uuid(),
  kind text not null,          -- reservations | payments | guests
  file_name text,
  rows int,
  imported_by text,
  imported_at timestamptz not null default now()
);

alter table lh_reservations enable row level security;
alter table lh_payments enable row level security;
alter table lh_imports enable row level security;
drop policy if exists lh_res_read on lh_reservations; drop policy if exists lh_res_write on lh_reservations;
drop policy if exists lh_pay_all on lh_payments; drop policy if exists lh_imp_all on lh_imports; drop policy if exists lh_imp_read on lh_imports;
create policy lh_res_read on lh_reservations for select to authenticated using (is_office());
create policy lh_res_write on lh_reservations for all to authenticated using (is_manager()) with check (is_manager());
create policy lh_pay_all on lh_payments for all to authenticated using (is_manager()) with check (is_manager());
create policy lh_imp_read on lh_imports for select to authenticated using (is_office());
create policy lh_imp_all on lh_imports for all to authenticated using (is_manager()) with check (is_manager());

insert into settings (key, value) values ('rooms_total', '8') on conflict (key) do nothing;

-- Tableau du ménage (et de la réception) : arrivées, départs et suites occupées d'un jour,
-- sans téléphone ni montant.
create or replace function house_board(p_date date)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when not (is_office() or exists (select 1 from staff where id = my_staff_id() and role = 'housekeeping')) then '[]'::jsonb else coalesce(jsonb_agg(x order by x->>'rooms'), '[]'::jsonb) end from (
    select jsonb_build_object(
      'ref', r.ref, 'name', trim(coalesce(r.last_name, '') || ' ' || coalesce(left(r.first_name, 1) || '.', '')),
      'rooms', r.rooms, 'rooms_count', r.rooms_count, 'pax', coalesce(r.adults, 0) + coalesce(r.children, 0),
      'arrival', r.arrival, 'departure', r.departure, 'eta', r.eta,
      'move', case when r.arrival = p_date then 'in' when r.departure = p_date then 'out' else 'stay' end) as x
    from lh_reservations r
    where r.status <> 'Paiement annulé' and r.arrival <= p_date and r.departure >= p_date
  ) t;
$$;
grant execute on function house_board(date) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Notifications push (téléphone ou ordinateur de chaque membre)
-- ---------------------------------------------------------------------------
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  ua text,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz
);
alter table push_subscriptions enable row level security;
drop policy if exists push_read on push_subscriptions;
create policy push_read on push_subscriptions for select to authenticated using (staff_id = my_staff_id() or is_manager());

create or replace function save_push(p_endpoint text, p_p256dh text, p_auth text, p_ua text)
returns boolean language plpgsql security definer set search_path = public as $$
declare me uuid := my_staff_id();
begin
  if me is null then return false; end if;
  insert into push_subscriptions (staff_id, endpoint, p256dh, auth, ua) values (me, p_endpoint, p_p256dh, p_auth, left(p_ua, 200))
  on conflict (endpoint) do update set staff_id = me, p256dh = excluded.p256dh, auth = excluded.auth, ua = excluded.ua;
  return true;
end $$;
create or replace function drop_push(p_endpoint text) returns boolean language sql security definer set search_path = public as $$
  delete from push_subscriptions where endpoint = p_endpoint and staff_id = my_staff_id() returning true;
$$;
grant execute on function save_push(text, text, text, text), drop_push(text) to authenticated;
