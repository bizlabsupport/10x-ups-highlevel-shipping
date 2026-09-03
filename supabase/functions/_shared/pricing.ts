export type Rounding = "none" | "next_dollar";

export function calculateCustomerRate(baseRate: number, bufferType: "percentage" | "fixed", bufferValue: number, rounding: Rounding) {
  if (!Number.isFinite(baseRate) || baseRate < 0) throw new Error("INVALID_BASE_RATE");
  if (!Number.isFinite(bufferValue) || bufferValue < 0) throw new Error("INVALID_BUFFER");
  const bufferAmount = bufferType === "percentage" ? baseRate * bufferValue / 100 : bufferValue;
  const unrounded = baseRate + bufferAmount;
  const customerRate = rounding === "next_dollar" ? Math.ceil(unrounded) : Math.round(unrounded * 100) / 100;
  return {
    baseRate: round2(baseRate),
    bufferAmount: round2(bufferAmount),
    unrounded: round2(unrounded),
    customerRate: round2(customerRate),
  };
}

function round2(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100; }

