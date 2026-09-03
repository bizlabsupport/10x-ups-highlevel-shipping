create extension if not exists pgcrypto;

create table public.shipping_connections (
  id uuid primary key default gen_random_uuid(),
  location_id text not null unique,
  ups_account_number_masked text,
  ups_connected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shipping_settings (
  id uuid primary key default gen_random_uuid(),
  location_id text not null unique references public.shipping_connections(location_id) on delete cascade,
  service_code text not null default '03',
  service_name text not null default 'UPS Ground',
  currency text not null default 'USD',
  buffer_type text not null default 'percentage' check (buffer_type in ('percentage', 'fixed')),
  buffer_value numeric(10,2) not null default 15.00 check (buffer_value >= 0),
  rounding text not null default 'next_dollar' check (rounding in ('none', 'next_dollar')),
  fallback_enabled boolean not null default false,
  fallback_amount numeric(10,2) check (fallback_amount is null or fallback_amount >= 0),
  ship_from_name text,
  ship_from_address1 text,
  ship_from_address2 text,
  ship_from_city text,
  ship_from_state text,
  ship_from_postal_code text,
  ship_from_country text not null default 'US',
  alaska_enabled boolean not null default true,
  hawaii_enabled boolean not null default true,
  puerto_rico_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not fallback_enabled or fallback_amount is not null)
);

create table public.shipping_products (
  id uuid primary key default gen_random_uuid(),
  location_id text not null references public.shipping_connections(location_id) on delete cascade,
  product_id text not null,
  price_id text not null default '',
  variant_id text not null default '',
  product_name text not null,
  weight_lb numeric(10,2) not null check (weight_lb > 0),
  length_in numeric(10,2) not null check (length_in > 0),
  width_in numeric(10,2) not null check (width_in > 0),
  height_in numeric(10,2) not null check (height_in > 0),
  packages_per_unit integer not null default 1 check (packages_per_unit > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_id, product_id, price_id, variant_id)
);

create table public.shipping_rate_logs (
  id uuid primary key default gen_random_uuid(),
  location_id text,
  request_id text,
  destination_country text,
  destination_state text,
  destination_postal_code text,
  cart jsonb not null default '[]'::jsonb,
  packages jsonb not null default '[]'::jsonb,
  ups_base_rate numeric(10,2),
  buffer_type text,
  buffer_value numeric(10,2),
  buffer_amount numeric(10,2),
  customer_rate numeric(10,2),
  currency text not null default 'USD',
  rate_source text not null check (rate_source in ('UPS_API', 'FALLBACK', 'ERROR')),
  service_code text,
  service_name text,
  successful boolean not null default false,
  error_code text,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index shipping_products_lookup_idx on public.shipping_products(location_id, product_id, price_id, variant_id) where active;
create index shipping_rate_logs_location_created_idx on public.shipping_rate_logs(location_id, created_at desc);

alter table public.shipping_connections enable row level security;
alter table public.shipping_settings enable row level security;
alter table public.shipping_products enable row level security;
alter table public.shipping_rate_logs enable row level security;

revoke all on public.shipping_connections from anon, authenticated;
revoke all on public.shipping_settings from anon, authenticated;
revoke all on public.shipping_products from anon, authenticated;
revoke all on public.shipping_rate_logs from anon, authenticated;

comment on table public.shipping_connections is 'Non-secret carrier connection metadata. OAuth and UPS secrets remain in Edge Function secrets.';
comment on table public.shipping_rate_logs is 'Auditable live-rate calculations; raw authorization headers and credentials must never be stored.';

