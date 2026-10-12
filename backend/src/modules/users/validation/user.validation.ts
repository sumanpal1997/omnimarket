import { z } from "zod";

export const updateProfileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters").trim().optional(),
  lastName: z.string().min(2, "Last name must be at least 2 characters").trim().optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid international phone format")
    .optional(),
});

export const addressSchema = z.object({
  label: z.enum(["HOME", "WORK", "OTHER"]).default("HOME"),
  isDefault: z.boolean().default(false),
  street: z.string().min(5, "Street address must be at least 5 characters").trim(),
  city: z.string().min(2, "City is required").trim(),
  state: z.string().min(2, "State is required").trim(),
  postalCode: z.string().min(4, "Postal code is required").trim(),
  country: z.string().min(2, "Country is required").trim().default("India"),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone format")
    .optional(),
});

export const updateAddressSchema = addressSchema.partial();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
