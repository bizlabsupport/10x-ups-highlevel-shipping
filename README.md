# 10X UPS Shipping for HighLevel

Phase 1 backend for a private HighLevel shipping-carrier integration. It maps HighLevel cart items to physical UPS packages, requests the UPS Ground account rate, applies a configurable buffer and rounding rule, and logs every quote.

## Current status

- Database schema and RLS are defined.
- A Supabase Edge Function implements callback authentication, product mapping, UPS OAuth, rating, buffer/rounding, retry, fallback, and logging.
- Pure pricing and package-expansion tests are included.
- The HighLevel payload adapter accepts common `locationId`, destination, and cart-item shapes; a real callback sample must be captured before production deployment and used to lock the adapter contract.
- No credentials are committed.

## Phase 1 assumptions

- UPS Ground service code: `03`.
- One sellable unit is one package by default.
- Buffer: 15%.
- Rounding: next whole dollar.
- Currency: USD.
- Confirmed 10X HighLevel location ID: `DyuQ7ZvXYn3iMWu5G4Nr`.
- Confirmed ship-from address: `346 9th St SE, Hickory, NC 28602, US`.
- Sticker package dimensions and all HighLevel product/price IDs remain unresolved.

## Structure

```text
supabase/migrations/              Database schema and seed template
supabase/functions/_shared/       Pure pricing, package, and UPS helpers
supabase/functions/shipping-rate/ HighLevel callback Edge Function
tests/                            Node tests for pure business logic
docs/                             Payload contracts and setup checklist
```

## Local verification

```bash
node --test tests/*.test.mjs
```

For Supabase local development, install the current Supabase CLI, run `supabase --help`, then link a dedicated project and serve the function with an uncommitted environment file. Production secrets belong in Supabase Edge Function secrets, never in Git or database rows.

## Deployment order

1. Use the dedicated Supabase project `ttqizcdlsfuozqhrlyvv` (`10X UPS Shipping`).
2. Apply `supabase/migrations/202609030001_initial_shipping_schema.sql`.
3. Add UPS and callback secrets from `.env.example` to Supabase secrets.
4. Seed the verified HighLevel location ID, ship-from address, and product/price IDs using `docs/setup-checklist.md`.
5. Deploy `shipping-rate` with gateway JWT verification disabled only because the function enforces `x-shipping-secret` itself. HighLevel cannot supply a Supabase user JWT.
6. Capture a HighLevel callback request and update the adapter if necessary.
7. Register the carrier/rate in HighLevel and test against known UPS quotes.

## Security

All tables use RLS and grant no browser-role policies. The Edge Function uses the service-role key server-side. UPS credentials and the callback secret are environment secrets. Customer responses never contain UPS credentials or raw upstream error bodies.
