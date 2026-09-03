insert into public.shipping_connections (location_id, ups_connected)
values ('DyuQ7ZvXYn3iMWu5G4Nr', false)
on conflict (location_id) do nothing;

insert into public.shipping_settings (
  location_id,
  service_code,
  service_name,
  currency,
  buffer_type,
  buffer_value,
  rounding,
  fallback_enabled,
  ship_from_name,
  ship_from_address1,
  ship_from_city,
  ship_from_state,
  ship_from_postal_code,
  ship_from_country
) values (
  'DyuQ7ZvXYn3iMWu5G4Nr',
  '03',
  'UPS Ground',
  'USD',
  'percentage',
  15.00,
  'next_dollar',
  false,
  '10X Innovations',
  '346 9th St SE',
  'Hickory',
  'NC',
  '28602',
  'US'
)
on conflict (location_id) do update set
  ship_from_name = excluded.ship_from_name,
  ship_from_address1 = excluded.ship_from_address1,
  ship_from_city = excluded.ship_from_city,
  ship_from_state = excluded.ship_from_state,
  ship_from_postal_code = excluded.ship_from_postal_code,
  ship_from_country = excluded.ship_from_country,
  updated_at = now();

