"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { productService, Product, ProductVariant } from "@/services/product.service";
import { reviewService, ReviewItem, ReviewAggregate } from "@/services/review.service";
import { formatMinorUnitsToCurrency } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ShoppingBag,
  Star,
  Store,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Loader2,
  ThumbsUp,
  MessageSquare,
  X,
} from "lucide-react";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const { openCartDrawer } = useUIStore();
  const { user } = useAuthStore();
  const { addItem } = useCartStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Reviews state
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [aggregate, setAggregate] = useState<ReviewAggregate | null>(null);
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined);
  const [canReview, setCanReview] = useState(false);
  const [eligibilityReason, setEligibilityReason] = useState<string | undefined>(undefined);

  // Review submission modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [titleInput, setTitleInput] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);
  const [votingId, setVotingId] = useState<string | null>(null);

  const loadReviews = async (productId: string, filterRating?: number) => {
    try {
      const data = await reviewService.getProductReviews(productId, 1, 10, filterRating);
      setReviews(data.reviews);
      setAggregate(data.aggregate);
    } catch (err) {
      console.error("Failed to load reviews:", err);
    }
  };

  const checkEligibility = async (productId: string) => {
    if (!user) {
      setCanReview(false);
      setEligibilityReason("Sign in to review verified purchases.");
      return;
    }
    try {
      const result = await reviewService.checkEligibility(productId);
      setCanReview(result.canReview);
      setEligibilityReason(result.reason);
    } catch {
      setCanReview(false);
    }
  };

  useEffect(() => {
    productService
      .getBySlug(resolvedParams.slug)
      .then((data) => {
        setProduct(data.product);
        setInventory(data.inventory);
        if (data.product.variants.length > 0) {
          setSelectedVariant(data.product.variants[0]);
          setSelectedImage(
            data.product.images[0] || data.product.variants[0].images[0] || "/placeholder.png"
          );
        }
        loadReviews(data.product._id, ratingFilter);
        checkEligibility(data.product._id);
      })
      .catch((err) => {
        setError(err?.response?.data?.error?.message || "Product not found or unavailable.");
      })
      .finally(() => setLoading(false));
  }, [resolvedParams.slug, user]);

  useEffect(() => {
    if (product) {
      loadReviews(product._id, ratingFilter);
    }
  }, [ratingFilter]);

  const handleSubmitReview = async () => {
    if (!product) return;
    setSubmittingReview(true);
    setReviewError(null);
    try {
      await reviewService.addReview({
        productId: product._id,
        rating: ratingInput,
        title: titleInput,
        comment: commentInput,
      });

      setReviewSuccessMsg("Your review has been verified and published!");
      setIsModalOpen(false);
      setTitleInput("");
      setCommentInput("");
      setRatingInput(5);
      await loadReviews(product._id);
      await checkEligibility(product._id);
    } catch (err: any) {
      setReviewError(err?.response?.data?.error?.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleVoteHelpful = async (reviewId: string) => {
    setVotingId(reviewId);
    try {
      const updated = await reviewService.voteHelpful(reviewId);
      setReviews((prev) =>
        prev.map((r) => (r._id === reviewId ? { ...r, helpfulVotes: updated.helpfulVotes } : r))
      );
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "You have already voted on this review");
    } finally {
      setVotingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <Card className="p-8">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Product Unavailable</h2>
          <p className="text-xs text-slate-500 mt-2">{error || "Unable to display this item."}</p>
          <Link href="/products" className="inline-block mt-4">
            <Button size="sm">Browse All Products</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const availableStock = selectedVariant ? inventory[selectedVariant.sku] ?? 0 : 0;
  const isOutOfStock = availableStock <= 0;

  const handleAddToCart = async () => {
    if (!product || !selectedVariant) return;
    setIsAdding(true);
    setAddError(null);
    try {
      await addItem(product._id, selectedVariant.sku, quantity);
      openCartDrawer();
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        "Failed to add item to cart. Please check stock or try again.";
      setAddError(msg);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 max-w-6xl space-y-12">
      {/* Product Hero & Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Left: Gallery */}
        <div className="space-y-4">
          <div className="aspect-square relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage}
              alt={product.title}
              className="w-full h-full object-cover object-center"
            />
          </div>

          {product.images.length > 1 && (
            <div className="flex space-x-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                    selectedImage === img
                      ? "border-blue-600 ring-2 ring-blue-600/20"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Buy Box & Options */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Badge variant="outline" className="text-xs">
                {product.categoryId?.name || "General"}
              </Badge>
              {product.sellerId && (
                <span className="text-xs text-slate-500 flex items-center space-x-1">
                  <Store className="h-3.5 w-3.5" />
                  <span>Sold by {product.sellerId.storeName}</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {product.title}
            </h1>

            {/* Ratings summary bar */}
            <div className="flex items-center space-x-2 mt-2">
              <div className="flex items-center text-amber-500">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= Math.round(aggregate?.averageRating || product.ratingSummary?.averageRating || 0)
                        ? "fill-current"
                        : "text-slate-200"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-semibold text-slate-700">
                {(aggregate?.averageRating || product.ratingSummary?.averageRating || 0).toFixed(1)}
              </span>
              <span className="text-xs text-slate-400">
                ({aggregate?.totalReviews || product.ratingSummary?.totalReviews || 0} reviews)
              </span>
            </div>
          </div>

          {/* Pricing */}
          <div className="border-t border-b border-slate-100 py-4">
            <div className="flex items-baseline space-x-3">
              <span className="text-3xl font-extrabold text-slate-900">
                {selectedVariant
                  ? formatMinorUnitsToCurrency(selectedVariant.priceMinor)
                  : "Price unavailable"}
              </span>
              {selectedVariant?.compareAtPriceMinor && (
                <span className="text-sm line-through text-slate-400">
                  {formatMinorUnitsToCurrency(selectedVariant.compareAtPriceMinor)}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">Inclusive of all taxes (18% GST included)</p>
          </div>

          {/* Variants Selector */}
          {product.variants.length > 1 && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Options: {selectedVariant?.title}
              </label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => {
                  const isSelected = selectedVariant?.sku === v.sku;
                  return (
                    <button
                      key={v.sku}
                      onClick={() => {
                        setSelectedVariant(v);
                        if (v.images && v.images.length > 0) setSelectedImage(v.images[0]);
                      }}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                        isSelected
                          ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      {v.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock Indicator */}
          <div className="text-xs flex items-center space-x-2">
            {isOutOfStock ? (
              <span className="text-red-600 font-semibold flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" /> Out of stock
              </span>
            ) : availableStock <= 5 ? (
              <span className="text-amber-600 font-semibold">
                Only {availableStock} units left in stock!
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" /> In Stock ({availableStock} units available)
              </span>
            )}
          </div>

          {/* Quantity & Buy Box */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-4">
              <div className="flex items-center border border-slate-200 rounded-lg">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                  disabled={quantity <= 1 || isOutOfStock}
                >
                  -
                </button>
                <span className="px-4 py-2 text-sm font-medium text-slate-900">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                  disabled={quantity >= availableStock || isOutOfStock}
                >
                  +
                </button>
              </div>

              <Button
                size="lg"
                disabled={isOutOfStock || isAdding}
                onClick={handleAddToCart}
                className="flex-1 flex items-center justify-center space-x-2"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Adding to Cart...</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-5 w-5" />
                    <span>{isOutOfStock ? "Out of Stock" : "Add to Cart"}</span>
                  </>
                )}
              </Button>
            </div>

            {addError && (
              <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{addError}</span>
              </div>
            )}
          </div>

          {/* Value Props */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex items-center space-x-2">
              <Truck className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span>Fast Merchant Dispatch</span>
            </div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span>Buyer Protection</span>
            </div>
            <div className="flex items-center space-x-2">
              <RotateCcw className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span>7-Day Return Guarantee</span>
            </div>
          </div>

          {/* Description */}
          <div className="pt-6 border-t border-slate-100">
            <h3 className="text-base font-semibold text-slate-900 mb-2">Description</h3>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION: RATINGS & REVIEWS */}
      <div className="pt-10 border-t border-slate-200 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Customer Ratings & Reviews
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified marketplace purchase feedback from verified buyers
            </p>
          </div>

          {canReview ? (
            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-2 text-xs"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Write a Review</span>
            </Button>
          ) : (
            <span className="text-xs text-slate-400 italic">
              {eligibilityReason || "Only delivered buyers can review."}
            </span>
          )}
        </div>

        {reviewSuccessMsg && (
          <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <span>{reviewSuccessMsg}</span>
          </div>
        )}

        {/* Aggregate Ratings Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-2xl bg-slate-50/80 border border-slate-200">
          <div className="flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-slate-200 pb-4 md:pb-0 md:pr-6">
            <span className="text-5xl font-black text-slate-900">
              {(aggregate?.averageRating || 0).toFixed(1)}
            </span>
            <div className="flex items-center text-amber-500 my-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-5 w-5 ${
                    star <= Math.round(aggregate?.averageRating || 0)
                      ? "fill-current"
                      : "text-slate-200"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Based on {aggregate?.totalReviews || 0} verified reviews
            </p>
          </div>

          {/* Star Histogram Bars */}
          <div className="col-span-2 space-y-2 text-xs justify-center flex flex-col">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = aggregate?.starBreakdown[stars as 1 | 2 | 3 | 4 | 5] || 0;
              const total = aggregate?.totalReviews || 1;
              const pct = aggregate?.totalReviews ? Math.round((count / total) * 100) : 0;
              return (
                <div key={stars} className="flex items-center space-x-3">
                  <span className="w-10 text-slate-600 font-medium">{stars} stars</span>
                  <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-slate-400">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rating Filter Tabs */}
        <div className="flex gap-2 text-xs border-b border-slate-200 pb-2">
          <button
            onClick={() => setRatingFilter(undefined)}
            className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
              ratingFilter === undefined
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Reviews
          </button>
          {[5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              onClick={() => setRatingFilter(star)}
              className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
                ratingFilter === star
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {star} Stars
            </button>
          ))}
        </div>

        {/* Reviews Feed */}
        {reviews.length === 0 ? (
          <div className="p-8 text-center border border-dashed rounded-xl text-xs text-slate-400">
            No reviews yet matching this filter.
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <Card key={r._id} className="p-5 space-y-3 border border-slate-200/90 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                      {r.customerId?.firstName?.[0] || "U"}
                      {r.customerId?.lastName?.[0] || ""}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-xs text-slate-900">
                          {r.customerId?.firstName} {r.customerId?.lastName}
                        </span>
                        {r.isVerifiedPurchase && (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0">
                            Verified Purchase
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex text-amber-500">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${
                          s <= r.rating ? "fill-current" : "text-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <h4 className="font-bold text-slate-900">{r.title}</h4>
                  <p className="text-slate-600 leading-relaxed">{r.comment}</p>
                </div>

                {r.images && r.images.length > 0 && (
                  <div className="flex space-x-2 pt-1">
                    {r.images.map((img, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={img}
                        alt="review attachment"
                        className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                      />
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <button
                    onClick={() => handleVoteHelpful(r._id)}
                    disabled={votingId === r._id}
                    className="flex items-center space-x-1.5 hover:text-blue-600 transition-colors"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    <span>Helpful ({r.helpfulVotes})</span>
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Write a Review Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <CardTitle className="text-base">Write a Customer Review</CardTitle>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {reviewError && (
              <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                {reviewError}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Overall Rating</label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRatingInput(star)}
                      className="p-1 text-amber-500 focus:outline-none"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= ratingInput ? "fill-current" : "text-slate-200"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="font-bold text-slate-700 ml-2">{ratingInput} Stars</span>
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Headline / Title</label>
                <Input
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="e.g. Best quality for the price"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Your Review</label>
                <textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  rows={4}
                  placeholder="What did you like or dislike? How does it perform?"
                  className="w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                disabled={submittingReview}
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={submittingReview || !titleInput || !commentInput}
                onClick={handleSubmitReview}
              >
                {submittingReview ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Review</span>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
