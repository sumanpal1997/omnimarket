import { z } from "zod";

export const sellerApplicationSchema = z.object({
  storeName: z.string().min(3, "Store name must be at least 3 characters long").trim(),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
  businessInfo: z.object({
    legalName: z.string().min(3, "Legal business entity name is required").trim(),
    registrationNumber: z.string().min(3, "Registration number / CIN is required").trim(),
    taxId: z.string().min(3, "Tax identification number (GSTIN / VAT) is required").trim(),
    address: z.string().min(10, "Registered address must be at least 10 characters").trim(),
  }),
  bankAccount: z.object({
    bankName: z.string().min(2, "Bank name is required").trim(),
    accountNumber: z.string().min(8, "Valid bank account number is required").trim(),
    routingCode: z.string().min(4, "Routing code / IFSC is required").trim(),
  }),
  agreeToSellerPolicy: z.boolean().refine((val) => val === true, {
    message: "You must accept the Merchant Marketplace Agreement",
  }),
});

export type SellerApplicationFormData = z.infer<typeof sellerApplicationSchema>;
