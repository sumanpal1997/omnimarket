"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { Layers, ChevronRight, Laptop, Headphones, Shirt, Sparkles, Tag, ArrowRight } from "lucide-react";

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string | null;
  isActive: boolean;
}

export default function CategoriesPage() {
  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await apiClient.get("/categories");
      return response.data?.data?.categories || [];
    },
  });

  const getCategoryIcon = (slug: string) => {
    if (slug.includes("electron") || slug.includes("laptop") || slug.includes("comput")) {
      return <Laptop className="h-6 w-6 text-blue-600" />;
    }
    if (slug.includes("audio") || slug.includes("headphone") || slug.includes("music")) {
      return <Headphones className="h-6 w-6 text-indigo-600" />;
    }
    if (slug.includes("fashion") || slug.includes("cloth") || slug.includes("apparel")) {
      return <Shirt className="h-6 w-6 text-rose-600" />;
    }
    return <Layers className="h-6 w-6 text-slate-600" />;
  };

  // Group root categories and subcategories
  const rootCategories = categories.filter((cat) => !cat.parentId);
  const subCategoriesByParent = categories.reduce<Record<string, Category[]>>((acc, cat) => {
    if (cat.parentId) {
      if (!acc[cat.parentId]) acc[cat.parentId] = [];
      acc[cat.parentId].push(cat);
    }
    return acc;
  }, {});

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center space-x-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-blue-600 transition-colors">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-semibold text-slate-900">Categories</span>
      </nav>

      {/* Header Banner */}
      <div className="mb-10 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-8 text-white shadow-md">
        <div className="flex items-center space-x-2 text-blue-300 mb-2">
          <Sparkles className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-wider">Catalog Directory</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Browse All Categories</h1>
        <p className="mt-2 max-w-2xl text-slate-300 text-sm sm:text-base">
          Explore products across thousands of verified merchants organized by specialized categories and departments.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 rounded-xl bg-slate-200 animate-pulse" />
          ))}
        </div>
      ) : rootCategories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rootCategories.map((root) => {
            const subs = subCategoriesByParent[root._id] || [];
            return (
              <div
                key={root._id}
                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 group-hover:bg-blue-50 transition-colors">
                      {getCategoryIcon(root.slug)}
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      <Tag className="h-3 w-3" />
                      {subs.length > 0 ? `${subs.length} subcategories` : "Department"}
                    </span>
                  </div>

                  <Link href={`/products?category=${root.slug}`}>
                    <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {root.name}
                    </h2>
                  </Link>

                  {root.description && (
                    <p className="mt-2 text-xs text-slate-500 line-clamp-2">{root.description}</p>
                  )}

                  {subs.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {subs.map((sub) => (
                        <Link
                          key={sub._id}
                          href={`/products?category=${sub.slug}`}
                          className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <Link
                    href={`/products?category=${root.slug}`}
                    className="inline-flex items-center space-x-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <span>Explore {root.name}</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Fallback Curated Categories when DB is empty */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              name: "Electronics",
              slug: "electronics",
              desc: "Laptops, workstations, smartphones, cameras, and consumer technology.",
              subs: ["Laptops", "Smartphones", "Audio"],
              icon: <Laptop className="h-6 w-6 text-blue-600" />,
            },
            {
              name: "Audio & Headphones",
              slug: "audio",
              desc: "Noise-cancelling headphones, high-fidelity earbuds, and spatial audio systems.",
              subs: ["Noise Cancelling", "True Wireless", "Soundbars"],
              icon: <Headphones className="h-6 w-6 text-indigo-600" />,
            },
            {
              name: "Fashion & Apparel",
              slug: "fashion",
              desc: "Men's and women's clothing, performance sportswear, sneakers, and accessories.",
              subs: ["Footwear", "Activewear", "Outerwear"],
              icon: <Shirt className="h-6 w-6 text-rose-600" />,
            },
          ].map((cat) => (
            <div
              key={cat.slug}
              className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 group-hover:bg-blue-50 transition-colors">
                    {cat.icon}
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    <Tag className="h-3 w-3" />
                    Department
                  </span>
                </div>

                <Link href={`/products?category=${cat.slug}`}>
                  <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {cat.name}
                  </h2>
                </Link>

                <p className="mt-2 text-xs text-slate-500 line-clamp-2">{cat.desc}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {cat.subs.map((s) => (
                    <Link
                      key={s}
                      href={`/products?category=${cat.slug}`}
                      className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      {s}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link
                  href={`/products?category=${cat.slug}`}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <span>Explore {cat.name}</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
