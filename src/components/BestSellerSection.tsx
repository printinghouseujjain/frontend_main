"use client";

import React, { useEffect, useState } from "react";

import HorizontalScrollSection from "./HorizontalScrollSection";
import ProductCard from "./ProductCard";

const API_URL = "https://api.printinghouseujjain.in";
const PRODUCT_IMAGE_URL = `${API_URL}/assets/products/`;

interface ApiProduct {
    id: number | string;
    name: string;
    description?: string | null;
    primary_photo_path?: string | null;
    other_photos_paths?: string | null;
    market_price?: number | string | null;
    selling_price?: number | string | null;
    reseller_price?: number | string | null;
    category_ids?: string | null;
    occasion_ids?: string | null;
    in_stock?: string | boolean | number | null;
    sold?: number | string | null;
    varients?: string | null;
    customize_reqs?: string | string[] | null;
    keywords?: string | null;
    wishlisted?: string | boolean | number | null;
}

interface Product {
    id: string;
    name: string;
    price: number;
    original?: number;
    image: string;
    description?: string;
    customizeReqs?: string | string[] | null;

    /*
     * Mapped from the backend's in_stock value into
     * the boolean ProductCard checks.
     */
    inStock: boolean;

    badge?: string;
    tag?: string;

    /*
     * Mapped from the backend's wishlisted value
     * into a real boolean for ProductCard.
     */
    wishlisted: boolean;
}

/**
 * Build product image URL.
 *
 * Backend example:
 * primary_photo_path: "2_1.png"
 *
 * Final:
 * https://api.printinghouseujjain.in/assets/products/2_1.png
 */
function getProductImage(photoPath?: string | null): string {
    if (!photoPath) {
        return "";
    }

    const cleanPath = String(photoPath)
        .trim()
        .replace(/^\/+/, "");

    if (!cleanPath) {
        return "";
    }

    // If backend already returns a complete URL
    if (
        cleanPath.startsWith("http://") ||
        cleanPath.startsWith("https://")
    ) {
        return cleanPath;
    }

    return `${PRODUCT_IMAGE_URL}${cleanPath}`;
}

/**
 * Convert the backend's in_stock value into
 * the boolean expected by ProductCard.
 */
function normalizeStock(value: unknown): boolean {
    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "number") {
        return value === 1;
    }

    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();

        return [
            "available",
            "in_stock",
            "in stock",
            "true",
            "1",
            "yes",
            "y",
        ].includes(normalized);
    }

    return false;
}

/**
 * Convert the backend's wishlisted value into
 * the boolean expected by ProductCard.
 *
 * Supports values such as:
 * true
 * "true"
 * "1"
 * 1
 * "yes"
 */
function normalizeWishlisted(value: unknown): boolean {
    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "number") {
        return value === 1;
    }

    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();

        return ["true", "1", "yes", "y"].includes(normalized);
    }

    return false;
}

export default function FeaturedSection() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                setError("");

                /*
                 * Browser
                 *    ↓
                 * /api/products
                 *    ↓
                 * https://api.printinghouseujjain.in/api/products
                 *
                 * Keep using the local Next.js proxy.
                 */
                const response = await fetch("/api/products", {
                    method: "GET",
                    cache: "no-store",
                });

                console.log("Products proxy status:", response.status);

                if (!response.ok) {
                    throw new Error(
                        `Products request failed with status ${response.status}`,
                    );
                }

                const data = await response.json();

                console.log("Products API response:", data);

                if (!Array.isArray(data?.products)) {
                    throw new Error("Products array not found in API response");
                }

                /*
                 * Take first 10 products.
                 */
                const firstTenProducts = data.products.slice(0, 10);

                console.log("First 10 products:", firstTenProducts);

                /*
                 * Convert API products into the format
                 * expected by ProductCard.
                 */
                const formattedProducts: Product[] = firstTenProducts.map(
                    (product: ApiProduct) => {
                        const image = getProductImage(
                            product.primary_photo_path,
                        );

                        const sellingPrice = Number(
                            product.selling_price ?? 0,
                        );

                        const marketPrice =
                            product.market_price !== null &&
                            product.market_price !== undefined
                                ? Number(product.market_price)
                                : undefined;

                        return {
                            id: String(product.id),

                            name: product.name || "Untitled Product",

                            /*
                             * Selling price
                             */
                            price: Number.isFinite(sellingPrice)
                                ? sellingPrice
                                : 0,

                            /*
                             * Original / market price
                             */
                            original:
                                marketPrice !== undefined &&
                                Number.isFinite(marketPrice)
                                    ? marketPrice
                                    : undefined,

                            image,

                            /*
                             * Product description
                             */
                            description: product.description ?? "",

                            /*
                             * Keep customization data available
                             * in the mapped product structure.
                             */
                            customizeReqs: product.customize_reqs ?? null,

                            /*
                             * Convert backend stock status into
                             * an actual boolean.
                             */
                            inStock: normalizeStock(product.in_stock),

                            /*
                             * No badge/tag from the API currently.
                             */
                            badge: undefined,
                            tag: undefined,

                            /*
                             * IMPORTANT:
                             * Read the actual wishlist state returned
                             * by the API instead of forcing undefined.
                             *
                             * This controls whether ProductCard's
                             * heart appears filled.
                             */
                            wishlisted: normalizeWishlisted(
                                product.wishlisted,
                            ),
                        };
                    },
                );

                console.log("Formatted products:", formattedProducts);

                setProducts(formattedProducts);
            } catch (err) {
                console.error("Failed to fetch products:", err);

                setError("Unable to load products. Please try again.");

                setProducts([]);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    return (
        <HorizontalScrollSection
            title="Featured"
            subtitle="Discover our featured products"
            viewAll="View all products"
        >
            {/* =====================================================
                LOADING
            ===================================================== */}
            {loading && (
                <div className="flex min-w-full items-center justify-center py-12">
                    <p className="text-sm text-foreground/50">
                        Loading products...
                    </p>
                </div>
            )}

            {/* =====================================================
                ERROR
            ===================================================== */}
            {!loading && error && (
                <div className="flex min-w-full items-center justify-center py-12">
                    <div className="text-center">
                        <p className="text-sm text-red-600">{error}</p>

                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="mt-3 text-sm font-medium text-[#85161B] hover:underline"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            )}

            {/* =====================================================
                NO PRODUCTS
            ===================================================== */}
            {!loading && !error && products.length === 0 && (
                <div className="flex min-w-full items-center justify-center py-12">
                    <p className="text-sm text-foreground/50">
                        No products available.
                    </p>
                </div>
            )}

            {/* =====================================================
                PRODUCTS
            ===================================================== */}
            {!loading &&
                !error &&
                products.length > 0 &&
                products.map((item) => (
                    <ProductCard
                        key={item.id}
                        item={item}
                        showOriginal
                    />
                ))}
        </HorizontalScrollSection>
    );
}