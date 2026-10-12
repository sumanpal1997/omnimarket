import { z } from "zod";

export const sellerModerationSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "SUSPEND", "ACTIVATE"], {
    errorMap: () => ({ message: "Action must be APPROVE, REJECT, SUSPEND, or ACTIVATE" }),
  }),
  reason: z.string().max(500, "Reason must be under 500 characters").optional(),
  commissionRate: z
    .number()
    .min(0, "Commission cannot be negative")
    .max(100, "Commission cannot exceed 100%")
    .optional(),
});

export const productModerationSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "ARCHIVE"], {
    errorMap: () => ({ message: "Action must be APPROVE, REJECT, or ARCHIVE" }),
  }),
  rejectionReason: z
    .string()
    .max(500, "Rejection reason must be under 500 characters")
    .optional(),
});

export const userStatusToggleSchema = z.object({
  isActive: z.boolean({ required_error: "isActive boolean is required" }),
  reason: z.string().max(500, "Reason must be under 500 characters").optional(),
});

export const adminQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z.string().optional(),
  role: z.string().optional(),
});

export type SellerModerationInput = z.infer<typeof sellerModerationSchema>;
export type ProductModerationInput = z.infer<typeof productModerationSchema>;
export type UserStatusToggleInput = z.infer<typeof userStatusToggleSchema>;
export type AdminQueryInput = z.infer<typeof adminQuerySchema>;
