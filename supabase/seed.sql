-- Données de départ : à adapter (noms, téléphones, e-mails, horaires). Relançable.
insert into staff (name, role, phone, email)
select v.name, v.role::staff_role, v.phone, v.email from (values
  ('Mouna', 'reception', '+212631208928', null),
  ('Nicolas', 'reception', '+2218408206', null),
  ('Usama', 'reception', '+221777181793', null),
  ('Zheo', 'reception', null, 'hamzaemq@gmail.com'),
  ('Cuisine', 'kitchen', null, null),
  ('Masseuse', 'spa', null, null),
  ('Ménage', 'housekeeping', null, null)
) as v(name, role, phone, email)
where not exists (select 1 from staff s where s.name = v.name);

insert into resources (kind, name, exclusive, capacity, buffer_min, default_staff_id)
select 'spa', 'Spa (hammam et cabine)', true, 2, 30, (select id from staff where role = 'spa' limit 1)
where not exists (select 1 from resources where kind = 'spa');
insert into resources (kind, name, exclusive, capacity, buffer_min, default_staff_id)
select 'vehicle', 'Véhicule Premium', false, 6, 0, null
where not exists (select 1 from resources where kind = 'vehicle');
insert into resources (kind, name, exclusive, capacity, buffer_min, default_staff_id)
select 'dining', 'Table du riad', false, 16, 0, (select id from staff where role = 'kitchen' limit 1)
where not exists (select 1 from resources where kind = 'dining');
insert into resources (kind, name, exclusive, capacity, buffer_min, default_staff_id)
select 'guide', 'Guide privé', true, 1, 0, (select id from staff where role = 'guide' limit 1)
where not exists (select 1 from resources where kind = 'guide');

-- Horaires : spa 10h-20h, table 19h-22h, guide 9h-18h, véhicule 24h/24, tous les jours.
delete from resource_hours;
insert into resource_hours (resource_id, weekday, open_time, close_time, slot_minutes)
select r.id, d, case r.kind when 'spa' then '10:00' when 'dining' then '19:00' when 'guide' then '09:00' else '00:00' end::time,
       case r.kind when 'spa' then '20:00' when 'dining' then '22:00' when 'guide' then '18:00' else '23:59' end::time,
       case r.kind when 'dining' then 30 when 'guide' then 60 else 30 end
from resources r cross join generate_series(0, 6) d;
