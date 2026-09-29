"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import {
    AlertCircle,
    ArrowRight,
    Check,
    Heart,
    HeartOff,
    ShoppingBag,
    Trash2,
} from "lucide-react";

import { AnimatePresence, motion } from "framer-motion";

/* ============================================================================
   CONSTANTS
============================================================================ */

const PRODUCT_IMAGE_BASE_URL =
    "https://api.printinghouseujjain.in/assets/products/";

/* ============================================================================
   TYPES
============================================================================ */

interface WishlistProduct {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    image?: string;
    badge?: string;
    category?: string;
    description?: string;
}

interface RawWishlistItem {
    id?: string | number;
    product_id?: string | number;
    productId?: string | number;

    /* Some backends may return the product directly */
    name?: string;
    selling_price?: string | number;
    market_price?: string | number;
    primary_photo_path?: string;
    description?: string;
    category?: string;
    badge?: string;

    product?: {
        id?: string | number;
        name?: string;
        selling_price?: string | number;
        market_price?: string | number;
        primary_photo_path?: string;
        description?: string;
        category?: string;
        badge?: string;
    };
}

interface Product {
    id?: string | number;
    name?: string;
    description?: string;
    primary_photo_path?: string;
    other_photos_paths?: string;
    market_price?: string | number;
    selling_price?: string | number;
    reseller_price?: string | number;
    category_ids?: string;
    occasion_ids?: string;
    in_stock?: string;
    sold?: string | number;
    keywords?: string;
    created_at?: string;
    badge?: string;
    category?: string;
}

interface WishlistResponse {
    data?: RawWishlistItem[];
    items?: RawWishlistItem[];
    wishlist?: RawWishlistItem[];
    message?: string;
    status?: number;
}

interface ProductResponse {
    status?: number;
    message?: string;
    product?: Product;
    data?: Product | Product[];
    products?: Product[];
}

/* ============================================================================
   IMAGE
============================================================================ */

function getProductImage(photoPath?: string): string | undefined {
    if (!photoPath) {
        return undefined;
    }

    if (
        photoPath.startsWith("http://") ||
        photoPath.startsWith("https://")
    ) {
        return photoPath;
    }

    const cleanPath = photoPath.replace(/^\/+/, "");

    return `${PRODUCT_IMAGE_BASE_URL}${cleanPath}`;
}

/* ============================================================================
   EXTRACT PRODUCT
============================================================================ */

function extractProduct(data: ProductResponse): Product | null {
    if (data.product && typeof data.product === "object") {
        return data.product;
    }

    if (
        data.data &&
        !Array.isArray(data.data) &&
        typeof data.data === "object"
    ) {
        return data.data;
    }

    if (Array.isArray(data.products) && data.products.length > 0) {
        return data.products[0];
    }

    if (Array.isArray(data.data) && data.data.length > 0) {
        return data.data[0];
    }

    return null;
}

/* ============================================================================
   NORMALIZE WISHLIST ITEM
============================================================================ */

function normalizeWishlistItem(
    raw: RawWishlistItem,
): WishlistProduct | null {
    const id = String(
        raw.product_id ??
            raw.productId ??
            raw.product?.id ??
            raw.id ??
            "",
    );

    if (!id) {
        return null;
    }

    const nestedProduct = raw.product;

    const price = Number(
        nestedProduct?.selling_price ?? raw.selling_price ?? 0,
    );

    const originalPrice = Number(
        nestedProduct?.market_price ?? raw.market_price ?? 0,
    );

    return {
        id,
        name: nestedProduct?.name ?? raw.name ?? "Untitled product",

        price: Number.isFinite(price) ? price : 0,

        originalPrice:
            Number.isFinite(originalPrice) && originalPrice > price
                ? originalPrice
                : undefined,

        image: getProductImage(
            nestedProduct?.primary_photo_path ??
                raw.primary_photo_path,
        ),

        description:
            nestedProduct?.description ?? raw.description,

        category:
            nestedProduct?.category ?? raw.category,

        badge:
            nestedProduct?.badge ?? raw.badge,
    };
}

/* ============================================================================
   PAGE
============================================================================ */

export default function WishlistPage() {
    const [wishlist, setWishlist] = useState<WishlistProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [removingId, setRemovingId] = useState<string | null>(null);

    const [successMessage, setSuccessMessage] = useState("");

    /* =========================================================================
       ERROR HELPER
    ========================================================================= */

    const showError = (message: string) => {
        setError(message);

        setTimeout(() => {
            setError("");
        }, 3000);
    };

    /* =========================================================================
       FETCH PRODUCT
    ========================================================================= */

    const fetchProductDetails = async (
        productId: string,
    ): Promise<Product | null> => {
        try {
            const response = await fetch(
                `/api/products?product_id=${encodeURIComponent(productId)}`,
                {
                    method: "GET",
                    cache: "no-store",
                },
            );

            const data: ProductResponse = await response
                .json()
                .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data?.message ??
                        `Unable to fetch product ${productId}.`,
                );
            }

            return extractProduct(data);
        } catch (err) {
            console.error(
                `Fetch product ${productId} failed:`,
                err,
            );

            return null;
        }
    };

    /* =========================================================================
       FETCH WISHLIST
    ========================================================================= */

    const fetchWishlist = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            console.log("=================================");
            console.log("FETCH WISHLIST");
            console.log("=================================");

            const response = await fetch("/api/wishlist", {
                method: "GET",
                credentials: "include",
                cache: "no-store",
            });

            const responseText = await response.text();

            let data: WishlistResponse = {};

            try {
                data = responseText
                    ? JSON.parse(responseText)
                    : {};
            } catch {
                data = {
                    message:
                        responseText ||
                        "Invalid response from server.",
                };
            }

            console.log(
                "WISHLIST STATUS:",
                response.status,
            );

            console.log(
                "WISHLIST RESPONSE:",
                data,
            );

            if (!response.ok) {
                throw new Error(
                    data?.message ??
                        "Unable to load your wishlist. Please try again.",
                );
            }

            const rawItems =
                data.data ??
                data.items ??
                data.wishlist ??
                [];

            const normalizedItems = rawItems
                .map(normalizeWishlistItem)
                .filter(
                    (
                        item,
                    ): item is WishlistProduct =>
                        item !== null,
                );

            /*
             * Fetch current product information so the
             * wishlist always displays current product
             * details such as price, image and description.
             */
            const itemsWithDetails = await Promise.all(
                normalizedItems.map(
                    async (wishlistItem) => {
                        const product =
                            await fetchProductDetails(
                                wishlistItem.id,
                            );

                        if (!product) {
                            return wishlistItem;
                        }

                        const price = Number(
                            product.selling_price ??
                                wishlistItem.price ??
                                0,
                        );

                        const originalPrice =
                            Number(
                                product.market_price ??
                                    wishlistItem.originalPrice ??
                                    0,
                            );

                        return {
                            ...wishlistItem,

                            name:
                                product.name ??
                                wishlistItem.name,

                            price:
                                Number.isFinite(price)
                                    ? price
                                    : 0,

                            originalPrice:
                                Number.isFinite(
                                    originalPrice,
                                ) &&
                                originalPrice > price
                                    ? originalPrice
                                    : undefined,

                            image:
                                getProductImage(
                                    product.primary_photo_path,
                                ) ??
                                wishlistItem.image,

                            description:
                                product.description ??
                                wishlistItem.description,

                            category:
                                product.category ??
                                wishlistItem.category,

                            badge:
                                product.badge ??
                                wishlistItem.badge,
                        };
                    },
                ),
            );

            setWishlist(itemsWithDetails);
        } catch (err) {
            console.error(
                "Fetch wishlist failed:",
                err,
            );

            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to load your wishlist. Please try again.",
            );
        } finally {
            setLoading(false);
        }
    }, []);

    /* =========================================================================
       INITIAL FETCH
    ========================================================================= */

    useEffect(() => {
        void fetchWishlist();
    }, [fetchWishlist]);

    /* =========================================================================
       REMOVE FROM WISHLIST
    ========================================================================= */

    const removeFromWishlist = async (
        productId: string,
    ): Promise<boolean> => {
        const removedItem = wishlist.find(
            (item) => item.id === productId,
        );

        const removedIndex = wishlist.findIndex(
            (item) => item.id === productId,
        );

        /* Optimistic removal */
        setWishlist((current) =>
            current.filter(
                (item) => item.id !== productId,
            ),
        );

        setRemovingId(productId);

        try {
            const response = await fetch(
                "/api/wishlist/remove",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        productId,
                    }),
                },
            );

            const data = await response
                .json()
                .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data?.message ??
                        "Unable to remove item from wishlist.",
                );
            }

            setSuccessMessage(
                "Removed from your wishlist.",
            );

            setTimeout(() => {
                setSuccessMessage("");
            }, 2200);

            return true;
        } catch (err) {
            console.error(
                "Remove wishlist failed:",
                err,
            );

            /*
             * Restore item if backend failed.
             */
            if (removedItem) {
                setWishlist((current) => {
                    const next = [...current];

                    next.splice(
                        removedIndex,
                        0,
                        removedItem,
                    );

                    return next;
                });
            }

            showError(
                err instanceof Error
                    ? err.message
                    : "Unable to remove item from wishlist.",
            );

            return false;
        } finally {
            setRemovingId(null);
        }
    };

    /* =========================================================================
       LOADING
    ========================================================================= */

    if (loading) {
        return (
            <main className="min-h-screen bg-[#F8F5F2]">
                <WishlistHeader />

                <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {Array.from({
                            length: 4,
                        }).map((_, index) => (
                            <div
                                key={index}
                                className="overflow-hidden rounded-2xl border border-[#E7D5C8] bg-white"
                            >
                                <div className="aspect-square animate-pulse bg-[#EDE5DF]" />

                                <div className="space-y-3 p-5">
                                    <div className="h-3 w-1/3 animate-pulse rounded bg-[#EDE5DF]" />

                                    <div className="h-5 animate-pulse rounded bg-[#EDE5DF]" />

                                    <div className="h-5 w-1/2 animate-pulse rounded bg-[#EDE5DF]" />

                                    <div className="mt-4 h-11 animate-pulse rounded-xl bg-[#EDE5DF]" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        );
    }

    /* =========================================================================
       ERROR
    ========================================================================= */

    if (error && wishlist.length === 0) {
        return (
            <main className="min-h-screen bg-[#F8F5F2]">
                <WishlistHeader />

                <div className="mx-auto max-w-3xl px-5 py-16 sm:px-6 lg:px-8">
                    <div className="rounded-3xl border border-red-200 bg-white px-6 py-14 text-center shadow-sm sm:px-12">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
                            <AlertCircle
                                size={32}
                                className="text-red-500"
                                strokeWidth={1.7}
                            />
                        </div>

                        <h1 className="mt-6 text-2xl font-bold tracking-tight text-[#2E2E2E]">
                            Couldn't load your wishlist
                        </h1>

                        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#2E2E2E]/55">
                            {error}
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                void fetchWishlist()
                            }
                            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#85161B] px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#721318] hover:shadow-lg"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    /* =========================================================================
       MAIN
    ========================================================================= */

    return (
        <main className="min-h-screen bg-[#F8F5F2]">
            <WishlistHeader />

            {/* SUCCESS MESSAGE */}
            <AnimatePresence>
                {successMessage && (
                    <motion.div
                        initial={{
                            opacity: 0,
                            y: -10,
                        }}
                        animate={{
                            opacity: 1,
                            y: 0,
                        }}
                        exit={{
                            opacity: 0,
                            y: -10,
                        }}
                        className="fixed right-5 top-5 z-[120]"
                    >
                        <div className="flex items-center gap-2 rounded-xl bg-[#202020] px-4 py-3 text-sm font-medium text-white shadow-xl">
                            <Check size={16} />

                            {successMessage}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ERROR */}
            {error && (
                <div className="mx-auto mt-5 max-w-7xl px-5 sm:px-6 lg:px-8">
                    <div
                        role="alert"
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                        {error}
                    </div>
                </div>
            )}

            <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
                {/* PAGE INTRO */}
                <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#85161B]/70">
                            Your favourites
                        </p>

                        <h1 className="text-3xl font-bold tracking-tight text-[#2E2E2E] sm:text-4xl lg:text-[42px]">
                            My Wishlist
                        </h1>

                        <p className="mt-2 text-sm text-[#2E2E2E]/55 sm:text-base">
                            Keep the gifts you love close
                            until you're ready to make
                            them yours.
                        </p>
                    </div>

                    {wishlist.length > 0 && (
                        <div className="flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-medium text-[#2E2E2E]/60 shadow-sm">
                            <Heart
                                size={14}
                                className="text-[#85161B]"
                                fill="currentColor"
                            />

                            {wishlist.length}{" "}
                            {wishlist.length === 1
                                ? "item"
                                : "items"}
                        </div>
                    )}
                </div>

                {/* EMPTY */}
                {wishlist.length === 0 ? (
                    <EmptyWishlist />
                ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        <AnimatePresence mode="popLayout">
                            {wishlist.map(
                                (
                                    product,
                                    index,
                                ) => (
                                    <WishlistCard
                                        key={
                                            product.id
                                        }
                                        product={
                                            product
                                        }
                                        index={
                                            index
                                        }
                                        removing={
                                            removingId ===
                                            product.id
                                        }
                                        onRemove={() =>
                                            void removeFromWishlist(
                                                product.id,
                                            )
                                        }
                                    />
                                ),
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {wishlist.length > 0 && (
                    <div className="mx-auto mt-12 flex max-w-xl items-center justify-center gap-3 text-center">
                        <div className="h-px flex-1 bg-[#E7D5C8]" />

                        <span className="px-2 text-xs font-medium text-[#2E2E2E]/40">
                            Save it today, gift it
                            when the moment comes
                        </span>

                        <div className="h-px flex-1 bg-[#E7D5C8]" />
                    </div>
                )}
            </div>
        </main>
    );
}

/* ============================================================================
   HEADER
============================================================================ */

function WishlistHeader() {
    return (
        <section className="border-b border-[#E7D5C8] bg-white">
            <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4 sm:px-6 lg:px-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F7D6BF]/50 text-[#85161B]">
                    <Heart
                        size={19}
                        strokeWidth={1.8}
                    />
                </div>

                <div>
                    <p className="text-sm font-semibold text-[#2E2E2E]">
                        Your Wishlist
                    </p>

                    <p className="text-xs text-[#2E2E2E]/45">
                        Your handpicked favourites
                    </p>
                </div>
            </div>
        </section>
    );
}

/* ============================================================================
   WISHLIST CARD
============================================================================ */

interface WishlistCardProps {
    product: WishlistProduct;
    index: number;
    removing: boolean;
    onRemove: () => void;
}

function WishlistCard({
    product,
    index,
    removing,
    onRemove,
}: WishlistCardProps) {
    const hasDiscount =
        product.originalPrice !== undefined &&
        product.originalPrice > product.price;

    return (
        <motion.article
            layout
            initial={{
                opacity: 0,
                y: 20,
            }}
            animate={{
                opacity: 1,
                y: 0,
            }}
            exit={{
                opacity: 0,
                scale: 0.95,
            }}
            transition={{
                duration: 0.35,
                delay: index * 0.05,
            }}
            className="group overflow-hidden rounded-2xl border border-[#E7D5C8] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
        >
            {/* IMAGE */}
            <Link
                href={`/product/${product.id}`}
                aria-label={`View ${product.name}`}
                className="block"
            >
                <div className="relative aspect-square overflow-hidden bg-[#F2E9E2]">
                    {product.image ? (
                        <img
                            src={product.image}
                            alt={product.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center">
                            <ShoppingBag
                                size={40}
                                className="text-[#85161B]/25"
                                strokeWidth={1.5}
                            />
                        </div>
                    )}

                    {/* BADGE */}
                    {product.badge && (
                        <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#85161B] shadow-sm backdrop-blur-sm">
                            {product.badge}
                        </div>
                    )}

                    {/* REMOVE FROM WISHLIST */}
                    <button
                        type="button"
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onRemove();
                        }}
                        disabled={removing}
                        aria-label={`Remove ${product.name} from wishlist`}
                        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#85161B] shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-[#85161B] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {removing ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#85161B]/25 border-t-[#85161B]" />
                        ) : (
                            <Trash2 size={15} />
                        )}
                    </button>
                </div>
            </Link>

            {/* CONTENT */}
            <div className="p-4 sm:p-5">
                {product.category && (
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#85161B]/60">
                        {product.category}
                    </p>
                )}

                <Link
                    href={`/product/${product.id}`}
                    className="block"
                    aria-label={`View ${product.name}`}
                >
                    <h2 className="line-clamp-2 min-h-[44px] text-base font-semibold leading-snug text-[#2E2E2E] transition-colors hover:text-[#85161B]">
                        {product.name}
                    </h2>
                </Link>

                {product.description && (
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#2E2E2E]/45">
                        {product.description}
                    </p>
                )}

                {/* PRICE */}
                <div className="mt-3 flex items-center gap-2">
                    <span className="text-lg font-bold text-[#85161B]">
                        ₹
                        {product.price.toLocaleString(
                            "en-IN",
                            {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                            },
                        )}
                    </span>

                    {hasDiscount && (
                        <span className="text-xs text-[#2E2E2E]/35 line-through">
                            ₹
                            {product.originalPrice?.toLocaleString(
                                "en-IN",
                                {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 2,
                                },
                            )}
                        </span>
                    )}
                </div>

                {/* VIEW PRODUCT */}
                <Link
                    href={`/product/${product.id}`}
                    className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#E7D5C8] text-xs font-semibold text-[#85161B] transition-all duration-200 hover:bg-[#F8F5F2]"
                >
                    View product
                    <ArrowRight size={15} />
                </Link>
            </div>
        </motion.article>
    );
}

/* ============================================================================
   EMPTY WISHLIST
============================================================================ */

function EmptyWishlist() {
    return (
        <motion.div
            initial={{
                opacity: 0,
                y: 15,
            }}
            animate={{
                opacity: 1,
                y: 0,
            }}
            className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-[#DCCBC0] bg-white px-6 pt-[112px] text-center sm:pt-[120px]"
        >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#F7D6BF]/40 text-[#85161B]">
                <HeartOff
                    size={32}
                    strokeWidth={1.5}
                />
            </div>

            <h2 className="mt-6 text-2xl font-bold text-[#2E2E2E] sm:text-3xl">
                Your wishlist is waiting
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-[#2E2E2E]/55 sm:text-base">
                Save the gifts you love and come back
                whenever you're ready to make someone's
                day a little more special.
            </p>

            <Link
                href="/shop"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#85161B] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#721318] hover:shadow-md"
            >
                <ShoppingBag size={16} />

                Start Shopping

                <ArrowRight size={16} />
            </Link>
        </motion.div>
    );
}