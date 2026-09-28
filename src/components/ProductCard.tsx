"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart } from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type Item = {
	id: string;
	name: string;
	price: number;
	image?: string;
	original?: number;
	badge?: string;
	tag?: string;
	description?: string;
	brand?: string;
	inStock?: boolean;
};

/* =========================================================
   COMPONENT
========================================================= */

export default function ProductCard({
	item,
	showOriginal = false,
}: {
	item: Item;
	showOriginal?: boolean;
}) {
	/* =====================================================
       STOCK
    ===================================================== */

	const isInStock = item.inStock === true;
	const isOutOfStock = !isInStock;

	/* =====================================================
       WISHLIST
    ===================================================== */

	const [wishlisted, setWishlisted] = useState(false);
	const [wishlistLoading, setWishlistLoading] = useState(false);
	const [wishlistError, setWishlistError] = useState("");

	/* =====================================================
       PRODUCT URL
    ===================================================== */

	const productUrl = `/product/${item.id}`;

	/* =====================================================
       WISHLIST TOGGLE
    ===================================================== */

	const handleToggleWishlist = async () => {
		if (wishlistLoading) {
			return;
		}

		setWishlistError("");

		const previousValue = wishlisted;

		// Optimistic UI update
		setWishlisted(!previousValue);
		setWishlistLoading(true);

		try {
			const response = await fetch("/api/wishlist/add", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify({
					productId: item.id,
				}),
			});

			const data: {
				message?: string;
			} = await response.json().catch(() => ({}));

			if (!response.ok) {
				throw new Error(
					data?.message || "Unable to update wishlist. Please try again.",
				);
			}
		} catch (error) {
			console.error("Wishlist update failed:", error);

			// Roll back optimistic update
			setWishlisted(previousValue);

			setWishlistError(
				error instanceof Error
					? error.message
					: "Unable to update wishlist. Please try again.",
			);

			setTimeout(() => {
				setWishlistError("");
			}, 2500);
		} finally {
			setWishlistLoading(false);
		}
	};

	/* =====================================================
       RENDER
    ===================================================== */

	return (
		<article
			className="
                group
                w-full
                min-w-0
                overflow-hidden
                rounded-[26px]
                border
                border-black/[0.06]
                bg-white
                p-2.5
                shadow-[0_8px_30px_rgba(0,0,0,0.05)]
                transition-all
                duration-300
                hover:-translate-y-1
                hover:shadow-[0_14px_40px_rgba(0,0,0,0.09)]
            "
		>
			{/* =================================================
                IMAGE
            ================================================= */}

			<Link
				href={productUrl}
				aria-label={`View ${item.name}`}
				className="
                    relative
                    block
                    aspect-[0.92]
                    overflow-hidden
                    rounded-[21px]
                    bg-[#F3F0EC]
                "
			>
				{item.image ? (
					<img
						src={item.image}
						alt={item.name}
						loading="lazy"
						className="
                            h-full
                            w-full
                            object-cover
                            transition-transform
                            duration-500
                            ease-out
                            group-hover:scale-[1.035]
                        "
					/>
				) : (
					<div
						className="
                            flex
                            h-full
                            w-full
                            items-center
                            justify-center
                            text-sm
                            text-black/40
                        "
					>
						No image
					</div>
				)}

				{/* =================================================
                    BADGE
                ================================================= */}

				{(item.badge || item.tag) && (
					<div
						className="
                            pointer-events-none
                            absolute
                            left-3
                            top-3
                            rounded-full
                            bg-white/95
                            px-3
                            py-1.5
                            text-[10px]
                            font-bold
                            uppercase
                            tracking-[0.08em]
                            text-[#85161B]
                            shadow-sm
                        "
					>
						{item.badge || item.tag}
					</div>
				)}

				{/* =================================================
                    WISHLIST
                ================================================= */}

				<button
					type="button"
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						handleToggleWishlist();
					}}
					disabled={wishlistLoading}
					aria-label={
						wishlisted
							? `Remove ${item.name} from wishlist`
							: `Add ${item.name} to wishlist`
					}
					className="
                        absolute
                        right-3
                        top-3
                        z-10
                        flex
                        h-10
                        w-10
                        items-center
                        justify-center
                        rounded-full
                        bg-white/95
                        shadow-sm
                        transition-all
                        duration-200
                        hover:scale-105
                        active:scale-90
                        disabled:cursor-not-allowed
                        disabled:opacity-70
                    "
				>
					<Heart
						size={19}
						strokeWidth={1.8}
						className={
							wishlisted ? "fill-[#85161B] text-[#85161B]" : "text-[#222]"
						}
					/>
				</button>
			</Link>

			{/* =================================================
                PRODUCT INFORMATION
            ================================================= */}

			<div className="px-2 pb-1 pt-4">
				{/* =================================================
                    NAME
                ================================================= */}

				<Link
					href={productUrl}
					className="block"
					aria-label={`View ${item.name}`}
				>
					<h3
						className="
                            line-clamp-1
                            text-[16px]
                            font-semibold
                            leading-tight
                            tracking-[-0.01em]
                            text-[#202020]
                            transition-colors
                            duration-200
                            group-hover:text-[#85161B]
                        "
					>
						{item.name}
					</h3>
				</Link>

				{/* =================================================
                    BRAND
                ================================================= */}

				{item.brand && (
					<p
						className="
                            mt-1
                            text-[12px]
                            font-medium
                            text-black/40
                        "
					>
						{item.brand}
					</p>
				)}

				{/* =================================================
                    DESCRIPTION
                ================================================= */}

				<Link href={productUrl} className="block">
					<p
						className="
                            mt-1.5
                            line-clamp-2
                            min-h-[34px]
                            text-[12px]
                            leading-[1.45]
                            text-black/45
                        "
					>
						{item.description ||
							"Thoughtfully designed and made to make every moment personal."}
					</p>
				</Link>

				{/* =================================================
                    STOCK STATUS

                    IMPORTANT:
                    This is intentionally a <div>, not a button.
                ================================================= */}

				<div className="mt-3">
					<span
						className={`
                            inline-flex
                            items-center
                            rounded-full
                            px-2.5
                            py-1
                            text-[10px]
                            font-semibold
                            ${
															isOutOfStock
																? "bg-red-50 text-red-600"
																: "bg-emerald-50 text-emerald-700"
														}
                        `}
					>
						{isOutOfStock ? "Out of stock" : "In stock"}
					</span>
				</div>

				{/* =================================================
                    PRICE
                ================================================= */}

				<div className="mt-4 min-w-0">
					<div className="flex items-baseline gap-2">
						<span
							className="
                                text-[19px]
                                font-bold
                                tracking-tight
                                text-[#85161B]
                            "
						>
							₹{item.price.toFixed(0)}
						</span>

						{showOriginal && item.original && (
							<span
								className="
                                    text-[12px]
                                    font-medium
                                    text-black/30
                                    line-through
                                "
							>
								₹{item.original.toFixed(0)}
							</span>
						)}
					</div>
				</div>

				{/* =================================================
                    VIEW PRODUCT

                    No Add to Cart / Customize button here.
                    The entire card's product actions are handled
                    through the product detail page.
                ================================================= */}

				<Link
					href={productUrl}
					className="
                        mt-4
                        flex
                        h-11
                        w-full
                        items-center
                        justify-center
                        rounded-full
                        border
                        border-[#85161B]/20
                        bg-[#85161B]/[0.03]
                        px-4
                        text-[12px]
                        font-semibold
                        text-[#85161B]
                        transition-all
                        duration-200
                        hover:border-[#85161B]/40
                        hover:bg-[#85161B]/[0.07]
                        active:scale-[0.98]
                    "
				>
					View product
				</Link>

				{/* =================================================
                    WISHLIST ERROR
                ================================================= */}

				{wishlistError && (
					<p
						role="alert"
						className="
                            mt-2
                            text-[11px]
                            font-medium
                            text-red-600
                        "
					>
						{wishlistError}
					</p>
				)}
			</div>
		</article>
	);
}
