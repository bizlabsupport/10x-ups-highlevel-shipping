import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { calculateCustomerRate } from "../_shared/pricing.ts";
import { expandPackages, type CartItem } from "../_shared/packages.ts";
import { getUpsGroundRate, getUpsToken } from "../_shared/ups.ts";

const jsonHeaders = { "Content-Type": "application/json" };

Deno.serve(async (req) => {
  const started = Date.now();
  let log: Record<string, unknown> = { rate_source: "ERROR", successful: false };
  try {
    if (req.method !== "POST") return response(405, { error: "METHOD_NOT_ALLOWED" });
    if (!constantTimeEqual(req.headers.get("x-shipping-secret") || "", env("SHIPPING_CALLBACK_SECRET"))) return response(401, { error: "UNAUTHORIZED" });
    const raw = await req.json();
    const input = adaptHighLevelPayload(raw);
    log = { ...log, location_id: input.locationId, request_id: input.requestId, destination_country: input.destination.country, destination_state: input.destination.state, destination_postal_code: input.destination.postalCode, cart: input.items };
    const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
    const [{ data: settings, error: settingsError }, { data: productRows, error: productsError }] = await Promise.all([
      db.from("shipping_settings").select("*").eq("location_id", input.locationId).single(),
      db.from("shipping_products").select("*").eq("location_id", input.locationId).eq("active", true),
    ]);
    if (settingsError || !settings) throw new Error("SETTINGS_NOT_FOUND");
    if (productsError) throw new Error("PRODUCT_LOOKUP_FAILED");
    enforceDestination(settings, input.destination.state);
    const maps = (productRows || []).map((p: any) => ({ productId: p.product_id, priceId: p.price_id, variantId: p.variant_id, productName: p.product_name, weightLb: Number(p.weight_lb), lengthIn: Number(p.length_in), widthIn: Number(p.width_in), heightIn: Number(p.height_in), packagesPerUnit: p.packages_per_unit, quantity: 1 }));
    const packages = expandPackages(input.items, maps);
    log.packages = packages;
    const shipFrom = { address1: settings.ship_from_address1, city: settings.ship_from_city, state: settings.ship_from_state, postalCode: settings.ship_from_postal_code, country: settings.ship_from_country };
    const rate = await retryOnce(async () => {
      const token = await getUpsToken(env("UPS_BASE_URL"), env("UPS_CLIENT_ID"), env("UPS_CLIENT_SECRET"));
      return getUpsGroundRate({ baseUrl: env("UPS_BASE_URL"), token, accountNumber: env("UPS_ACCOUNT_NUMBER"), shipFrom, shipTo: input.destination, packages });
    });
    const priced = calculateCustomerRate(rate.amount, settings.buffer_type, Number(settings.buffer_value), settings.rounding);
    log = { ...log, ups_base_rate: priced.baseRate, buffer_type: settings.buffer_type, buffer_value: Number(settings.buffer_value), buffer_amount: priced.bufferAmount, customer_rate: priced.customerRate, currency: rate.currency, rate_source: "UPS_API", service_code: settings.service_code, service_name: settings.service_name, successful: true };
    await safeLog(db, log, started);
    return response(200, highLevelRateResponse(settings.service_name, rate.currency, priced.customerRate));
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 120) : "UNKNOWN_ERROR";
    try {
      const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
      const locationId = String(log.location_id || "");
      const { data: settings } = locationId ? await db.from("shipping_settings").select("*").eq("location_id", locationId).maybeSingle() : { data: null };
      if (settings?.fallback_enabled && settings.fallback_amount != null) {
        const amount = Number(settings.fallback_amount);
        log = { ...log, customer_rate: amount, currency: settings.currency, rate_source: "FALLBACK", service_code: settings.service_code, service_name: settings.service_name, successful: true, error_code: code };
        await safeLog(db, log, started);
        return response(200, highLevelRateResponse(settings.service_name, settings.currency, amount));
      }
      log.error_code = code;
      await safeLog(db, log, started);
    } catch (_) { /* never expose logging errors */ }
    return response(422, { error: "RATE_UNAVAILABLE" });
  }
});

function adaptHighLevelPayload(raw: any): { locationId: string; requestId: string; destination: { address1?: string; city?: string; state: string; postalCode: string; country: string }; items: CartItem[] } {
  const destination = raw.destination || raw.shippingAddress || raw.address || {};
  const sourceItems = raw.items || raw.cart?.items || raw.lineItems || [];
  const items = sourceItems.map((i: any) => ({ productId: String(i.productId || i.product_id || i.product?.id || ""), priceId: String(i.priceId || i.price_id || i.price?.id || ""), variantId: String(i.variantId || i.variant_id || i.variant?.id || ""), quantity: Number(i.quantity || i.qty || 0) }));
  const result = { locationId: String(raw.locationId || raw.location_id || raw.altId || ""), requestId: String(raw.requestId || raw.request_id || crypto.randomUUID()), destination: { address1: destination.address1 || destination.addressLine1, city: destination.city, state: String(destination.state || destination.stateCode || "").toUpperCase(), postalCode: String(destination.postalCode || destination.zip || ""), country: String(destination.country || destination.countryCode || "US").toUpperCase() }, items };
  if (!result.locationId || !result.destination.state || !result.destination.postalCode || !items.length || items.some((i: CartItem) => !i.productId)) throw new Error("INVALID_CALLBACK_PAYLOAD");
  return result;
}

function highLevelRateResponse(name: string, currency: string, dollars: number) { return { rates: [{ id: "ups-ground", name, description: "Calculated live from UPS", currency, amount: Math.round(dollars * 100), service: "UPS_GROUND" }] }; }
function response(status: number, body: unknown) { return new Response(JSON.stringify(body), { status, headers: jsonHeaders }); }
function env(name: string) { const value = Deno.env.get(name); if (!value) throw new Error(`MISSING_ENV_${name}`); return value; }
async function retryOnce<T>(fn: () => Promise<T>) { try { return await fn(); } catch (_) { return await fn(); } }
async function safeLog(db: any, log: Record<string, unknown>, started: number) { await db.from("shipping_rate_logs").insert({ ...log, duration_ms: Date.now() - started }); }
function enforceDestination(settings: any, state: string) { if (state === "AK" && !settings.alaska_enabled) throw new Error("DESTINATION_DISABLED"); if (state === "HI" && !settings.hawaii_enabled) throw new Error("DESTINATION_DISABLED"); if (state === "PR" && !settings.puerto_rico_enabled) throw new Error("DESTINATION_DISABLED"); }
function constantTimeEqual(a: string, b: string) { const length = Math.max(a.length, b.length); let diff = a.length ^ b.length; for (let i = 0; i < length; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return diff === 0; }

