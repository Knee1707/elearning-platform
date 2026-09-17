"use server";

import { mockPurchase } from "@/lib/queries/commerce";
import { applyCoupon as applyCouponQuery } from "@/lib/queries/courses";

export async function applyCoupon(code: string, courseIds: string[]): Promise<number> {
  return applyCouponQuery(code, courseIds);
}

export async function mockPurchaseAction(courseIds: string[], couponCode?: string): Promise<string[]> {
  return mockPurchase(courseIds, couponCode);
}