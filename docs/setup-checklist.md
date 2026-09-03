# Setup checklist

## Decisions required before remote deployment

- [x] Dedicated Supabase project: `ttqizcdlsfuozqhrlyvv` (`10X UPS Shipping`).
- [x] GitHub repository: `bizlabsupport/10x-ups-highlevel-shipping`.
- [x] HighLevel location ID: `DyuQ7ZvXYn3iMWu5G4Nr`.
- [x] Ship-from address: `346 9th St SE, Hickory, NC 28602, US`.
- [ ] Provide HighLevel Product ID plus Price/Variant ID for all six products.
- [ ] Measure Custom Stickers 250 package weight and dimensions.
- [ ] Measure Custom Stickers 500 package weight and dimensions.
- [ ] Choose fallback. Recommendation: disabled during pilot so errors are visible; enable only after an auditable fallback amount is approved.
- [x] Working pricing rule: 15% buffer, round up to next dollar.

## Product seed template

Do not run until every placeholder is replaced.

```sql
insert into public.shipping_connections (location_id, ups_account_number_masked, ups_connected)
values ('DyuQ7ZvXYn3iMWu5G4Nr', '****REPLACE', false);

insert into public.shipping_settings (
  location_id, buffer_value, rounding, fallback_enabled,
  ship_from_name, ship_from_address1, ship_from_city, ship_from_state, ship_from_postal_code
) values (
  'DyuQ7ZvXYn3iMWu5G4Nr', 15.00, 'next_dollar', false,
  '10X Innovations', '346 9th St SE', 'Hickory', 'NC', '28602'
);

-- Repeat after replacing IDs. Sticker rows must wait for measured dimensions.
insert into public.shipping_products
  (location_id, product_id, price_id, variant_id, product_name, weight_lb, length_in, width_in, height_in)
values
  ('DyuQ7ZvXYn3iMWu5G4Nr','STARTER_PRODUCT_ID','STARTER_PRICE_ID','','Starter Kit (Trap Set)',16,20,15,15),
  ('DyuQ7ZvXYn3iMWu5G4Nr','REFILL_PRODUCT_ID','REFILL_PRICE_ID','','Refill Kit',7,16,8,12),
  ('DyuQ7ZvXYn3iMWu5G4Nr','LURE_PRODUCT_ID','LURE_PRICE_ID','','Lure Packs - Qty 80',4,8,12,4),
  ('DyuQ7ZvXYn3iMWu5G4Nr','BODIES_PRODUCT_ID','BODIES_PRICE_ID','','Trap Bodies ONLY',11,20,15,15);
```

## HighLevel setup

1. Create a private Marketplace app named `10X UPS Shipping` for the location.
2. Configure OAuth only if installation management/API writes require it. The live-rate callback itself should authenticate with an independent random callback secret.
3. Create a Shipping Carrier through `POST /store/shipping-carrier`, then a carrier-backed shipping rate with `isCarrierRate: true`, `shippingCarrierId`, the selected service, and any HighLevel-native percentage/handling fee set to zero because the backend already applies the buffer.
4. Set the callback URL to the deployed `shipping-rate` Edge Function and add `x-shipping-secret` if HighLevel's carrier configuration supports custom headers. If it does not, switch to a signed query value or documented signature mechanism before launch.
5. Capture one real callback payload. Replace the provisional adapter/response contract with the exact documented or observed schema and add it as a fixture test.

## Pilot tests

- [ ] Starter Kit to Charlotte, Miami, New York, and Los Angeles.
- [ ] Refill Kit to the same destinations.
- [ ] Two Starter Kits plus one Refill Kit produces three UPS packages.
- [ ] AK, HI, and PR behavior.
- [ ] Unknown product fails closed and logs `ERROR`.
- [ ] UPS timeout retries once.
- [ ] Fallback is logged as `FALLBACK` if later enabled.
- [ ] No secret or raw UPS error body appears in the checkout response or logs.
