"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  ShoppingBag,
  Search,
  User,
  Store,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Package,
  ShieldCheck,
  Settings,
  Sparkles,
  Laptop,
  Headphones,
  Watch,
  Shirt,
  Home,
  Cpu,
  Layers,
  Truck,
} from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import { formatMinorUnitsToCurrency } from "@/lib/utils";

const QUICK_CATEGORIES = [
  { name: "All Products", href: "/products", icon: Layers },
  { name: "Computers & Laptops", href: "/products?category=computers", icon: Laptop },
  { name: "Audio & Headphones", href: "/products?category=audio", icon: Headphones },
  { name: "Electronics", href: "/products?category=electronics", icon: Cpu },
  { name: "Wearables", href: "/products?category=wearables", icon: Watch },
  { name: "Fashion & Sneakers", href: "/products?category=fashion", icon: Shirt },
  { name: "Home & Living", href: "/products?category=home-living", icon: Home },
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { toggleCartDrawer, isMobileMenuOpen, setMobileMenuOpen } = useUIStore();
  const { cart, totalItems, fetchCart } = useCartStore();
  const { user, checkAuth, logout } = useAuthStore();

  const [mounted, setMounted] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("");
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    fetchCart();
    checkAuth();
  }, [fetchCart, checkAuth]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await logout();
    router.push("/");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    if (searchCategory) params.set("category", searchCategory);
    const queryStr = params.toString();
    router.push(`/products${queryStr ? `?${queryStr}` : ""}`);
  };

  const cartSubtotal = cart?.pricing?.subtotalMinor || 0;

  return (
    <header className="sticky top-0 z-40 w-full bg-white shadow-sm">
      {/* Top Enterprise Announcement & Utility Strip */}
      <div className="bg-slate-950 text-slate-300 border-b border-slate-800 text-[11px]">
        <div className="container mx-auto flex h-8 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center space-x-2 truncate">
            <span className="inline-flex items-center rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">
              <Sparkles className="h-2.5 w-2.5 mr-1" /> LIVE DEALS
            </span>
            <span className="font-medium text-slate-200 truncate">
              Free Express Shipping on orders over ₹999 • 100% Escrow Buyer Protection
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-5 text-slate-400">
            <Link href="/seller/apply" className="hover:text-white transition-colors flex items-center space-x-1">
              <Store className="h-3 w-3 text-blue-400" />
              <span>Become a Verified Merchant</span>
            </Link>
            <span className="text-slate-700">|</span>
            <Link href="/orders" className="hover:text-white transition-colors flex items-center space-x-1">
              <Truck className="h-3 w-3 text-emerald-400" />
              <span>Order Tracker</span>
            </Link>
            <span className="text-slate-700">|</span>
            <span className="text-slate-300 font-semibold">INR (₹)</span>
          </div>
        </div>
      </div>

      {/* Main Header Row */}
      <div className="border-b border-slate-200 bg-white">
        <div className="container mx-auto flex h-20 items-center justify-between gap-4 px-4 sm:px-6">
          {/* Brand Logo */}
          <div className="flex items-center space-x-6 flex-shrink-0">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 text-white shadow-md shadow-blue-600/20 group-hover:scale-105 transition-transform">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-slate-900 leading-none">
                  Omni<span className="text-blue-600">Market</span>
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
                  Global Marketplace
                </span>
              </div>
            </Link>
          </div>

          {/* Integrated Category + Search Bar */}
          <form
            onSubmit={handleSearch}
            className="hidden lg:flex flex-1 max-w-2xl mx-4"
          >
            <div className="flex w-full items-center rounded-xl border-2 border-slate-200 bg-slate-50/80 focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 transition-all overflow-hidden">
              <select
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
                aria-label="Filter by category"
                className="h-11 border-r border-slate-200 bg-slate-100/80 px-3 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer hover:bg-slate-200/60 transition-colors"
              >
                <option value="">All Departments</option>
                <option value="computers">Computers</option>
                <option value="audio">Audio</option>
                <option value="electronics">Electronics</option>
                <option value="wearables">Wearables</option>
                <option value="fashion">Fashion</option>
                <option value="home-living">Home & Living</option>
              </select>

              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search MacBook Pro, Sony XM5, Nike Air, Dyson..."
                  className="w-full bg-transparent py-2.5 pl-4 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="h-11 bg-blue-600 px-5 text-white hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1.5 font-semibold text-xs"
              >
                <Search className="h-4 w-4" />
                <span>Search</span>
              </button>
            </div>
          </form>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-3">
            {/* Merchant Portal Quick Pill */}
            <Link
              href="/dashboard/seller"
              className="hidden xl:flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 transition-all"
            >
              <Store className="h-4 w-4 text-blue-600" />
              <span>Seller Hub</span>
            </Link>

            {/* User Account / Dropdown */}
            {mounted ? (
              user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2.5 rounded-xl border border-slate-200 bg-white py-1.5 pl-2 pr-3 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:bg-slate-50 transition-all shadow-sm"
                    aria-label="User menu"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-xs font-bold text-white uppercase shadow-sm">
                      {user.firstName ? user.firstName[0] : "U"}
                    </div>
                    <div className="hidden sm:flex flex-col text-left">
                      <span className="text-xs font-bold text-slate-900 leading-tight">
                        {user.firstName} {user.lastName}
                      </span>
                      <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">
                        {user.role}
                      </span>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </button>

                  {/* Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50/60 rounded-t-xl">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                        <span className="mt-1.5 inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                          {user.role} ACCOUNT
                        </span>
                      </div>

                      <div className="py-1.5 space-y-0.5">
                        <Link
                          href="/profile"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center space-x-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <Settings className="h-4 w-4 text-slate-500" />
                          <span>Account Settings & Addresses</span>
                        </Link>

                        <Link
                          href="/orders"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center space-x-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <Package className="h-4 w-4 text-slate-500" />
                          <span>My Orders & Returns</span>
                        </Link>

                        {user.role === "SELLER" && (
                          <Link
                            href="/dashboard/seller"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center space-x-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100/80 transition-colors"
                          >
                            <Store className="h-4 w-4 text-emerald-600" />
                            <span>Merchant Seller Portal</span>
                          </Link>
                        )}

                        {user.role === "ADMIN" && (
                          <Link
                            href="/dashboard/admin"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center space-x-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100/80 transition-colors"
                          >
                            <ShieldCheck className="h-4 w-4 text-indigo-600" />
                            <span>Admin Control Center</span>
                          </Link>
                        )}
                      </div>

                      <div className="border-t border-slate-100 pt-1.5">
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center space-x-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    href="/login"
                    className="hidden sm:flex items-center space-x-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all"
                  >
                    <User className="h-4 w-4 text-slate-500" />
                    <span>Sign In</span>
                  </Link>
                  <Link
                    href="/register"
                    className="hidden sm:inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700 transition-all"
                  >
                    Register
                  </Link>
                </div>
              )
            ) : (
              <div className="h-9 w-24 rounded-xl bg-slate-100 animate-pulse hidden sm:block" />
            )}

            {/* Cart Drawer Trigger with Subtotal */}
            <button
              onClick={toggleCartDrawer}
              className="relative flex items-center space-x-2.5 rounded-xl bg-slate-900 px-3.5 py-2 text-white hover:bg-slate-800 transition-all shadow-sm"
              aria-label="Open cart"
            >
              <div className="relative">
                <ShoppingBag className="h-5 w-5 text-blue-400" />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-extrabold text-white ring-2 ring-slate-900">
                    {totalItems}
                  </span>
                )}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 leading-none">
                  My Cart
                </span>
                <span className="text-xs font-extrabold text-white leading-tight mt-0.5">
                  {cartSubtotal > 0 ? formatMinorUnitsToCurrency(cartSubtotal) : "₹0.00"}
                </span>
              </div>
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 lg:hidden text-slate-700 hover:text-blue-600 rounded-lg border border-slate-200"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Category Bar */}
      <div className="hidden md:block border-b border-slate-200/80 bg-slate-50/90 backdrop-blur-sm">
        <div className="container mx-auto flex h-10 items-center justify-between px-4 sm:px-6">
          <nav className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
            {QUICK_CATEGORIES.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 opacity-80" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="hidden xl:flex items-center space-x-4 text-xs font-medium text-slate-500">
            <Link href="/categories" className="hover:text-blue-600 transition-colors">
              Full Directory →
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-200 bg-white px-4 py-4 space-y-3 shadow-xl">
          {/* Mobile Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white"
            >
              Search
            </button>
          </form>

          {mounted && user && (
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80">
              <p className="text-sm font-bold text-slate-900">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-slate-500">{user.email}</p>
              <span className="mt-1 inline-block rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                {user.role}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {QUICK_CATEGORIES.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 rounded-lg p-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <Icon className="h-4 w-4 text-blue-600" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {mounted && user ? (
            <div className="border-t border-slate-100 pt-2 space-y-1">
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-semibold text-slate-700 hover:text-blue-600"
              >
                Account Settings
              </Link>
              <Link
                href="/orders"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-semibold text-slate-700 hover:text-blue-600"
              >
                My Orders
              </Link>
              {user.role === "SELLER" && (
                <Link
                  href="/dashboard/seller"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-sm font-semibold text-emerald-600"
                >
                  Seller Dashboard
                </Link>
              )}
              {user.role === "ADMIN" && (
                <Link
                  href="/dashboard/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-sm font-semibold text-indigo-600"
                >
                  Admin Portal
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="block w-full text-left py-2 text-sm font-semibold text-rose-600"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="border-t border-slate-100 pt-3 flex gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-700"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center rounded-xl bg-blue-600 py-2 text-xs font-bold text-white"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
