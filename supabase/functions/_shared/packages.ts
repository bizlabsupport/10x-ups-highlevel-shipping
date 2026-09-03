export type CartItem = { productId: string; priceId?: string; variantId?: string; quantity: number };
export type ProductMap = CartItem & { productName: string; weightLb: number; lengthIn: number; widthIn: number; heightIn: number; packagesPerUnit: number };

export function expandPackages(items: CartItem[], maps: ProductMap[]) {
  const packages = [] as Array<{ weightLb: number; lengthIn: number; widthIn: number; heightIn: number; reference: string }>;
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) throw new Error("INVALID_QUANTITY");
    const mapping = maps.find((m) => m.productId === item.productId && (!m.priceId || m.priceId === (item.priceId || "")) && (!m.variantId || m.variantId === (item.variantId || "")));
    if (!mapping) throw new Error(`UNMAPPED_PRODUCT:${item.productId}:${item.priceId || ""}:${item.variantId || ""}`);
    const count = item.quantity * mapping.packagesPerUnit;
    for (let i = 0; i < count; i++) packages.push({ weightLb: mapping.weightLb, lengthIn: mapping.lengthIn, widthIn: mapping.widthIn, heightIn: mapping.heightIn, reference: mapping.productName });
  }
  return packages;
}

