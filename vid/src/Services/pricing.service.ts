import { sqlOne } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import type { DbRow } from "../types/index.js";

type PricingInput = {
  gigId: number;
  selectedPackage: string;
  expressDelivery?: boolean;
  promoCode?: string | null;
};

export type VerifiedPricing = {
  packageName: string;
  basePrice: number;
  subtotal: number;
  discountAmount: number;
  discountCode: string | null;
  taxAmount: number;
  clientFeeAmount: number;
  platformFeeAmount: number;
  totalPrice: number;
  freelancerPayout: number;
  taxPercent: number;
  clientFeePercent: number;
  platformFeePercent: number;
};

function roundMoney(value: number): number {
  return Math.max(0, Math.round(value * 100) / 100);
}

function parsePricing(pricing: unknown): Array<{ name: string; price: unknown }> {
  if (typeof pricing === "string") return JSON.parse(pricing) as Array<{ name: string; price: unknown }>;
  return Array.isArray(pricing) ? pricing as Array<{ name: string; price: unknown }> : [];
}

export async function calculateVerifiedOrderPricing(input: PricingInput): Promise<VerifiedPricing> {
  const gig = await sqlOne(`SELECT "id", "pricing" FROM "Gig" WHERE "id" = $1 AND "deletedAt" IS NULL`, [input.gigId]);
  if (!gig) throw new ApiError(404, "Gig not found");
  const packages = parsePricing((gig as DbRow).pricing);
  const selected = packages.find((pkg) => String(pkg.name) === String(input.selectedPackage));
  if (!selected) throw new ApiError(400, "Invalid package selected");

  const basePrice = Number(selected.price);
  if (!Number.isFinite(basePrice) || basePrice < 0) throw new ApiError(500, "Invalid package price format");

  const subtotal = roundMoney(input.expressDelivery ? basePrice * 1.5 : basePrice);
  let discountAmount = 0;
  let discountCode: string | null = null;

  const code = String(input.promoCode || "").trim().toUpperCase();
  if (code) {
    const promotion = await sqlOne(
      `SELECT * FROM "Promotion" WHERE UPPER("code") = $1 AND "type" = 'PROMO_CODE' LIMIT 1`,
      [code]
    ) as DbRow | null;
    if (!promotion) throw new ApiError(404, "Invalid promo code");
    if (promotion.status !== "ACTIVE" || (promotion.expiresAt && new Date(String(promotion.expiresAt)).getTime() < Date.now())) {
      throw new ApiError(400, "Promo code is expired or disabled");
    }
    if (promotion.maxUses && Number(promotion.uses || 0) >= Number(promotion.maxUses)) {
      throw new ApiError(400, "Promo code has reached its usage limit");
    }
    discountAmount =
      promotion.discountType === "PERCENTAGE"
        ? roundMoney(subtotal * (Number(promotion.discountAmount) / 100))
        : Math.min(roundMoney(Number(promotion.discountAmount)), subtotal);
    discountCode = String(promotion.code || code).toUpperCase();
  }

  const taxable = Math.max(0, subtotal - discountAmount);
  const taxPercent = Number(process.env.CHECKOUT_TAX_PERCENT || 0);
  const clientFeePercent = Number(process.env.CLIENT_SERVICE_FEE_PERCENT || 3.5);
  const platformFeePercent = Number(process.env.PLATFORM_FEE_PERCENT || 12.5);
  const taxAmount = roundMoney(taxable * (taxPercent / 100));
  const clientFeeAmount = roundMoney(taxable * (clientFeePercent / 100));
  const platformFeeAmount = roundMoney(taxable * (platformFeePercent / 100));

  return {
    packageName: input.selectedPackage,
    basePrice: roundMoney(basePrice),
    subtotal,
    discountAmount,
    discountCode,
    taxAmount,
    clientFeeAmount,
    platformFeeAmount,
    totalPrice: roundMoney(taxable + taxAmount + clientFeeAmount),
    freelancerPayout: roundMoney(taxable - platformFeeAmount),
    taxPercent,
    clientFeePercent,
    platformFeePercent,
  };
}

export async function calculateVerifiedPricingForOrder(order: DbRow, promoCode?: string | null): Promise<VerifiedPricing> {
  return calculateVerifiedOrderPricing({
    gigId: Number(order.gigId ?? order.gig_id),
    selectedPackage: String(order.package || ""),
    expressDelivery: Boolean(order.expressDelivery),
    promoCode,
  });
}
