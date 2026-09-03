import test from "node:test";
import assert from "node:assert/strict";
import { calculateCustomerRate } from "../supabase/functions/_shared/pricing.ts";
import { expandPackages } from "../supabase/functions/_shared/packages.ts";

test("15% buffer and next-dollar rounding matches Charlotte Starter target", () => {
  const result = calculateCustomerRate(32.16,"percentage",15,"next_dollar");
  assert.equal(result.bufferAmount, 4.82);
  assert.equal(result.customerRate, 37);
});
test("exact cents preserves unrounded customer value", () => assert.equal(calculateCustomerRate(17.48,"percentage",15,"none").customerRate,20.1));
test("two starters plus one refill becomes three packages", () => assert.equal(expandPackages([{productId:"starter",quantity:2},{productId:"refill",quantity:1}],[{productId:"starter",productName:"Starter",packagesPerUnit:1,quantity:1,weightLb:16,lengthIn:20,widthIn:15,heightIn:15},{productId:"refill",productName:"Refill",packagesPerUnit:1,quantity:1,weightLb:7,lengthIn:16,widthIn:8,heightIn:12}]).length,3));
test("unmapped products fail closed", () => assert.throws(()=>expandPackages([{productId:"unknown",quantity:1}],[]),/UNMAPPED_PRODUCT/));
