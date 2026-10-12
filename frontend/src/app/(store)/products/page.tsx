"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { productService, Product, Category } from "@/services/product.service";
import { ProductCard } from "@/components/shared/ProductCard";
import {
  PackageX,
  SlidersHorizontal,
  Loader2,
  Search,
  X,
  Filter,
  Sparkles,
  Check,
  RotateCcw,
} from "lucide-react";

interface PriceRangeOption {
  id: string;
  label: string;
  minMinor?: number;
  maxMinor?: number;
}

const PRICE_RANGES: PriceRangeOption[] = [
  { id: "all", label: "All Price Ranges" },
  { id: "under_15k", label: "Under ₹15,000", maxMinor: 1500000 },
  { id: "15k_50k", label: "₹15,000 – ₹50,000", minMinor: 1500000, maxMinor: 5000000 },
  { id: "50k_150k", label: "₹50,000 – ₹1,50,000", minMinor: 5000000, maxMinor: 15000000 },
  { id: "above_150k", label: "₹1,50,000 & Above", minMinor: 15000000 },
];

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category") || "";
  const searchParam = searchParams.get("search") || "";

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam);
  const [searchQuery, setSearchQuery] = useState<string>(searchParam);
  const [searchInput, setSearchInput] = useState<string>(searchParam);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>("all");
  const [sort, setSort] = useState<"newest" | "price_asc" | "price_desc" | "rating">("newest");
  const [loading, setLoading] = useState(true);

  // Sync URL params when user navigates from Navbar or Category links
  useEffect(() => {
    setSelectedCategory(categoryParam);
  }, [categoryParam]);

  useEffect(() => {
    setSearchQuery(searchParam);
    setSearchInput(searchParam);
  }, [searchParam]);

  // Load available categories
  useEffect(() => {
    productService
      .getCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  // Fetch catalog items when filters or sort change
  useEffect(() => {
    setLoading(true);
    const priceObj = PRICE_RANGES.find((r) => r.id === selectedPriceRange);

    productService
      .getCatalog({
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
        minPrice: priceObj?.minMinor,
        maxPrice: priceObj?.maxMinor,
        sort,
        limit: 24,
      })
      .then((data) => setProducts(data.items || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [selectedCategory, searchQuery, selectedPriceRange, sort]);

  const updateUrlParams = (newCategory: string, newSearch: string) => {
    const params = new URLSearchParams();
    if (newCategory) params.set("category", newCategory);
    if (newSearch.trim()) params.set("search", newSearch.trim());
    const qs = params.toString();
    router.push(qs ? `/products?${qs}` : "/products", { scroll: false });
  };

  const handleSelectCategory = (catIdentifier: string) => {
    setSelectedCategory(catIdentifier);
    updateUrlParams(catIdentifier, searchQuery);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
    updateUrlParams(selectedCategory, searchInput.trim());
  };

  const handleClearAll = () => {
    setSelectedCategory("");
    setSearchQuery("");
    setSearchInput("");
    setSelectedPriceRange("all");
    setSort("newest");
    router.push("/products", { scroll: false });
  };

  const isCategoryActive = (cat: Category) => {
    return selectedCategory === cat._id || selectedCategory === cat.slug;
  };

  const activeCategoryName =
    categories.find((c) => c.slug === selectedCategory || c._id === selectedCategory)?.name ||
    selectedCategory;

  const hasActiveFilters =
    Boolean(selectedCategory) || Boolean(searchQuery) || selectedPriceRange !== "all";

  return (
    <div className="bg-slate-50/60 min-h-screen pb-16">
      {/* Top Department Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white border-b border-slate-800">
        <div className="container mx-auto px-4 py-8 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Verified Multi-Vendor Catalog</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {selectedCategory ? activeCategoryName : "All Marketplace Products"}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">
              Shop authentic inventory backed by atomic stock reservations and 100% buyer escrow protection.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="rounded-xl bg-white/10 backdrop-blur-md border border-white/15 px-4 py-2.5 text-right">
              <p className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">
                Showing Results
              </p>
              <p className="text-lg font-extrabold text-white">
                {loading ? "..." : `${products.length} Products`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="container mx-auto px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Filter Sidebar (3 Cols) */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="rounded-2xl bg-white border border-slate-200/90 p-5 shadow-sm space-y-6 sticky top-28">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2 text-sm font-extrabold text-slate-900">
                  <Filter className="h-4 w-4 text-blue-600" />
                  <span>Filters & Refine</span>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={handleClearAll}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-rose-600 hover:underline"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset All</span>
                  </button>
                )}
              </div>

              {/* Keyword Search */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Keyword or Brand
                </label>
                <form onSubmit={handleSearchSubmit} className="relative">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="e.g. Sony, MacBook, Nike..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-9 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-blue-600"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </form>
              </div>

              {/* Department List */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                  Departments
                </label>
                <div className="space-y-1">
                  <button
                    onClick={() => handleSelectCategory("")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedCategory === ""
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>All Departments</span>
                    {selectedCategory === "" && <Check className="h-3.5 w-3.5" />}
                  </button>

                  {categories.map((cat) => {
                    const active = isCategoryActive(cat);
                    return (
                      <button
                        key={cat._id}
                        onClick={() => handleSelectCategory(cat.slug || cat._id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          active
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span className="truncate">{cat.name}</span>
                        {active && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Range Filter */}
              <div className="border-t border-slate-100 pt-5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                  Price Range (INR)
                </label>
                <div className="space-y-1.5">
                  {PRICE_RANGES.map((range) => {
                    const active = selectedPriceRange === range.id;
                    return (
                      <button
                        key={range.id}
                        onClick={() => setSelectedPriceRange(range.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          active
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span>{range.label}</span>
                        {active && <Check className="h-3.5 w-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* Right Main Catalog Area (9 Cols) */}
          <div className="lg:col-span-9 space-y-6">
            {/* Active Filters & Sort Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white border border-slate-200/90 p-4 shadow-sm">
              {/* Active Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {!hasActiveFilters ? (
                  <span className="text-xs font-medium text-slate-500">
                    Showing all verified flagship listings
                  </span>
                ) : (
                  <>
                    <span className="text-xs font-bold text-slate-700 mr-1">Active:</span>
                    {selectedCategory && (
                      <span className="inline-flex items-center space-x-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-bold text-blue-700">
                        <span>Dept: {activeCategoryName}</span>
                        <button
                          onClick={() => handleSelectCategory("")}
                          className="hover:text-blue-900"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    )}
                    {searchQuery && (
                      <span className="inline-flex items-center space-x-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-700">
                        <span>Search: &ldquo;{searchQuery}&rdquo;</span>
                        <button
                          onClick={() => {
                            setSearchQuery("");
                            setSearchInput("");
                            updateUrlParams(selectedCategory, "");
                          }}
                          className="hover:text-indigo-900"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    )}
                    {selectedPriceRange !== "all" && (
                      <span className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
                        <span>
                          {PRICE_RANGES.find((r) => r.id === selectedPriceRange)?.label}
                        </span>
                        <button
                          onClick={() => setSelectedPriceRange("all")}
                          className="hover:text-emerald-900"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center space-x-2 self-end sm:self-auto flex-shrink-0">
                <SlidersHorizontal className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-600">Sort by:</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                  className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                >
                  <option value="newest">Newest Arrivals</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, idx) => (
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
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/80 shadow-sm max-w-lg mx-auto p-8">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <PackageX className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  No Matching Products Found
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
                  We couldn&apos;t find any products matching your current department, keyword, or price filter.
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={handleClearAll}
                    className="mt-5 inline-flex items-center space-x-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset All Filters</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
