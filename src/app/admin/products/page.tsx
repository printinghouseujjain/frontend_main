"use client";

import React, { useEffect, useState } from "react";

import Link from "next/link";

import {
	Package,
	Plus,
	RefreshCw,
	AlertCircle,
	ExternalLink,
	IndianRupee,
	Truck,
	Image as ImageIcon,
	PenLine,
	ShoppingBag,
	Store,
	LogOut,
} from "lucide-react";

import { useRouter } from "next/navigation";

/* ============================================================================
   PRODUCT IMAGE BASE URL
============================================================================ */

const PRODUCT_IMAGE_BASE_URL =
	"https://api.printinghouseujjain.in/assets/products/";

/* ============================================================================
   TYPES
============================================================================ */

type RawProduct = {
	id: number;
	name: string;
	description: string;
	varients: string;
	primary_photo_path: string;
	other_photos_paths: string;
	market_price: string;
	selling_price: string;
	reseller_price: string;
	category_ids: string;
	occasion_ids: string;
	in_stock: string;
	sold: number;
	customize_reqs: string;
	keywords: string;
	created_at: string;
	delivery: string;
};

type Product = {
	id: number;
	name: string;
	description: string;
	primaryPhoto: string | null;
	otherPhotos: string[];
	marketPrice: number;
	sellingPrice: number;
	resellerPrice: number;
	categoryIds: number[];
	occasionIds: number[];
	inStock: boolean;
	sold: number;
	delivery: number;
	customizeRequirements: string[];
};

/* ============================================================================
   HELPERS
============================================================================ */

function toNumber(value: unknown, fallback = 0): number {
	const number = Number(value);

	return Number.isFinite(number) ? number : fallback;
}

/* --------------------------------------------------------------------------
   Parse JSON array safely
-------------------------------------------------------------------------- */

function parseJsonArray<T>(value: unknown, fallback: T[] = []): T[] {
	if (Array.isArray(value)) {
		return value;
	}

	if (typeof value !== "string" || !value.trim()) {
		return fallback;
	}

	try {
		const parsed = JSON.parse(value);

		return Array.isArray(parsed) ? parsed : fallback;
	} catch {
		return fallback;
	}
}

/* --------------------------------------------------------------------------
   Clean image path
-------------------------------------------------------------------------- */

function getImageUrl(path: string | null | undefined): string | null {
	if (!path || typeof path !== "string") {
		return null;
	}

	const cleanPath = path.replace(/^\/+/, "");

	if (!cleanPath) {
		return null;
	}

	return `${PRODUCT_IMAGE_BASE_URL}${cleanPath}`;
}

/* --------------------------------------------------------------------------
   Parse customization requirements
-------------------------------------------------------------------------- */

function parseCustomizeRequirements(value: string): string[] {
	return parseJsonArray<string>(value);
}

/* ============================================================================
   NORMALIZE PRODUCT
============================================================================ */

function normalizeProduct(raw: RawProduct): Product {
	const otherPhotos = parseJsonArray<string>(raw.other_photos_paths);

	const categoryIds = parseJsonArray<number>(raw.category_ids);

	const occasionIds = parseJsonArray<number>(raw.occasion_ids);

	const customizeRequirements = parseCustomizeRequirements(raw.customize_reqs);

	return {
		id: raw.id,

		name: raw.name || "Untitled Product",

		description: raw.description || "",

		primaryPhoto: getImageUrl(raw.primary_photo_path),

		otherPhotos: otherPhotos
			.map((photo) => getImageUrl(photo))
			.filter((photo): photo is string => Boolean(photo)),

		marketPrice: toNumber(raw.market_price),

		sellingPrice: toNumber(raw.selling_price),

		resellerPrice: toNumber(raw.reseller_price),

		categoryIds,

		occasionIds,

		inStock: raw.in_stock?.toLowerCase().trim() === "available",

		sold: toNumber(raw.sold),

		delivery: toNumber(raw.delivery),

		customizeRequirements,
	};
}

/* ============================================================================
   DISCOUNT
============================================================================ */

function getDiscountPercentage(
	marketPrice: number,
	sellingPrice: number,
): number {
	if (marketPrice <= 0 || sellingPrice >= marketPrice) {
		return 0;
	}

	return Math.round(((marketPrice - sellingPrice) / marketPrice) * 100);
}

/* ============================================================================
   PRODUCT CARD
============================================================================ */

function ProductCard({ product }: { product: Product }) {
	const discount = getDiscountPercentage(
		product.marketPrice,
		product.sellingPrice,
	);

	return (
		<div
			className={`
				group
				relative
				overflow-hidden
				rounded-2xl
				border
				bg-white
				shadow-[0_4px_20px_rgba(80,40,20,0.04)]
				transition-all
				duration-200
				hover:-translate-y-1
				hover:shadow-[0_10px_30px_rgba(80,40,20,0.09)]
				border-[#E8DED7]
			`}
		>
			{/* ================================================================
			    IMAGE
			================================================================ */}

			<div className="relative aspect-square overflow-hidden bg-[#F7F2EE]">
				{product.primaryPhoto ? (
					<img
						src={product.primaryPhoto}
						alt={product.name}
						className="
							h-full
							w-full
							object-cover
							transition-transform
							duration-500
							group-hover:scale-105
						"
						onError={(event) => {
							event.currentTarget.style.display = "none";
						}}
					/>
				) : (
					<div
						className="
							flex
							h-full
							w-full
							items-center
							justify-center
						"
					>
						<div className="flex flex-col items-center gap-2 text-[#2E2E2E]/30">
							<Package size={42} strokeWidth={1.4} />

							<span className="text-xs">No image</span>
						</div>
					</div>
				)}

				{/* STOCK */}

				<div className="absolute left-3 top-3">
					<span
						className={`
							inline-flex
							rounded-full
							px-2.5
							py-1
							text-xs
							font-semibold
							backdrop-blur-sm
							${
								product.inStock
									? "bg-green-50/95 text-green-700"
									: "bg-red-50/95 text-red-700"
							}
							
						`}
					>
						{product.inStock ? "In stock" : "Out of stock"}
					</span>
				</div>

				{/* DISCOUNT */}

				{discount > 0 && (
					<div className="absolute right-3 top-3">
						<span
							className="
								rounded-full
								bg-[#85161B]
								px-2.5
								py-1
								text-xs
								font-bold
								text-white
								shadow-sm
							"
						>
							{discount}% OFF
						</span>
					</div>
				)}
			</div>

			{/* ================================================================
			    CONTENT
			================================================================ */}

			<div className="p-4">
				{/* PRODUCT ID / CATEGORY */}

				<div className="mb-2 flex items-center justify-between gap-2">
					<p className="text-xs font-semibold uppercase tracking-wide text-[#85161B]/70">
						Product #{product.id}
					</p>

					{product.categoryIds.length > 0 && (
						<span className="text-xs text-[#2E2E2E]/40">
							Cat. {product.categoryIds.join(", ")}
						</span>
					)}
				</div>

				{/* NAME */}

				<h2
					className="
						line-clamp-2
						min-h-[2.75rem]
						text-sm
						font-semibold
						leading-5
						text-[#2E2E2E]
					"
				>
					{product.name}
				</h2>

				{/* ============================================================
				    PRICES
				============================================================ */}

				<div className="mt-3">
					<div className="flex items-baseline gap-2">
						<div className="flex items-center text-lg font-bold text-[#85161B]">
							<IndianRupee size={15} />

							{product.sellingPrice.toLocaleString("en-IN")}
						</div>

						{product.marketPrice > product.sellingPrice && (
							<div className="flex items-center text-xs text-[#2E2E2E]/40 line-through">
								<IndianRupee size={11} />

								{product.marketPrice.toLocaleString("en-IN")}
							</div>
						)}
					</div>

					<p className="mt-1 text-[11px] text-[#2E2E2E]/40">
						Reseller: ₹{product.resellerPrice.toLocaleString("en-IN")}
					</p>
				</div>

				{/* ============================================================
				    DETAILS
				============================================================ */}

				<div className="mt-4 grid grid-cols-2 gap-2">
					{/* SOLD */}

					<div className="rounded-xl bg-[#FBF9F7] px-3 py-2">
						<div className="flex items-center gap-1.5 text-[#2E2E2E]/45">
							<ShoppingBag size={13} />

							<span className="text-[10px] font-medium uppercase tracking-wide">
								Sold
							</span>
						</div>

						<p className="mt-1 text-xs font-semibold text-[#2E2E2E]">
							{product.sold}
						</p>
					</div>

					{/* DELIVERY */}

					<div className="rounded-xl bg-[#FBF9F7] px-3 py-2">
						<div className="flex items-center gap-1.5 text-[#2E2E2E]/45">
							<Truck size={13} />

							<span className="text-[10px] font-medium uppercase tracking-wide">
								Delivery
							</span>
						</div>

						<p className="mt-1 text-xs font-semibold text-[#2E2E2E]">
							{product.delivery > 0 ? `₹${product.delivery}` : "Free"}
						</p>
					</div>
				</div>

				{/* ============================================================
				    PRODUCT FEATURES
				============================================================ */}

				<div className="mt-3 flex items-center gap-3 text-xs text-[#2E2E2E]/45">
					{product.otherPhotos.length > 0 && (
						<div className="flex items-center gap-1">
							<ImageIcon size={13} />

							<span>+{product.otherPhotos.length} photos</span>
						</div>
					)}

					{product.customizeRequirements.length > 0 && (
						<div className="flex items-center gap-1">
							<PenLine size={13} />

							<span>{product.customizeRequirements.length} custom fields</span>
						</div>
					)}
				</div>

				{/* ============================================================
				    VIEW PRODUCT
				============================================================ */}

				<Link
					href={`/admin/products/${product.id}`}
					className="
							mt-4
							flex
							w-full
							items-center
							justify-center
							gap-2
							rounded-xl
							border
							border-[#85161B]/20
							px-4
							py-2.5
							text-sm
							font-semibold
							text-[#85161B]
							transition
							hover:bg-[#85161B]
							hover:text-white
						"
				>
					View Product
					<ExternalLink size={15} />
				</Link>
			</div>
		</div>
	);
}

/* ============================================================================
   PRODUCTS PAGE
============================================================================ */

export default function AdminProductsPage() {
	const [products, setProducts] = useState<Product[]>([]);

	const router = useRouter();

	const [loading, setLoading] = useState(true);

	const [error, setError] = useState("");

	/* ==========================================================================
	   FETCH PRODUCTS
	========================================================================== */

	const fetchProducts = async () => {
		setLoading(true);
		setError("");

		try {
			const response = await fetch("/api/admin/products", {
				method: "GET",
				credentials: "include",
				cache: "no-store",
			});

			const data = await response.json().catch(() => null);

			console.log("ADMIN PRODUCTS RESPONSE:", data);

			if (!response.ok) {
				throw new Error(
					data &&
						typeof data === "object" &&
						"message" in data &&
						typeof (
							data as {
								message?: unknown;
							}
						).message === "string"
						? (
								data as {
									message: string;
								}
							).message
						: "Unable to load products.",
				);
			}

			if (
				!data ||
				typeof data !== "object" ||
				!("products" in data) ||
				!Array.isArray(
					(
						data as {
							products?: unknown;
						}
					).products,
				)
			) {
				throw new Error("Invalid products response from server.");
			}

			const rawProducts = (
				data as {
					products: RawProduct[];
				}
			).products;

			console.log("RAW ADMIN PRODUCTS:", rawProducts);

			const normalizedProducts = rawProducts.map(normalizeProduct);

			console.log("NORMALIZED PRODUCTS:", normalizedProducts);

			setProducts(normalizedProducts);
		} catch (err) {
			console.error("Fetch admin products failed:", err);

			setError(err instanceof Error ? err.message : "Unable to load products.");
		} finally {
			setLoading(false);
		}
	};

	/* ==========================================================================
	   LOGOUT
	========================================================================== */

	const [loggingOut, setLoggingOut] = useState(false);

	const handleLogout = async () => {
		if (loggingOut) return;

		setLoggingOut(true);

		try {
			const response = await fetch("/api/admin/logout?command_type=admin", {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				cache: "no-store",
			});

			if (!response.ok) {
				const data = await response.json().catch(() => ({}));

				throw new Error(
					(
						data as {
							message?: string;
						}
					)?.message || "Unable to logout.",
				);
			}

			router.replace("/login");
		} catch (error) {
			console.error("Admin logout failed:", error);

			alert(
				error instanceof Error
					? error.message
					: "Unable to logout. Please try again.",
			);

			setLoggingOut(false);
		}
	};

	/* ==========================================================================
	   INITIAL FETCH
	========================================================================== */

	useEffect(() => {
		fetchProducts();
	}, []);

	/* ==========================================================================
	   PAGE
	========================================================================== */

	return (
		<div className="min-h-screen bg-[#FBF9F7]">
			{/* ==================================================================
			    HEADER
			================================================================== */}

			<header
				className="
					sticky
					top-0
					z-30
					h-[76px]
					border-b
					border-[#E8DED7]
					bg-[#FBF9F7]/95
					backdrop-blur-md
				"
			>
				<div
					className="
						flex
						h-full
						items-center
						justify-between
						px-5
						sm:px-6
						lg:px-8
					"
				>
					{/* BRAND */}

					<Link href="/admin" className="group flex items-center gap-3">
						<div
							className="
								flex
								h-10
								w-10
								items-center
								justify-center
								rounded-xl
								text-white
								shadow-sm
								transition
								group-hover:scale-[1.02]
							"
						>
							<img
								src="https://api.printinghouseujjain.in/assets/logo.png"
								alt="Printing House"
								className="
									h-10
									w-10
									shrink-0
									object-contain
								"
							/>
						</div>

						<div className="hidden sm:block">
							<p
								className="
									text-[10px]
									font-bold
									uppercase
									tracking-[0.22em]
									text-[#85161B]
								"
							>
								Printing House
							</p>

							<p
								className="
									mt-0.5
									text-sm
									font-semibold
									text-[#2E2E2E]
								"
							>
								Admin Dashboard
							</p>
						</div>
					</Link>

					{/* RIGHT NAV */}

					<div className="flex items-center gap-2 sm:gap-3">
						{/* STOREFRONT */}

						<Link
							href="/"
							className="
								hidden
								items-center
								gap-2
								rounded-xl
								border
								border-[#E8DED7]
								bg-white
								px-4
								py-2.5
								text-sm
								font-medium
								text-[#2E2E2E]
								transition
								hover:border-[#85161B]/30
								hover:text-[#85161B]
								sm:flex
							"
						>
							<Store size={16} strokeWidth={1.8} />

							<span>Storefront</span>
						</Link>

						{/* ADMIN PROFILE */}

						<div
							className="
								flex
								items-center
								gap-2.5
								rounded-xl
								border
								border-[#E8DED7]
								bg-white
								px-2.5
								py-2
							"
						>
							<div
								className="
									flex
									h-8
									w-8
									items-center
									justify-center
									rounded-full
									bg-[#85161B]
									text-xs
									font-semibold
									text-white
								"
							>
								A
							</div>

							<div className="hidden text-left md:block">
								<p className="text-xs font-semibold text-[#2E2E2E]">Admin</p>

								<p className="text-[10px] text-[#2E2E2E]/45">Administrator</p>
							</div>
						</div>

						{/* LOGOUT */}

						<button
							type="button"
							onClick={handleLogout}
							disabled={loggingOut}
							className="
								inline-flex
								items-center
								gap-2
								rounded-xl
								border
								border-[#85161B]/20
								bg-white
								px-3.5
								py-2.5
								text-sm
								font-medium
								text-[#85161B]
								transition
								hover:border-[#85161B]
								hover:bg-[#85161B]
								hover:text-white
								disabled:cursor-not-allowed
								disabled:opacity-60
								sm:px-4
							"
						>
							{loggingOut ? (
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
								<LogOut size={16} strokeWidth={1.9} />
							)}

							<span className="hidden sm:inline">
								{loggingOut ? "Logging out..." : "Logout"}
							</span>
						</button>
					</div>
				</div>
			</header>

			{/* ==================================================================
			    MAIN
			================================================================== */}

			<div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8 lg:py-10">
				{/* ==============================================================
				    PAGE HEADER
				============================================================== */}

				<div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#85161B]">
							Printing House Admin
						</p>

						<h1 className="text-3xl font-bold tracking-tight text-[#2E2E2E] sm:text-4xl">
							Products
						</h1>

						<p className="mt-2 text-sm text-[#2E2E2E]/55 sm:text-base">
							View and manage all products in your store.
						</p>
					</div>

					{/* ==========================================================
					    ACTIONS
					========================================================== */}

					<div className="flex flex-wrap items-center gap-3">
						{/* REFRESH */}

						<button
							type="button"
							onClick={() => {
								if (!loading) {
									fetchProducts();
								}
							}}
							disabled={loading}
							className="
								inline-flex
								items-center
								justify-center
								gap-2
								rounded-xl
								border
								border-[#E8DED7]
								bg-white
								px-4
								py-3
								text-sm
								font-semibold
								text-[#2E2E2E]
								transition
								hover:border-[#85161B]/30
								hover:text-[#85161B]
								disabled:pointer-events-none
								disabled:opacity-50
							"
						>
							<RefreshCw size={16} className={loading ? "animate-spin" : ""} />
							Refresh
						</button>

						{/* ADD PRODUCT */}

						<Link
							href="/admin/products/new"
							className="
								inline-flex
								items-center
								justify-center
								gap-2
								rounded-xl
								bg-[#85161B]
								px-5
								py-3
								text-sm
								font-semibold
								text-white
								transition
								hover:bg-[#721318]
								hover:shadow-lg
								active:scale-[0.98]
							"
						>
							<Plus size={17} />
							Add Product
						</Link>
					</div>
				</div>

				{/* ==============================================================
				    SUMMARY
				============================================================== */}

				{!loading && !error && (
					<div
						className="
								mb-6
								flex
								items-center
								justify-between
								rounded-2xl
								border
								border-[#E8DED7]
								bg-white
								px-5
								py-4
							"
					>
						<div className="flex items-center gap-3">
							<div
								className="
										flex
										h-10
										w-10
										items-center
										justify-center
										rounded-xl
										bg-[#F7D6BF]/45
										text-[#85161B]
									"
							>
								<Package size={19} />
							</div>

							<div>
								<p className="text-sm font-semibold text-[#2E2E2E]">
									All Products
								</p>

								<p className="text-xs text-[#2E2E2E]/45">
									Products available in your store
								</p>
							</div>
						</div>

						<p className="text-lg font-bold text-[#85161B]">
							{products.length}
						</p>
					</div>
				)}

				{/* ==============================================================
				    ERROR
				============================================================== */}

				{!loading && error && (
					<div className="flex min-h-[400px] items-center justify-center">
						<div
							className="
									w-full
									max-w-md
									rounded-2xl
									border
									border-red-100
									bg-white
									p-8
									text-center
									shadow-sm
								"
						>
							<div
								className="
										mx-auto
										flex
										h-12
										w-12
										items-center
										justify-center
										rounded-full
										bg-red-50
										text-red-500
									"
							>
								<AlertCircle size={23} />
							</div>

							<h2 className="mt-4 text-lg font-semibold text-[#2E2E2E]">
								Unable to load products
							</h2>

							<p className="mt-2 text-sm text-[#2E2E2E]/55">{error}</p>

							<button
								type="button"
								onClick={() => {
									if (!loading) {
										fetchProducts();
									}
								}}
								className="
										mt-5
										rounded-xl
										bg-[#85161B]
										px-5
										py-2.5
										text-sm
										font-semibold
										text-white
										transition
										hover:bg-[#721318]
									"
							>
								Try Again
							</button>
						</div>
					</div>
				)}

				{/* ==============================================================
				    LOADING
				============================================================== */}

				{loading && (
					<div className="flex min-h-[400px] items-center justify-center">
						<div className="flex flex-col items-center gap-4">
							<div
								className="
									h-10
									w-10
									animate-spin
									rounded-full
									border-2
									border-[#85161B]/20
									border-t-[#85161B]
								"
							/>

							<p className="text-sm text-[#2E2E2E]/50">Loading products...</p>
						</div>
					</div>
				)}

				{/* ==============================================================
				    EMPTY STATE
				============================================================== */}

				{!loading && !error && products.length === 0 && (
					<div className="flex min-h-[400px] items-center justify-center">
						<div className="text-center">
							<div
								className="
										mx-auto
										flex
										h-16
										w-16
										items-center
										justify-center
										rounded-2xl
										bg-[#F7F2EE]
										text-[#85161B]/50
									"
							>
								<Package size={30} />
							</div>

							<h2 className="mt-5 text-lg font-semibold text-[#2E2E2E]">
								No products found
							</h2>

							<p className="mt-2 text-sm text-[#2E2E2E]/50">
								There are currently no products in your store.
							</p>

							<Link
								href="/admin/products/new"
								className="
										mt-5
										inline-flex
										items-center
										gap-2
										rounded-xl
										bg-[#85161B]
										px-5
										py-3
										text-sm
										font-semibold
										text-white
										transition
										hover:bg-[#721318]
									"
							>
								<Plus size={17} />
								Add Product
							</Link>
						</div>
					</div>
				)}

				{/* ==============================================================
				    PRODUCTS GRID
				============================================================== */}

				{!loading && !error && products.length > 0 && (
					<div
						className="
								grid
								grid-cols-1
								gap-5
								sm:grid-cols-2
								lg:grid-cols-3
								xl:grid-cols-4
							"
					>
						{products.map((product) => (
							<ProductCard key={product.id} product={product} />
						))}
					</div>
				)}

				{/* ==============================================================
				    FOOTER
				============================================================== */}

				{!loading && !error && products.length > 0 && (
					<div className="mt-10 text-center">
						<p className="text-xs text-[#2E2E2E]/35">
							Showing {products.length} product
							{products.length === 1 ? "" : "s"}
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
