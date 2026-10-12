"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Store,
  ShieldCheck,
  Zap,
  Truck,
  RotateCcw,
  Award,
  Flame,
  ChevronRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/shared/ProductCard";
import { productService, Product } from "@/services/product.service";

const VISUAL_CATEGORIES = [
  {
    name: "Computers & Workstations",
    slug: "computers",
    subtitle: "MacBook Pro, Creator Laptops & Accessories",
    badge: "Flagship Tech",
    image:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80",
    span: "lg:col-span-2",
  },
  {
    name: "Studio Audio & ANC",
    slug: "audio",
    subtitle: "Sony, Bose & Spatial Soundbars",
    badge: "Best Sellers",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
    span: "lg:col-span-1",
  },
  {
    name: "Pro Smart Wearables",
    slug: "wearables",
    subtitle: "Titanium GPS & Fitness Watches",
    badge: "New Arrival",
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
    span: "lg:col-span-1",
  },
  {
    name: "4K Displays & Electronics",
    slug: "electronics",
    subtitle: "OLED Gaming Monitors & Smart Gear",
    badge: "Top Rated",
    image:
      "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80",
    span: "lg:col-span-1",
  },
  {
    name: "Fashion & Collector Sneakers",
    slug: "fashion",
    subtitle: "Authenticated Jordan & Streetwear",
    badge: "Verified Authentic",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
    span: "lg:col-span-1",
  },
  {
    name: "Smart Home & Living",
    slug: "home-living",
    subtitle: "Dyson Purifiers & Home Automation",
    badge: "Smart Living",
    image:
      "https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=900&q=80",
    span: "lg:col-span-2",
  },
];

const OFFICIAL_BRANDS = [
  { name: "Apple", tagline: "Authorized Resellers" },
  { name: "Sony", tagline: "Master Series Audio" },
  { name: "Samsung", tagline: "Odyssey & Galaxy" },
  { name: "Bose", tagline: "QuietComfort Pro" },
  { name: "Nike", tagline: "Verified Sneakers" },
  { name: "Dyson", tagline: "Home Engineering" },
  { name: "Logitech", tagline: "MX Master Series" },
];

const QUICK_TABS = [
  { label: "All Flagships", slug: "" },
  { label: "Computers", slug: "computers" },
  { label: "Audio & ANC", slug: "audio" },
  { label: "Electronics", slug: "electronics" },
  { label: "Wearables", slug: "wearables" },
  { label: "Fashion", slug: "fashion" },
  { label: "Home & Living", slug: "home-living" },
];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    productService
      .getCatalog({
        category: activeTab || undefined,
        limit: 8,
        sort: "newest",
      })
      .then((res) => setProducts(res.items || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [activeTab]);

  return (
    <div className="bg-slate-50/60 pb-20">
      {/* 1. Split Bento Hero Section */}
      <section className="container mx-auto px-4 pt-6 pb-8 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Main Hero Banner (8 Cols) */}
          <div className="lg:col-span-8 relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl border border-slate-800 flex flex-col justify-between p-8 sm:p-12 min-h-[420px]">
            {/* Background Decorative Glow & Product Image */}
            <div className="pointer-events-none absolute -right-16 -bottom-16 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
            <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 hidden md:block">
              <img
                src="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80"
                alt="Flagship Electronics"
                className="h-full w-full object-cover opacity-35 mix-blend-luminosity mask-image-gradient"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
            </div>

            <div className="relative z-10 max-w-xl space-y-5">
              <div className="inline-flex items-center space-x-2 rounded-full bg-blue-500/15 border border-blue-400/30 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-300">
                <Flame className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                <span>Premiere Multi-Vendor Marketplace • Up to 30% Off</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.12] text-white">
                Next-Gen Tech & Lifestyle.{" "}
                <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-300 bg-clip-text text-transparent">
                  Direct from Verified Stores.
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Experience enterprise-grade shopping with atomic inventory reservations, multi-merchant split checkouts, and 100% buyer escrow protection on every order.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3.5">
                <Link href="/products">
                  <Button
                    size="lg"
                    className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold px-7 shadow-lg shadow-blue-600/30 flex items-center space-x-2"
                  >
                    <span>Shop All Deals</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/categories">
                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-xl border-slate-700 bg-slate-900/70 text-slate-200 hover:bg-slate-800 hover:text-white font-semibold px-6"
                  >
                    Browse Departments
                  </Button>
                </Link>
              </div>
            </div>

            {/* Bottom Hero KPI Strip */}
            <div className="relative z-10 mt-10 pt-6 border-t border-white/10 grid grid-cols-3 gap-4 max-w-lg">
              <div>
                <p className="text-xl sm:text-2xl font-extrabold text-white">100%</p>
                <p className="text-xs text-slate-400">Escrow Buyer Protection</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-extrabold text-emerald-400">24h</p>
                <p className="text-xs text-slate-400">Express Hub Dispatch</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-extrabold text-blue-400">KYB</p>
                <p className="text-xs text-slate-400">Verified Brand Merchants</p>
              </div>
            </div>
          </div>

          {/* Right Stacked Promo Spotlights (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            {/* Spotlight 1 */}
            <Link
              href="/products?category=audio"
              className="group relative flex-1 overflow-hidden rounded-3xl bg-slate-900 text-white p-6 sm:p-7 flex flex-col justify-between min-h-[200px] shadow-lg border border-slate-800"
            >
              <img
                src="https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=700&q=80"
                alt="Sony & Bose Studio Audio"
                className="absolute inset-0 h-full w-full object-cover opacity-45 transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

              <div className="relative z-10 flex items-center justify-between">
                <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-950">
                   Editor&apos;s Pick
                </span>
                <span className="text-xs font-bold text-emerald-300">Save up to 18%</span>
              </div>

              <div className="relative z-10 mt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">
                  Studio Acoustics
                </p>
                <h3 className="text-xl font-extrabold text-white mt-0.5 group-hover:text-blue-300 transition-colors">
                  Sony WH-1000XM5 & Bose Ultra
                </h3>
                <span className="mt-2 inline-flex items-center text-xs font-bold text-white group-hover:translate-x-1 transition-transform">
                  Explore Audio Collection <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                </span>
              </div>
            </Link>

            {/* Spotlight 2 */}
            <Link
              href="/products?category=wearables"
              className="group relative flex-1 overflow-hidden rounded-3xl bg-slate-900 text-white p-6 sm:p-7 flex flex-col justify-between min-h-[200px] shadow-lg border border-slate-800"
            >
              <img
                src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=80"
                alt="Apple Watch Ultra 2"
                className="absolute inset-0 h-full w-full object-cover opacity-45 transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

              <div className="relative z-10 flex items-center justify-between">
                <span className="rounded-full bg-blue-500 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
                  Titanium Series
                </span>
                <span className="text-xs font-bold text-amber-300">In Stock Now</span>
              </div>

              <div className="relative z-10 mt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                  Adventure Wearables
                </p>
                <h3 className="text-xl font-extrabold text-white mt-0.5 group-hover:text-emerald-300 transition-colors">
                  Apple Watch Ultra 2 Titanium
                </h3>
                <span className="mt-2 inline-flex items-center text-xs font-bold text-white group-hover:translate-x-1 transition-transform">
                  Shop Pro Wearables <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Enterprise Trust & Value Bar */}
      <section className="container mx-auto px-4 pb-12 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 rounded-2xl bg-white p-5 shadow-sm border border-slate-200/80">
          <div className="flex items-center space-x-3.5 px-2">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">100% Escrow Protection</h3>
              <p className="text-xs text-slate-500">Payment released only after delivery</p>
            </div>
          </div>

          <div className="flex items-center space-x-3.5 px-2">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Verified Official Merchants</h3>
              <p className="text-xs text-slate-500">Strict KYB & authenticity checks</p>
            </div>
          </div>

          <div className="flex items-center space-x-3.5 px-2">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Free Express Delivery</h3>
              <p className="text-xs text-slate-500">Fast tracked shipping nationwide</p>
            </div>
          </div>

          <div className="flex items-center space-x-3.5 px-2">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <RotateCcw className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">7-Day Easy Replacement</h3>
              <p className="text-xs text-slate-500">Instant hassle-free return portal</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Trending Flagship Catalog Section (Live Backend Data) */}
      <section className="container mx-auto px-4 py-6 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
              <Zap className="h-3.5 w-3.5 fill-blue-600" />
              <span>Live Marketplace Inventory</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Trending Flagship Products
            </h2>
          </div>

          {/* Interactive Department Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {QUICK_TABS.map((tab) => {
              const isActive = activeTab === tab.slug;
              return (
                <button
                  key={tab.label}
                  onClick={() => setActiveTab(tab.slug)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-8">
            {[...Array(8)].map((_, idx) => (
              <div
                key={idx}
                className="h-80 rounded-2xl bg-white border border-slate-200 p-4 animate-pulse flex flex-col justify-between"
              >
                <div className="h-44 rounded-xl bg-slate-100" />
                <div className="space-y-2">
                  <div className="h-4 w-2/3 bg-slate-100 rounded" />
                  <div className="h-4 w-full bg-slate-100 rounded" />
                  <div className="h-6 w-1/3 bg-slate-100 rounded mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center">
            <p className="text-sm font-semibold text-slate-700">
              No products found in this department.
            </p>
            <button
              onClick={() => setActiveTab("")}
              className="mt-3 text-xs font-bold text-blue-600 hover:underline"
            >
              Reset filter to view all flagship products
            </button>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/products">
            <Button
              variant="outline"
              size="lg"
              className="rounded-xl border-slate-300 bg-white hover:bg-slate-900 hover:text-white font-bold px-8 transition-colors"
            >
              <span>View Complete Marketplace Catalog</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* 4. Visual Category Bento Grid */}
      <section className="container mx-auto px-4 py-12 sm:px-6">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
              Curated Storefronts
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Shop by Department
            </h2>
          </div>
          <Link
            href="/categories"
            className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <span>All Departments</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {VISUAL_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/products?category=${cat.slug}`}
              className={`group relative overflow-hidden rounded-3xl bg-slate-900 min-h-[240px] p-6 sm:p-7 flex flex-col justify-between shadow-md border border-slate-800/80 ${cat.span}`}
            >
              <img
                src={cat.image}
                alt={cat.name}
                className="absolute inset-0 h-full w-full object-cover opacity-60 transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />

              <div className="relative z-10 flex justify-between items-center">
                <span className="inline-flex items-center rounded-full bg-white/90 backdrop-blur-md px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-900">
                  {cat.badge}
                </span>
                <span className="h-8 w-8 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white group-hover:bg-blue-600 transition-colors">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>

              <div className="relative z-10 mt-12">
                <h3 className="text-xl sm:text-2xl font-extrabold text-white group-hover:text-blue-300 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">{cat.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. Official Brand Pavilion Strip */}
      <section className="container mx-auto px-4 py-6 sm:px-6">
        <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Authorized Brand Flagships
              </h3>
              <p className="text-xs text-slate-500">
                Click any brand to explore direct inventory with official manufacturer warranty
              </p>
            </div>
            <Link
              href="/products"
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Explore All Brands →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {OFFICIAL_BRANDS.map((brand) => (
              <Link
                key={brand.name}
                href={`/products?search=${encodeURIComponent(brand.name)}`}
                className="group rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-center hover:border-blue-500 hover:bg-blue-50/40 transition-all"
              >
                <p className="text-base font-extrabold tracking-tight text-slate-900 group-hover:text-blue-600">
                  {brand.name}
                </p>
                <p className="text-[10px] font-medium text-slate-500 mt-0.5">
                  {brand.tagline}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Merchant Onboarding Callout Banner */}
      <section className="container mx-auto px-4 pt-8 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-8 sm:p-12 shadow-xl">
          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center space-x-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-100">
                <Store className="h-3.5 w-3.5" />
                <span>OmniMarket Seller Hub</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Scale your retail brand to millions of verified shoppers.
              </h2>
              <p className="text-blue-100 text-sm sm:text-base max-w-2xl leading-relaxed">
                Onboard your business in minutes. Enjoy automated multi-vendor order splitting, real-time SKU stock reservation, transparent commission tiers, and direct bank settlements.
              </p>

              <div className="flex flex-wrap gap-6 pt-2 text-xs sm:text-sm font-semibold text-blue-100">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  0% Listing Fees
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  Automated GST Invoicing
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  Real-Time Seller Analytics
                </span>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 justify-end">
              <Link href="/seller/apply" className="w-full">
                <Button
                  size="lg"
                  className="w-full rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-extrabold shadow-lg"
                >
                  Apply as Verified Merchant
                </Button>
              </Link>
              <Link href="/seller/guidelines" className="w-full">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full rounded-xl border-white/30 text-white hover:bg-white/10 font-semibold"
                >
                  Read Seller Handbook
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
