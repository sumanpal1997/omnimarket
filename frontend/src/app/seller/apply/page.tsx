"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  sellerApplicationSchema,
  SellerApplicationFormData,
} from "@/schemas/seller.schema";
import { sellerService, SellerProfile } from "@/services/seller.service";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  Building2,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  ArrowRight,
  Loader2,
} from "lucide-react";

export default function SellerApplyPage() {
  const { user } = useAuthStore();
  const [existingSeller, setExistingSeller] = useState<SellerProfile | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SellerApplicationFormData>({
    resolver: zodResolver(sellerApplicationSchema),
    defaultValues: {
      storeName: "",
      description: "",
      businessInfo: {
        legalName: "",
        registrationNumber: "",
        taxId: "",
        address: "",
      },
      bankAccount: {
        bankName: "",
        accountNumber: "",
        routingCode: "",
      },
      agreeToSellerPolicy: false,
    },
  });

  useEffect(() => {
    if (user) {
      sellerService
        .getMyProfile()
        .then((profile) => setExistingSeller(profile))
        .catch(() => {})
        .finally(() => setCheckingExisting(false));
    } else {
      setCheckingExisting(false);
    }
  }, [user]);

  const onSubmit = async (data: SellerApplicationFormData) => {
    setServerError(null);
    try {
      await sellerService.apply(data);
      setIsSuccess(true);
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message ||
        "Failed to submit seller application. Please check your information.";
      setServerError(message);
    }
  };

  if (checkingExisting) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // If already active seller
  if (existingSeller && (existingSeller.status === "ACTIVE" || existingSeller.status === "APPROVED")) {
    return (
      <div className="container mx-auto px-4 py-16 sm:px-6 max-w-2xl text-center">
        <Card className="border-slate-200 p-8 shadow-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-6">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <Badge variant="success" className="mb-2">
            Status: ACTIVE MERCHANT
          </Badge>
          <CardTitle className="text-2xl font-bold">You are already a Verified Merchant!</CardTitle>
          <CardDescription className="mt-2 text-base text-slate-600">
            Your store <strong>{existingSeller.storeName}</strong> is verified and active. You can add catalog products, manage inventory, and withdraw earnings.
          </CardDescription>

          <div className="mt-8 border-t border-slate-100 pt-6 flex justify-center space-x-4">
            <Link href="/dashboard/seller">
              <Button className="flex items-center space-x-1.5">
                <span>Go to Seller Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // If application is already pending review
  if (isSuccess || (existingSeller && existingSeller.status === "PENDING")) {
    return (
      <div className="container mx-auto px-4 py-16 sm:px-6 max-w-2xl text-center">
        <Card className="border-slate-200 p-8 shadow-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-6">
            <Clock className="h-10 w-10" />
          </div>
          <Badge variant="warning" className="mb-2">
            Status: PENDING ADMIN REVIEW
          </Badge>
          <CardTitle className="text-2xl font-bold">Application Received & Under Review</CardTitle>
          <CardDescription className="mt-2 text-base text-slate-600">
            Thank you for applying to sell on OmniMarket! Your store profile and tax verification are in our compliance queue. Once an administrator approves your application, your store will be activated immediately.
          </CardDescription>

          <div className="mt-8 border-t border-slate-100 pt-6 flex justify-center space-x-4">
            <Link href="/dashboard/seller">
              <Button variant="outline">Preview Seller Portal</Button>
            </Link>
            <Link href="/">
              <Button>Return to Storefront</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 sm:px-6 max-w-3xl space-y-8">
      {/* Header Banner */}
      <div className="text-center">
        <Badge variant="default" className="mb-2">
          Merchant Onboarding
        </Badge>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
          Apply to Sell on OmniMarket
        </h1>
        <p className="mt-2 text-slate-600 text-sm sm:text-base">
          Reach millions of buyers. Verified merchant payouts, low commissions, and automated multi-seller fulfillment.
        </p>
      </div>

      {/* Visual Stepper */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
        <div className="space-y-1">
          <div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
            user ? "bg-emerald-100 text-emerald-800" : "bg-blue-600 text-white"
          }`}>
            {user ? "✓" : "1"}
          </div>
          <p className="text-xs font-bold text-slate-800">1. Account</p>
          <p className="text-[10px] text-slate-500 hidden sm:block">
            {user ? "Account Ready" : "Sign In Required"}
          </p>
        </div>

        <div className="space-y-1 border-x border-slate-100">
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold ring-4 ring-blue-50">
            2
          </div>
          <p className="text-xs font-bold text-blue-600">2. Store & KYC</p>
          <p className="text-[10px] text-slate-500 hidden sm:block">Fill Business Details</p>
        </div>

        <div className="space-y-1">
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 text-xs font-bold">
            3
          </div>
          <p className="text-xs font-bold text-slate-400">3. Admin Review</p>
          <p className="text-[10px] text-slate-500 hidden sm:block">Approval & Activation</p>
        </div>
      </div>

      {/* If Not Signed In Prompt */}
      {!user && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-6 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <UserCheck className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Sign in to Submit Your Application</h3>
          <p className="mt-1 text-xs text-slate-600 max-w-md mx-auto">
            Your merchant store and payout ledger must be linked to your user account. Please create your account or sign in before filling out this form.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/register">
              <Button size="sm">Create Seller Account</Button>
            </Link>
            <Link href="/login">
              <Button size="sm" variant="outline">Sign In</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Current Logged-in State Card */}
      {user && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white uppercase">
              {user.firstName ? user.firstName[0] : "U"}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">
                Applying as: {user.firstName} {user.lastName} ({user.email})
              </p>
              <p className="text-[11px] text-slate-500">Your store will be linked to this account.</p>
            </div>
          </div>
          <Badge variant="success" className="text-[10px]">
            Account Verified
          </Badge>
        </div>
      )}

      {serverError && (
        <div className="flex items-center space-x-2 rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Step 1: Store Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Store className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">1. Store Profile</CardTitle>
            </div>
            <CardDescription>
              This is how your storefront will appear to buyers across OmniMarket.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Store / Brand Name"
              placeholder="e.g. Apex Electronics"
              error={errors.storeName?.message}
              {...register("storeName")}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Store Description</label>
              <textarea
                rows={3}
                placeholder="Briefly describe what your store sells..."
                className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-xs text-red-600">{errors.description.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Legal & KYC Business Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">2. Business Verification & Tax Info</CardTitle>
            </div>
            <CardDescription>
              Required for regulatory compliance and tax reporting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Legal Registered Business Name"
                placeholder="Apex Technologies Pvt. Ltd."
                error={errors.businessInfo?.legalName?.message}
                {...register("businessInfo.legalName")}
              />
              <Input
                label="Company Registration / CIN / Trade License"
                placeholder="U72200KA2020PTC123456"
                error={errors.businessInfo?.registrationNumber?.message}
                {...register("businessInfo.registrationNumber")}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Tax ID / GST Number"
                placeholder="29AAAAA0000A1Z5"
                error={errors.businessInfo?.taxId?.message}
                {...register("businessInfo.taxId")}
              />
              <Input
                label="Registered Business Address"
                placeholder="Building, Street, City, State, PIN"
                error={errors.businessInfo?.address?.message}
                {...register("businessInfo.address")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Banking & Settlement Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">3. Bank Account for Automated Payouts</CardTitle>
            </div>
            <CardDescription>
              Delivered order revenues are automatically calculated and disbursed to this bank account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Bank Name"
              placeholder="e.g. HDFC Bank, ICICI Bank, Chase"
              error={errors.bankAccount?.bankName?.message}
              {...register("bankAccount.bankName")}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Account Number"
                placeholder="123456789012"
                error={errors.bankAccount?.accountNumber?.message}
                {...register("bankAccount.accountNumber")}
              />
              <Input
                label="IFSC / Routing / Swift Code"
                placeholder="HDFC0001234"
                error={errors.bankAccount?.routingCode?.message}
                {...register("bankAccount.routingCode")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Policy Agreement */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 space-y-4">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="agreeToSellerPolicy"
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              {...register("agreeToSellerPolicy")}
            />
            <label htmlFor="agreeToSellerPolicy" className="text-xs text-slate-700 leading-relaxed cursor-pointer">
              I agree to the <strong>OmniMarket Merchant Services Agreement</strong>, Marketplace Code of Conduct, standard 10% platform commission deductions on captured orders, and verify that the business and tax details provided are accurate.
            </label>
          </div>
          {errors.agreeToSellerPolicy && (
            <p className="text-xs text-red-600">{errors.agreeToSellerPolicy.message}</p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting || !user}
            className="w-full text-base font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Submitting Merchant Application...
              </>
            ) : !user ? (
              "Sign In Required to Submit Application"
            ) : (
              "Submit Merchant Application for Review"
            )}
          </Button>

          <div className="flex items-center justify-center space-x-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Bank-grade encryption • Regulatory compliant escrow disbursements</span>
          </div>
        </div>
      </form>
    </div>
  );
}
