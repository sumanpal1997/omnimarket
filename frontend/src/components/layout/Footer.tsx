import Link from "next/link";
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  Headphones,
  Store,
  Lock,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800">
      {/* Top Marketplace Guarantee Strip */}
      <div className="border-b border-slate-800/80 bg-slate-900/50 py-8">
        <div className="container mx-auto grid grid-cols-1 gap-6 px-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
          <div className="flex items-center space-x-3.5">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Multi-Vendor Express</h4>
              <p className="text-xs text-slate-400">Direct dispatch from verified hubs</p>
            </div>
          </div>

          <div className="flex items-center space-x-3.5">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">100% Escrow Protection</h4>
              <p className="text-xs text-slate-400">PCI-DSS compliant payment security</p>
            </div>
          </div>

          <div className="flex items-center space-x-3.5">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">7-Day Replacement</h4>
              <p className="text-xs text-slate-400">Hassle-free return & refund portal</p>
            </div>
          </div>

          <div className="flex items-center space-x-3.5">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">24/7 Priority Concierge</h4>
              <p className="text-xs text-slate-400">Dedicated buyer & merchant support</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Grid */}
      <div className="container mx-auto px-4 py-14 sm:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12">
          {/* Col 1: Brand Info (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <Link href="/" className="flex items-center space-x-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-lg shadow-sm">
                O
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-white leading-none">
                  Omni<span className="text-blue-500">Market</span>
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mt-0.5">
                  Global Commerce Hub
                </span>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
              Enterprise multi-vendor marketplace engineered with atomic inventory reservations, split-seller order orchestration, and verified KYB merchant stores.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
                <Lock className="h-3 w-3 text-emerald-400" /> 256-Bit SSL
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
                <CheckCircle2 className="h-3 w-3 text-blue-400" /> KYB Verified
              </span>
            </div>
          </div>

          {/* Col 2: Departments (3 cols) */}
          <div className="lg:col-span-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Top Departments
            </h5>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link href="/products?category=computers" className="hover:text-white transition-colors">
                  Computers & Workstations
                </Link>
              </li>
              <li>
                <Link href="/products?category=audio" className="hover:text-white transition-colors">
                  Studio Audio & Headphones
                </Link>
              </li>
              <li>
                <Link href="/products?category=electronics" className="hover:text-white transition-colors">
                  4K Displays & Electronics
                </Link>
              </li>
              <li>
                <Link href="/products?category=wearables" className="hover:text-white transition-colors">
                  Pro Smart Wearables
                </Link>
              </li>
              <li>
                <Link href="/products?category=fashion" className="hover:text-white transition-colors">
                  Fashion & Collector Sneakers
                </Link>
              </li>
              <li>
                <Link href="/products?category=home-living" className="hover:text-white transition-colors">
                  Smart Home & Living
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Merchant Hub (3 cols) */}
          <div className="lg:col-span-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Merchant Ecosystem
            </h5>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link
                  href="/seller/apply"
                  className="inline-flex items-center space-x-1.5 text-blue-400 hover:text-blue-300 font-semibold"
                >
                  <Store className="h-3.5 w-3.5" />
                  <span>Become a Verified Seller</span>
                </Link>
              </li>
              <li>
                <Link href="/dashboard/seller" className="hover:text-white transition-colors">
                  Merchant Portal & Analytics
                </Link>
              </li>
              <li>
                <Link href="/seller/guidelines" className="hover:text-white transition-colors">
                  Seller Handbook & Commissions
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-white transition-colors">
                  Browse All Store Directories
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Account & Support (2 cols) */}
          <div className="lg:col-span-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Customer Care
            </h5>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link href="/profile" className="hover:text-white transition-colors">
                  Account Settings
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-white transition-colors">
                  Track Orders
                </Link>
              </li>
              <li>
                <Link href="/checkout" className="hover:text-white transition-colors">
                  Shopping Cart & Checkout
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Customer Sign In
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal & Payment Badges */}
        <div className="mt-12 border-t border-slate-800/80 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} OmniMarket Technologies Inc. All rights reserved.</p>

          <div className="flex flex-wrap items-center gap-2">
            {["UPI", "VISA", "MASTERCARD", "RUPAY", "NETBANKING", "ESCROW PAY"].map((method) => (
              <span
                key={method}
                className="rounded-md bg-slate-900 border border-slate-800 px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-300"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
