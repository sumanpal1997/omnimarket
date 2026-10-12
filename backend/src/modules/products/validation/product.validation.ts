import { z } from "zod";

export const productVariantInputSchema = z.object({
  sku: z
    .string()
    .min(3, "SKU must be at least 3 characters")
    .regex(/^[A-Za-z0-9_-]+$/, "SKU may only contain letters, numbers, hyphens, and underscores")
    .toUpperCase()
    .trim(),
  title: z.string().min(1, "Variant title is required").trim(),
  priceMinor: z.number().int().positive("Price must be a positive integer in minor units"),
  compareAtPriceMinor: z
    .number()
    .int()
    .positive("Compare-at price must be a positive integer in minor units")
    .optional(),
  attributes: z.record(z.string()).default({}),
  images: z.array(z.string().url("Invalid image URL")).default([]),
  stock: z.number().int().min(0, "Stock cannot be negative").default(0),
});

export const createProductSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long").trim(),
  description: z.string().min(10, "Description must be at least 10 characters long").trim(),
  categoryId: z.string().min(1, "Category ID is required"),
  brandId: z.string().optional(),
  images: z.array(z.string().url("Invalid image URL")).min(1, "At least one product image is required"),
  variants: z
    .array(productVariantInputSchema)
    .min(1, "Product must have at least one variant"),
  seo: z
    .object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
    })
    .optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const reviewProductSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
    rejectionReason: z.string().min(5, "Rejection reason is required").optional(),
  })
  .refine(
    (data) => {
      if (data.status === "REJECTED" && !data.rejectionReason) return false;
      return true;
    },
    {
      message: "Rejection reason is strictly required when rejecting a product",
      path: ["rejectionReason"],
    }
  );

export const productQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
  category: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  maxPrice: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  sort: z.enum(["price_asc", "price_desc", "newest", "rating"]).optional().default("newest"),
  search: z.string().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ReviewProductInput = z.infer<typeof reviewProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
