alter table public.properties
  add column if not exists unit_number text,
  add column if not exists floor_number text;

comment on column public.properties.unit_number is
  'Apartment, house, or unit number within the property address.';
comment on column public.properties.floor_number is
  'Floor number or level within the building.';
