import { z } from "zod";

export const sellerApplicationSchema = z.object({
  storeName: z.string().min(3, "Store name must be at least 3 characters").trim(),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
  logoUrl: z.string().url("Invalid logo URL").optional(),
  bannerUrl: z.string().url("Invalid banner URL").optional(),
  businessInfo: z.object({
    legalName: z.string().min(3, "Legal business name is required").trim(),
    registrationNumber: z.string().min(3, "Business registration number is required").trim(),
    taxId: z.string().min(3, "Tax identification number (GSTIN / VAT) is required").trim(),
    address: z.string().min(10, "Registered business address must be at least 10 characters").trim(),
  }),
  bankAccount: z.object({
    bankName: z.string().min(2, "Bank name is required").trim(),
    accountNumber: z.string().min(8, "Account number must be at least 8 digits").trim(),
    routingCode: z.string().min(4, "Routing code / IFSC is required").trim(),
  }),
});

export const reviewSellerApplicationSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
    rejectionReason: z.string().min(5, "Rejection reason must be provided").optional(),
  })
  .refine(
    (data) => {
      if (data.status === "REJECTED" && !data.rejectionReason) {
        return false;
      }
      return true;
    },
    {
      message: "A rejection reason is strictly required when rejecting a seller application",
      path: ["rejectionReason"],
    }
  );

export const updateSellerStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "BLOCKED"]),
  reason: z.string().min(5, "Reason for status modification is required").optional(),
});

export type SellerApplicationInput = z.infer<typeof sellerApplicationSchema>;
export type ReviewSellerApplicationInput = z.infer<typeof reviewSellerApplicationSchema>;
export type UpdateSellerStatusInput = z.infer<typeof updateSellerStatusSchema>;
