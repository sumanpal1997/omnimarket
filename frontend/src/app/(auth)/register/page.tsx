"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, RegisterFormData } from "@/schemas/auth.schema";
import { authService } from "@/services/auth.service";
import { cartService } from "@/services/cart.service";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { AlertCircle, User, Store } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "CUSTOMER",
      agreeToTerms: false,
    },
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    try {
      const response = await authService.register({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
      });

      setUser(response.user);

      try {
        await cartService.mergeGuestCart();
        await useCartStore.getState().fetchCart();
      } catch {
        // ignore cart merge failure
      }

      if (data.role === "SELLER") {
        router.push("/seller/apply");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message || "Failed to create account. Please check your information.";
      setServerError(message);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-16rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg shadow-lg border-slate-200">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Create your account</CardTitle>
          <CardDescription>
            Join OmniMarket as a customer or start selling your products worldwide.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {serverError && (
            <div className="mb-4 flex items-center space-x-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Role Selection Switch */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">I want to:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setValue("role", "CUSTOMER")}
                  className={`flex items-center justify-center space-x-2 rounded-lg border p-3 text-sm font-medium transition-all ${
                    selectedRole === "CUSTOMER"
                      ? "border-blue-600 bg-blue-50/50 text-blue-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span>Shop Products</span>
                </button>

                <button
                  type="button"
                  onClick={() => setValue("role", "SELLER")}
                  className={`flex items-center justify-center space-x-2 rounded-lg border p-3 text-sm font-medium transition-all ${
                    selectedRole === "SELLER"
                      ? "border-blue-600 bg-blue-50/50 text-blue-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Store className="h-4 w-4" />
                  <span>Sell on Platform</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="First Name"
                placeholder="John"
                error={errors.firstName?.message}
                {...register("firstName")}
              />
              <Input
                label="Last Name"
                placeholder="Doe"
                error={errors.lastName?.message}
                {...register("lastName")}
              />
            </div>

            <Input
              label="Email Address"
              type="email"
              placeholder="name@example.com"
              error={errors.email?.message}
              {...register("email")}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Min. 8 characters with letters, numbers, symbols"
              error={errors.password?.message}
              {...register("password")}
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter password"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />

            <div className="flex items-start space-x-2 pt-2">
              <input
                id="terms"
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                {...register("agreeToTerms")}
              />
              <label htmlFor="terms" className="text-xs text-slate-600">
                I agree to the{" "}
                <Link href="/terms" className="text-blue-600 hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </Link>
                .
              </label>
            </div>
            {errors.agreeToTerms && (
              <p className="text-xs text-red-600 font-medium">{errors.agreeToTerms.message}</p>
            )}

            <Button type="submit" size="lg" className="w-full mt-2" isLoading={isSubmitting}>
              Create Account
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2 border-t border-slate-100 pt-4 text-center">
          <p className="text-xs text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
