"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart, Share2 } from "lucide-react";

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

	/*
	 * Whether this product is already in the current user's
	 * wishlist. The products API returns this per-product
	 * (e.g. "wishlisted": true/false).
	 */
	wishlisted?: boolean;
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

	/* =====================================================
	   WISHLIST
	===================================================== */

	const [wishlisted, setWishlisted] = useState(
		item.wishlisted ?? false,
	);
	const [wishlistLoading, setWishlistLoading] = useState(false);
	const [wishlistError, setWishlistError] = useState("");

	/* =====================================================
	   SHARE
	===================================================== */

	const [sharing, setSharing] = useState(false);
	const [shareMessage, setShareMessage] = useState("");

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
		const nextValue = !previousValue;

		/*
		 * If the item is currently wishlisted, toggling it means
		 * removing it. Otherwise it means adding it.
		 */
		const endpoint = previousValue
			? "/api/wishlist/remove"
			: "/api/wishlist/add";

		// Optimistic UI update
		setWishlisted(nextValue);
		setWishlistLoading(true);

		try {
			const response = await fetch(endpoint, {
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
					data?.message ||
						"Unable to update wishlist. Please try again.",
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
	   SHARE PRODUCT
	===================================================== */

	const handleShareProduct = async () => {
		if (sharing) {
			return;
		}

		setSharing(true);
		setShareMessage("");

		try {
			const shareUrl = `${window.location.origin}${productUrl}`;

			/*
			 * Use the native share sheet when supported.
			 */
			if (navigator.share) {
				await navigator.share({
					title: item.name,
					text: `Check out ${item.name} on Printing House.`,
					url: shareUrl,
				});

				return;
			}

			/*
			 * Fallback for browsers without native sharing.
			 */
			await navigator.clipboard.writeText(shareUrl);

			setShareMessage("Product link copied!");

			setTimeout(() => {
				setShareMessage("");
			}, 2500);
		} catch (error) {
			/*
			 * Closing the native share sheet is not an error.
			 */
			if (
				error instanceof DOMException &&
				error.name === "AbortError"
			) {
				return;
			}

			/*
			 * If native sharing fails, try copying the link.
			 */
			try {
				const shareUrl = `${window.location.origin}${productUrl}`;

				await navigator.clipboard.writeText(shareUrl);

				setShareMessage("Product link copied!");

				setTimeout(() => {
					setShareMessage("");
				}, 2500);
			} catch {
				setShareMessage("Unable to share this product.");

				setTimeout(() => {
					setShareMessage("");
				}, 2500);
			}
		} finally {
			setSharing(false);
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

			<div className="relative">
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
				</Link>

				{/* =================================================
				    SHARE + WISHLIST

				    Both buttons are kept outside the Link so
				    there is no nested button inside an anchor.
				================================================= */}

				<div className="absolute right-3 top-3 z-10 flex items-center gap-2">
					{/* =================================================
					    SHARE
					================================================= */}

					<button
						type="button"
						onClick={handleShareProduct}
						disabled={sharing}
						aria-label={`Share ${item.name}`}
						title="Share product"
						className="
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
						{sharing ? (
							<span
								className="
									h-4
									w-4
									animate-spin
									rounded-full
									border-2
									border-[#85161B]/25
									border-t-[#85161B]
								"
							/>
						) : (
							<Share2
								size={18}
								strokeWidth={1.8}
								className="text-[#85161B]"
							/>
						)}
					</button>

					{/* =================================================
					    WISHLIST
					================================================= */}

					<button
						type="button"
						onClick={handleToggleWishlist}
						disabled={wishlistLoading}
						aria-label={
							wishlisted
								? `Remove ${item.name} from wishlist`
								: `Add ${item.name} to wishlist`
						}
						className="
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
								wishlisted
									? "fill-[#85161B] text-[#85161B]"
									: "text-[#222]"
							}
						/>
					</button>
				</div>
			</div>

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
								isInStock
									? "bg-emerald-50 text-emerald-700"
									: "bg-red-50 text-red-600"
							}
						`}
					>
						{isInStock ? "In stock" : "Out of stock"}
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

						{showOriginal &&
							item.original &&
							item.original > item.price && (
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
				    SHARE MESSAGE
				================================================= */}

				{shareMessage && (
					<p
						role="status"
						className="
							mt-2
							text-[11px]
							font-medium
							text-emerald-600
						"
					>
						{shareMessage}
					</p>
				)}

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