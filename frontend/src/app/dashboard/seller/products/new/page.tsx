"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { productService, Category } from "@/services/product.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Plus, Trash2, ArrowLeft, AlertCircle, Package } from "lucide-react";
import Link from "next/link";

interface VariantFormItem {
  sku: string;
  title: string;
  priceRupees: number;
  compareAtRupees?: number;
  stock: number;
}

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [variants, setVariants] = useState<VariantFormItem[]>([
    { sku: "", title: "Default", priceRupees: 0, stock: 10 },
  ]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    productService.getCategories().then((cats) => {
      setCategories(cats);
      if (cats.length > 0) setCategoryId(cats[0]._id);
    });
  }, []);

  const addVariant = () => {
    setVariants([
      ...variants,
      { sku: "", title: `Option ${variants.length + 1}`, priceRupees: 0, stock: 10 },
    ]);
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 1) return;
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof VariantFormItem, val: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: val };
    setVariants(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!title || !description || !categoryId || !imageUrl) {
      setServerError("Please complete all required product fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title,
        description,
        categoryId,
        images: [imageUrl],
        variants: variants.map((v) => ({
          sku: v.sku.toUpperCase().trim(),
          title: v.title,
          priceMinor: Math.round(Number(v.priceRupees) * 100), // Convert to minor units
          compareAtPriceMinor: v.compareAtRupees
            ? Math.round(Number(v.compareAtRupees) * 100)
            : undefined,
          stock: Number(v.stock),
          attributes: {},
          images: [],
        })),
      };

      await productService.createProduct(payload);
      router.push("/dashboard/seller");
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message || "Failed to create product. Check your inputs.";
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 max-w-4xl space-y-6">
      <div className="flex items-center space-x-2 text-sm text-slate-500">
        <Link href="/dashboard/seller" className="hover:text-blue-600 flex items-center space-x-1">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight sm:text-3xl">
          Create New Product
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Add product information and define SKU variants. Newly created products begin in DRAFT status.
        </p>
      </div>

      {serverError && (
        <div className="flex items-center space-x-2 rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Details</CardTitle>
            <CardDescription>Product title, category, and main storefront photo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Product Title"
              placeholder="e.g. Wireless Noise-Cancelling Headphones"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Main Image URL"
              placeholder="https://images.unsplash.com/..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Description</label>
              <textarea
                rows={4}
                placeholder="Detailed specifications, features, and warranty..."
                className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Variants & Stock */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Variants & Inventory</CardTitle>
              <CardDescription>Define SKUs, selling prices, and initial physical stock.</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addVariant}
              className="flex items-center space-x-1"
            >
              <Plus className="h-4 w-4" />
              <span>Add Variant</span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {variants.map((v, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-5 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 items-end"
              >
                <div className="sm:col-span-1">
                  <Input
                    label="SKU"
                    placeholder="HD-01"
                    value={v.sku}
                    onChange={(e) => updateVariant(idx, "sku", e.target.value)}
                    required
                  />
                </div>
                <div className="sm:col-span-1">
                  <Input
                    label="Title"
                    placeholder="Black / Standard"
                    value={v.title}
                    onChange={(e) => updateVariant(idx, "title", e.target.value)}
                    required
                  />
                </div>
                <div className="sm:col-span-1">
                  <Input
                    label="Price (₹)"
                    type="number"
                    min="1"
                    placeholder="2999"
                    value={v.priceRupees || ""}
                    onChange={(e) => updateVariant(idx, "priceRupees", e.target.value)}
                    required
                  />
                </div>
                <div className="sm:col-span-1">
                  <Input
                    label="Initial Stock"
                    type="number"
                    min="0"
                    placeholder="25"
                    value={v.stock || ""}
                    onChange={(e) => updateVariant(idx, "stock", e.target.value)}
                    required
                  />
                </div>
                <div className="sm:col-span-1 flex justify-end pb-1">
                  <button
                    type="button"
                    onClick={() => removeVariant(idx)}
                    disabled={variants.length <= 1}
                    className="p-2 text-slate-400 hover:text-red-600 disabled:opacity-30 rounded-lg hover:bg-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-3">
          <Link href="/dashboard/seller">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" size="lg" isLoading={isSubmitting} className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Save Product Draft</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
