/**
 * Revenue split calculator for Sesigo Hive Vendor Portal.
 *
 * - Inputs/outputs use integer cents to avoid floating-point rounding errors.
 * - Defaults:
 *    - Platform commission: 10% (0.10)
 *    - Hive member discount (for registered players): 15% (0.15)
 *
 * Usage:
 *  const result = calculateRevenueSplit(1999, { isRegisteredPlayer: true });
 *  // totalPriceCents: 1999 ($19.99)
 *  // customerPaysCents: discounted amount after 15% -> round(1999 * 0.85)
 *  // commissionCents: round(customerPaysCents * 0.10)
 *  // vendorPayoutCents: customerPaysCents - commissionCents
 */

export type RevenueSplit = {
  // Inputs
  totalPriceCents: number;

  // Discount info
  isRegisteredPlayer: boolean;
  discountPercentage: number; // e.g. 0.15 for 15%
  discountAmountCents: number;

  // Amount customer pays after discount
  customerPaysCents: number;

  // Commission info
  commissionPercentage: number; // e.g. 0.10 for 10%
  commissionAmountCents: number;

  // Final vendor payout
  vendorPayoutCents: number;
};

/**
 * Calculate the revenue split for a kit order.
 *
 * @param totalPriceCents - total price of the kit in integer cents (e.g., $19.99 => 1999)
 * @param opts - options:
 *   - isRegisteredPlayer: whether the buyer is a registered player and qualifies for the Hive Member Discount
 *   - discountPercentage: optional custom discount (default 0.15)
 *   - commissionPercentage: optional custom commission (default 0.10)
 *
 * @returns RevenueSplit with all amounts in cents.
 */
export function calculateRevenueSplit(
  totalPriceCents: number,
  opts?: {
    isRegisteredPlayer?: boolean;
    discountPercentage?: number;
    commissionPercentage?: number;
  }
): RevenueSplit {
  if (!Number.isFinite(totalPriceCents) || totalPriceCents < 0) {
    throw new Error("totalPriceCents must be a finite non-negative number (in cents).");
  }

  // Defaults
  const isRegisteredPlayer = !!opts?.isRegisteredPlayer;
  const discountPercentage =
    opts?.discountPercentage !== undefined ? opts.discountPercentage : 0.15; // 15%
  const commissionPercentage =
    opts?.commissionPercentage !== undefined ? opts.commissionPercentage : 0.1; // 10%

  if (discountPercentage < 0 || discountPercentage >= 1) {
    throw new Error("discountPercentage must be between 0 (inclusive) and 1 (exclusive).");
  }
  if (commissionPercentage < 0 || commissionPercentage >= 1) {
    throw new Error("commissionPercentage must be between 0 (inclusive) and 1 (exclusive).");
  }

  // Calculate discount amount (integer cents), rounding to nearest cent
  const discountAmountCents = isRegisteredPlayer
    ? Math.round(totalPriceCents * discountPercentage)
    : 0;

  // Amount the customer actually pays after discount
  const customerPaysCents = Math.max(0, totalPriceCents - discountAmountCents);

  // Commission is taken on the actual sale amount (customerPays)
  const commissionAmountCents = Math.round(customerPaysCents * commissionPercentage);

  // Vendor receives the remainder
  const vendorPayoutCents = customerPaysCents - commissionAmountCents;

  return {
    totalPriceCents,
    isRegisteredPlayer,
    discountPercentage,
    discountAmountCents,
    customerPaysCents,
    commissionPercentage,
    commissionAmountCents,
    vendorPayoutCents,
  };
}

/**
 * Convenience helper: accepts total price in dollars (e.g. 19.99) and returns cents-based result.
 */
export function calculateRevenueSplitFromDollars(
  totalPriceDollars: number,
  opts?: {
    isRegisteredPlayer?: boolean;
    discountPercentage?: number;
    commissionPercentage?: number;
  }
) {
  if (!Number.isFinite(totalPriceDollars) || totalPriceDollars < 0) {
    throw new Error("totalPriceDollars must be a finite non-negative number.");
  }
  const totalPriceCents = Math.round(totalPriceDollars * 100);
  return calculateRevenueSplit(totalPriceCents, opts);
}

/* Example usage:

import { calculateRevenueSplitFromDollars } from './revenue';

const result = calculateRevenueSplitFromDollars(50.0, { isRegisteredPlayer: true });
// result:
// {
//   totalPriceCents: 5000,
//   isRegisteredPlayer: true,
//   discountPercentage: 0.15,
//   discountAmountCents: 750,            // 5000 * 0.15
//   customerPaysCents: 4250,             // 5000 - 750
//   commissionPercentage: 0.10,
//   commissionAmountCents: 425,          // round(4250 * 0.10)
//   vendorPayoutCents: 3825              // 4250 - 425
// }

*/