type Address = { address1?: string; city?: string; state: string; postalCode: string; country: string };
type Package = { weightLb: number; lengthIn: number; widthIn: number; heightIn: number; reference: string };

export async function getUpsToken(baseUrl: string, clientId: string, clientSecret: string) {
  const auth = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(`${baseUrl}/security/v1/oauth/token`, { method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
  if (!response.ok) throw new Error(`UPS_AUTH_${response.status}`);
  const body = await response.json();
  if (!body.access_token) throw new Error("UPS_AUTH_MISSING_TOKEN");
  return body.access_token as string;
}

export async function getUpsGroundRate(args: { baseUrl: string; token: string; accountNumber: string; shipFrom: Address; shipTo: Address; packages: Package[] }) {
  const shipment = {
    Shipper: { Name: "10X Innovations", ShipperNumber: args.accountNumber, Address: toUpsAddress(args.shipFrom) },
    ShipFrom: { Name: "10X Innovations", Address: toUpsAddress(args.shipFrom) },
    ShipTo: { Name: "Customer", Address: toUpsAddress(args.shipTo) },
    PaymentDetails: { ShipmentCharge: [{ Type: "01", BillShipper: { AccountNumber: args.accountNumber } }] },
    Service: { Code: "03", Description: "UPS Ground" },
    NumOfPieces: String(args.packages.length),
    Package: args.packages.map((p) => ({ PackagingType: { Code: "02", Description: "Package" }, Dimensions: { UnitOfMeasurement: { Code: "IN" }, Length: String(p.lengthIn), Width: String(p.widthIn), Height: String(p.heightIn) }, PackageWeight: { UnitOfMeasurement: { Code: "LBS" }, Weight: String(p.weightLb) }, ReferenceNumber: { Value: p.reference.slice(0, 35) } })),
  };
  const response = await fetch(`${args.baseUrl}/api/rating/v2409/Rate`, { method: "POST", headers: { Authorization: `Bearer ${args.token}`, "Content-Type": "application/json", transId: crypto.randomUUID(), transactionSrc: "10X-UPSHL" }, body: JSON.stringify({ RateRequest: { Request: { TransactionReference: { CustomerContext: "HighLevel checkout" } }, Shipment: shipment } }) });
  if (!response.ok) throw new Error(`UPS_RATE_${response.status}`);
  const body = await response.json();
  const rated = body?.RateResponse?.RatedShipment;
  const entries = Array.isArray(rated) ? rated : [rated];
  const ground = entries.find((x: any) => x?.Service?.Code === "03") || entries[0];
  const amount = Number(ground?.TotalCharges?.MonetaryValue);
  if (!Number.isFinite(amount)) throw new Error("UPS_RATE_MISSING_AMOUNT");
  return { amount, currency: ground?.TotalCharges?.CurrencyCode || "USD" };
}

function toUpsAddress(a: Address) { return { AddressLine: a.address1 ? [a.address1] : undefined, City: a.city, StateProvinceCode: a.state, PostalCode: a.postalCode, CountryCode: a.country }; }

