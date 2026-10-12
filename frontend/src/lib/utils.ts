import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats integer minor units (paise/cents) into user-friendly currency string
 * e.g. 19999 paise -> "₹199.99"
 */
export function formatMinorUnitsToCurrency(
  amountMinor: number,
  currency: string = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "INR"
): string {
  const amountMajor = amountMinor / 100;
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMajor);
}

/**
 * Standard date formatting helper
 */
export function formatDate(date: string | Date | number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}
