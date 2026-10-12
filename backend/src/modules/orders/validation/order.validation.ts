import { z } from "zod";

export const createOrderSchema = z.object({
  addressId: z.string().min(1, "Shipping address ID is required"),
  paymentProvider: z.enum(["STRIPE", "RAZORPAY"], {
    errorMap: () => ({ message: "Payment provider must be either STRIPE or RAZORPAY" }),
  }),
  idempotencyKey: z.string().min(1, "Idempotency key is required"),
  couponCode: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(
    [
      "CONFIRMED",
      "PROCESSING",
      "SHIPPED",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
    ],
    {
      errorMap: () => ({ message: "Invalid order fulfillment status" }),
    }
  ),
  note: z.string().max(500, "Note must be under 500 characters").optional(),
  tracking: z
    .object({
      carrier: z.string().min(1, "Shipping carrier is required"),
      trackingNumber: z.string().min(1, "Tracking number is required"),
      trackingUrl: z.string().url("Invalid tracking URL").optional(),
    })
    .optional(),
});

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type ListOrdersQueryInput = z.infer<typeof listOrdersQuerySchema>;
