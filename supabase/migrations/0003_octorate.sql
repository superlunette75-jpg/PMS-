-- Kasbah La Moun PMS : réservations Octorate (e-mails de réservation + liens iCal). Idempotent.
-- Les réservations Octorate rejoignent la table lh_reservations (même forme que Little Hotel),
-- avec une colonne source : le briefing, le planning ménage et le tableau de bord les utilisent sans changement.

alter table lh_reservations add column if not exists source text not null default 'littlehotel';  -- littlehotel | octorate-mail | ical
alter table lh_reservations add column if not exists source_ref text;                              -- UID iCal ou id de l'e-mail
create index if not exists lh_res_source_idx on lh_reservations (source);

-- Chaque e-mail Octorate reçu est gardé tel quel : on peut le relire et le réanalyser si le format change.
create table if not exists inbound_emails (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  message_id text unique,
  from_addr text,
  subject text,
  sent_at timestamptz,
  body text,
  status text not null default 'new',    -- parsed | cancelled | needs_review | ignored | error
  ref text,                                -- référence de la réservation reconnue
  parsed jsonb,
  error text
);
create index if not exists inbound_emails_received_idx on inbound_emails (received_at desc);
alter table inbound_emails enable row level security;
drop policy if exists mail_read on inbound_emails; drop policy if exists mail_write on inbound_emails;
create policy mail_read on inbound_emails for select to authenticated using (is_office());
create policy mail_write on inbound_emails for all to authenticated using (is_manager()) with check (is_manager());
revoke all on inbound_emails from anon;

-- Réglages : liens iCal par suite (JSON {"1": "https://…", …}) et secret du script Gmail.
insert into settings (key, value) values
  ('ical_feeds', '{}'),
  ('ical_last_sync', ''),
  ('octorate_mail_secret', encode(gen_random_bytes(18), 'hex'))
on conflict (key) do nothing;

-- Les secrets des réglages ne sont lisibles que par les gérants.
drop policy if exists settings_read on settings;
create policy settings_read on settings for select to authenticated
  using (is_manager() or (is_office() and key not like '%secret%'));

-- Devise des montants Octorate (MAD par défaut ; EUR ou autre si l'e-mail l'indique, non mélangé au CA en dirhams).
alter table lh_reservations add column if not exists currency text;
