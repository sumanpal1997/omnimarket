import { z } from "zod";

export const createReviewSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  rating: z.coerce
    .number()
    .int("Rating must be an integer")
    .min(1, "Minimum rating is 1 star")
    .max(5, "Maximum rating is 5 stars"),
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title cannot exceed 100 characters"),
  comment: z
    .string()
    .min(10, "Review comment must be at least 10 characters")
    .max(2000, "Review comment cannot exceed 2000 characters"),
  images: z
    .array(z.string().url("Review images must be valid URLs"))
    .max(5, "You can upload at most 5 photos")
    .optional()
    .default([]),
});

export const listReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  rating: z.coerce.number().int().min(1).max(5).optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type ListReviewsQueryInput = z.infer<typeof listReviewsQuerySchema>;
