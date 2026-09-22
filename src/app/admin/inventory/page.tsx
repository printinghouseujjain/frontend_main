"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
	AlertCircle,
	CheckCircle2,
	Loader2,
	PackageX,
	Search,
	ShoppingBag,
} from "lucide-react";

/* ============================================================================
   CONSTANTS
============================================================================ */

const PRODUCT_IMAGE_BASE_URL =
	"https://api.printinghouseujjain.in/assets/products/";

/* ============================================================================
   TYPES
============================================================================ */

type StockStatus = "available" | "out_of_stock";

type RawProduct = {
	id?: string | number;
	name?: string;
	primary_photo_path?: string;
	selling_price?: string | number;
	market_price?: string | number;
	in_stock?: string;
	sold?: string | number;
};

/*
 * ASSUMPTION: the listing endpoint returns one of:
 *
 * { products: [...] }
 * { result: [...] }
 * { data: [...] }
 * [...]  (a bare array)
 *
 * Adjust parseProductsResponse() below if your endpoint's
 * shape differs.
 */
type ProductsResponse =
	| RawProduct[]
	| {
			status?: number;
			message?: string;
			products?: RawProduct[];
			result?: RawProduct[];
			data?: RawProduct[];
	  };

type Product = {
	id: string;
	name: string;
	image?: string;
	sellingPrice: number;
	marketPrice: number;
	sold: number;
	inStock: StockStatus;
};

/* ============================================================================
   HELPERS
============================================================================ */

function toNumber(value: unknown, fallback = 0): number {
	const number = Number(value);

	return Number.isFinite(number) ? number : fallback;
}

function getProductImage(photoPath?: string): string | undefined {
	if (!photoPath) {
		return undefined;
	}

	if (photoPath.startsWith("http://") || photoPath.startsWith("https://")) {
		return photoPath;
	}

	return `${PRODUCT_IMAGE_BASE_URL}${photoPath.replace(/^\/+/, "")}`;
}

function normalizeStockStatus(value?: string): StockStatus {
	return String(value ?? "available").toLowerCase() === "out_of_stock"
		? "out_of_stock"
		: "available";
}

function normalizeProduct(raw: RawProduct): Product | null {
	if (raw.id === undefined || raw.id === null) {
		return null;
	}

	return {
		id: String(raw.id),

		name: raw.name ?? "Untitled product",

		image: getProductImage(raw.primary_photo_path),

		sellingPrice: toNumber(raw.selling_price, 0),

		marketPrice: toNumber(raw.market_price, 0),

		sold: toNumber(raw.sold, 0),

		inStock: normalizeStockStatus(raw.in_stock),
	};
}

/*
 * Handles every response shape listed above. Update this if your
 * listing endpoint wraps the array differently.
 */
function parseProductsResponse(data: ProductsResponse): RawProduct[] {
	if (Array.isArray(data)) {
		return data;
	}

	return data.products ?? data.result ?? data.data ?? [];
}

/* ============================================================================
   INVENTORY PAGE
============================================================================ */

export default function AdminInventoryPage() {
	const [products, setProducts] = useState<Product[]>([]);

	const [loading, setLoading] = useState(true);

	const [error, setError] = useState("");

	const [searchQuery, setSearchQuery] = useState("");

	const [statusFilter, setStatusFilter] = useState<
		"all" | StockStatus
	>("all");

	const [updatingProductIds, setUpdatingProductIds] = useState<Set<string>>(
		new Set(),
	);

	const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

	/* ==========================================================================
	   FETCH PRODUCTS
	========================================================================== */

	const fetchProducts = async () => {
		setLoading(true);
		setError("");

		try {
			/*
			 * ASSUMPTION: GET /api/admin/products returns the full
			 * product list for the admin. Adjust the URL/method here
			 * if your listing endpoint is different.
			 */
			const response = await fetch("/api/admin/products", {
				method: "GET",
				credentials: "include",
				cache: "no-store",
			});

			const data: ProductsResponse = await response.json().catch(() => []);

			console.log("INVENTORY PRODUCTS RESPONSE:", data);

			if (!response.ok) {
				const message =
					!Array.isArray(data) && typeof data === "object" && data.message
						? data.message
						: "Unable to load products.";

				throw new Error(message);
			}

			const rawProducts = parseProductsResponse(data);

			const normalized = rawProducts
				.map(normalizeProduct)
				.filter((product): product is Product => product !== null);

			setProducts(normalized);
		} catch (err) {
			console.error("Fetch inventory failed:", err);

			setError(
				err instanceof Error ? err.message : "Unable to load products.",
			);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchProducts();
	}, []);

	/* ==========================================================================
	   FILTERED LIST
	========================================================================== */

	const filteredProducts = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();

		return products.filter((product) => {
			const matchesQuery =
				!query ||
				product.name.toLowerCase().includes(query) ||
				product.id.includes(query);

			const matchesStatus =
				statusFilter === "all" || product.inStock === statusFilter;

			return matchesQuery && matchesStatus;
		});
	}, [products, searchQuery, statusFilter]);

	const availableCount = useMemo(
		() => products.filter((product) => product.inStock === "available").length,
		[products],
	);

	const outOfStockCount = products.length - availableCount;

	/* ==========================================================================
	   TOGGLE STOCK STATUS
	========================================================================== */

	const toggleStock = async (product: Product) => {
		if (updatingProductIds.has(product.id)) {
			return;
		}

		const nextStatus: StockStatus =
			product.inStock === "available" ? "out_of_stock" : "available";

		/* -------------------------------------------------------------
		   MARK ROW AS UPDATING
		------------------------------------------------------------- */

		setUpdatingProductIds((previous) => {
			const next = new Set(previous);

			next.add(product.id);

			return next;
		});

		setRowErrors((previous) => {
			const next = { ...previous };

			delete next[product.id];

			return next;
		});

		/* -------------------------------------------------------------
		   OPTIMISTIC UI
		------------------------------------------------------------- */

		setProducts((previous) =>
			previous.map((current) =>
				current.id === product.id
					? { ...current, inStock: nextStatus }
					: current,
			),
		);

		/* -------------------------------------------------------------
		   BACKEND REQUEST
		------------------------------------------------------------- */

		try {
			const formData = new FormData();

			formData.append("product_id", product.id);
			formData.append("status_set", nextStatus);

			console.log("UPDATE STOCK REQUEST:", {
				product_id: product.id,
				status_set: nextStatus,
			});

			const response = await fetch("/api/admin/update-stock", {
				method: "POST",
				credentials: "include",
				body: formData,
				cache: "no-store",
			});

			const data = await response.json().catch(() => ({}));

			console.log("UPDATE STOCK RESPONSE:", data);

			const logicalStatus =
				data &&
				typeof data === "object" &&
				"status" in data &&
				typeof (data as { status?: unknown }).status === "number"
					? (data as { status: number }).status
					: response.status;

			if (!response.ok || logicalStatus >= 400) {
				throw new Error(
					data &&
						typeof data === "object" &&
						"message" in data &&
						typeof (data as { message?: unknown }).message === "string"
						? (data as { message: string }).message
						: "Unable to update stock status.",
				);
			}
		} catch (err) {
			console.error("Update stock failed:", err);

			/* -------------------------------------------------------------
			   REVERT ON FAILURE
			------------------------------------------------------------- */

			setProducts((previous) =>
				previous.map((current) =>
					current.id === product.id
						? { ...current, inStock: product.inStock }
						: current,
				),
			);

			setRowErrors((previous) => ({
				...previous,
				[product.id]:
					err instanceof Error
						? err.message
						: "Unable to update stock status.",
			}));
		} finally {
			setUpdatingProductIds((previous) => {
				const next = new Set(previous);

				next.delete(product.id);

				return next;
			});
		}
	};

	/* ==========================================================================
	   LOADING
	========================================================================== */

	if (loading) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-[#FBF9F7] text-sm text-[#2E2E2E]/60">
				<Loader2 className="mr-2 animate-spin" size={18} />
				Loading inventory...
			</main>
		);
	}

	/* ==========================================================================
	   ERROR
	========================================================================== */

	if (error && products.length === 0) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-[#FBF9F7] px-5">
				<div className="rounded-2xl border border-red-200 bg-white p-8 text-center">
					<AlertCircle className="mx-auto text-red-600" />

					<p className="mt-3 text-sm text-red-700">{error}</p>

					<button
						type="button"
						onClick={fetchProducts}
						className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#85161B] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f1116]"
					>
						Try again
					</button>
				</div>
			</main>
		);
	}

	/* ==========================================================================
	   INVENTORY PAGE
	========================================================================== */

	return (
		<main className="min-h-screen bg-[#FBF9F7] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
			<div className="mx-auto max-w-6xl">
				<div className="flex flex-col justify-between gap-4 border-b border-[#E8DED7] pb-7 lg:flex-row lg:items-end">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#85161B]">
							Inventory
						</p>

						<h1 className="mt-2 text-3xl font-bold text-[#2E2E2E]">
							Stock Management
						</h1>

						<p className="mt-2 text-sm text-[#2E2E2E]/55">
							{products.length} products · {availableCount} in stock ·{" "}
							{outOfStockCount} out of stock
						</p>
					</div>

					<Link
						href="/admin/products"
						className="inline-flex items-center gap-2 rounded-xl border border-[#85161B]/20 bg-white px-4 py-2.5 text-sm font-semibold text-[#85161B] transition hover:bg-[#85161B]/5"
					>
						Manage products
					</Link>
				</div>

				{error && (
					<div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
						{error}
					</div>
				)}

				{/* FILTERS */}

				<div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="relative w-full sm:max-w-xs">
						<Search
							size={16}
							className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2E2E2E]/35"
						/>

						<input
							type="text"
							value={searchQuery}
							onChange={(event) => setSearchQuery(event.target.value)}
							placeholder="Search by name or ID..."
							className="w-full rounded-xl border border-[#E8DED7] bg-white py-2.5 pl-10 pr-3.5 text-sm text-[#2E2E2E] outline-none transition focus:border-[#85161B] focus:ring-2 focus:ring-[#85161B]/10"
						/>
					</div>

					<div className="flex items-center gap-2">
						{(
							[
								{ label: "All", value: "all" as const },
								{ label: "In Stock", value: "available" as const },
								{ label: "Out of Stock", value: "out_of_stock" as const },
							] as const
						).map((tab) => (
							<button
								key={tab.value}
								type="button"
								onClick={() => setStatusFilter(tab.value)}
								className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
									statusFilter === tab.value
										? "bg-[#85161B] text-white"
										: "border border-[#E8DED7] bg-white text-[#2E2E2E]/65 hover:border-[#85161B]/30 hover:text-[#85161B]"
								}`}
							>
								{tab.label}
							</button>
						))}
					</div>
				</div>

				{/* PRODUCT LIST */}

				{filteredProducts.length === 0 ? (
					<div className="mt-8 rounded-2xl border border-dashed border-[#E8DED7] bg-white px-6 py-14 text-center">
						<ShoppingBag size={26} className="mx-auto text-[#2E2E2E]/20" />

						<p className="mt-3 text-sm text-[#2E2E2E]/55">
							No products match your search or filter.
						</p>
					</div>
				) : (
					<div className="mt-6 overflow-hidden rounded-2xl border border-[#E8DED7] bg-white">
						<div className="divide-y divide-[#E8DED7]">
							{filteredProducts.map((product) => {
								const isUpdating = updatingProductIds.has(product.id);

								const rowError = rowErrors[product.id];

								return (
									<div
										key={product.id}
										className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6"
									>
										{/* IMAGE */}

										<div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#E8DED7] bg-[#F7F2EE]">
											{product.image ? (
												<img
													src={product.image}
													alt={product.name}
													className="h-full w-full object-cover"
													onError={(event) => {
														event.currentTarget.style.display = "none";
													}}
												/>
											) : (
												<div className="flex h-full w-full items-center justify-center">
													<ShoppingBag
														size={18}
														className="text-[#85161B]/30"
													/>
												</div>
											)}
										</div>

										{/* DETAILS */}

										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-semibold text-[#2E2E2E]">
												{product.name}
											</p>

											<p className="mt-0.5 text-xs text-[#2E2E2E]/45">
												#{product.id} · ₹
												{product.sellingPrice.toLocaleString("en-IN")} ·{" "}
												{product.sold} sold
											</p>

											{rowError && (
												<p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600">
													<AlertCircle size={12} />
													{rowError}
												</p>
											)}
										</div>

										{/* STATUS BADGE */}

										<span
											className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
												product.inStock === "available"
													? "bg-green-50 text-green-700"
													: "bg-red-50 text-red-700"
											}`}
										>
											{product.inStock === "available" ? (
												<CheckCircle2 size={13} />
											) : (
												<PackageX size={13} />
											)}
											{product.inStock === "available"
												? "In Stock"
												: "Out of Stock"}
										</span>

										{/* TOGGLE */}

										<button
											type="button"
											role="switch"
											aria-checked={product.inStock === "available"}
											aria-label={`Toggle stock status for ${product.name}`}
											disabled={isUpdating}
											onClick={() => toggleStock(product)}
											className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
												product.inStock === "available"
													? "bg-[#31824A]"
													: "bg-[#DED6D0]"
											}`}
										>
											{isUpdating ? (
												<span className="absolute inset-0 flex items-center justify-center">
													<Loader2
														size={13}
														className="animate-spin text-white"
													/>
												</span>
											) : (
												<span
													className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
														product.inStock === "available"
															? "translate-x-6"
															: "translate-x-1"
													}`}
												/>
											)}
										</button>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</main>
	);
}