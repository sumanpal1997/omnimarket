"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginFormData } from "@/schemas/auth.schema";
import { authService } from "@/services/auth.service";
import { cartService } from "@/services/cart.service";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { AlertCircle, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      const response = await authService.login(data);
      setUser(response.user);

      try {
        await cartService.mergeGuestCart();
        await useCartStore.getState().fetchCart();
      } catch {
        // ignore cart merge failure
      }

      if (response.user.role === "SELLER") {
        router.push("/dashboard/seller");
      } else if (response.user.role === "ADMIN") {
        router.push("/dashboard/admin");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message || "Invalid email or password. Please try again.";
      setServerError(message);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-16rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-lg border-slate-200">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Sign in to OmniMarket</CardTitle>
          <CardDescription>
            Enter your credentials to access your account, orders, or merchant store.
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
            <div className="relative">
              <Input
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                error={errors.email?.message}
                {...register("email")}
              />
              <Mail className="absolute right-3 top-9 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>

            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <Link
                  href="/forgot-password"
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
                className="mt-1"
                {...register("password")}
              />
              <Lock className="absolute right-3 top-8 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>

            <Button type="submit" size="lg" className="w-full mt-2" isLoading={isSubmitting}>
              Sign In
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2 border-t border-slate-100 pt-4 text-center">
          <p className="text-xs text-slate-500">
            Don't have an account?{" "}
            <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700">
              Create an account
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
