import { z } from "zod";

export const settlePayoutSchema = z.object({
  status: z.enum(["PAID", "FAILED"], {
    errorMap: () => ({ message: "Status must be either PAID or FAILED" }),
  }),
  transactionReference: z.string().min(1, "Transaction reference / UTR is required if PAID").optional(),
  failureReason: z.string().max(500, "Failure reason must be under 500 characters").optional(),
});

export const listPayoutsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.string().optional(),
});

export type SettlePayoutInput = z.infer<typeof settlePayoutSchema>;
export type ListPayoutsQueryInput = z.infer<typeof listPayoutsQuerySchema>;
