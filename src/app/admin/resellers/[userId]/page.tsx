"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
	ArrowLeft,
	Boxes,
	CheckCircle2,
	Loader2,
	Package,
	Plus,
	RefreshCw,
	Trash2,
	User,
	X,
	Edit3,
	Mail,
	Phone,
	Search,
} from "lucide-react";

/* ─────────────────────────────────────────
   CONFIG
───────────────────────────────────────── */

const PRODUCT_IMAGE_URL = "https://api.printinghouseujjain.in/assets/products/";

const BRAND_COLOR = "#85161B";

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */

const getImageUrl = (path?: string | null) => {
	if (!path) return "";

	if (path.startsWith("http://") || path.startsWith("https://")) {
		return path;
	}

	return `${PRODUCT_IMAGE_URL}${path.replace(/^\/+/, "")}`;
};

const formatCurrency = (value?: string | number | null) => {
	const amount = Number(value);

	if (!Number.isFinite(amount)) {
		return "₹0";
	}

	return `₹${amount.toLocaleString("en-IN", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	})}`;
};

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */

interface UserDetails {
	id: number;
	name: string;
	phone: string;
	email: string;
	is_reseller: string;
	is_reseller_active: string;
	credit_eligibility: string;
}

interface Product {
	id: number;
	name: string;
	description?: string;
	variants?: string;
	primary_photo_path?: string;
	other_photos_paths?: string;
	market_price?: string;
	selling_price?: string;
	reseller_price?: string;
	category_ids?: string;
	occasion_ids?: string;
	in_stock?: string;
	sold?: number;
	customize_reqs?: string;
	keywords?: string;
	created_at?: string;
	updated_at?: string;
	delivery?: string;
	custom_reseller_price?: string;
}

interface Reseller {
	user: UserDetails;
	products: Product[];
}

/*
 * IMPORTANT:
 * API returns:
 *
 * {
 *   status: 200,
 *   data: {
 *      user: {...},
 *      products: [...]
 *   }
 * }
 *
 * So `data` is NOT an array.
 */
interface ResellerApiResponse {
	status: number;
	message?: string;
	data?: Reseller;
}

interface ProductsApiResponse {
	status?: number;
	message?: string;
	data?:
		| Product[]
		| {
				products?: Product[];
		  };
	products?: Product[];
}

/* ─────────────────────────────────────────
   PAGE
───────────────────────────────────────── */

export default function ResellerDetailsPage() {
	const params = useParams();
	const router = useRouter();

	const userId = String(params.userId || "");

	const [reseller, setReseller] = useState<Reseller | null>(null);

	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState("");

	/* ─────────────────────────────────────
	   MODAL STATE
	───────────────────────────────────── */

	const [modal, setModal] = useState<"add" | "change" | "remove" | null>(null);

	const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

	const [resellerPrice, setResellerPrice] = useState("");

	const [updating, setUpdating] = useState(false);

	/* ─────────────────────────────────────
	   ALL PRODUCTS
	───────────────────────────────────── */

	const [allProducts, setAllProducts] = useState<Product[]>([]);

	const [loadingProducts, setLoadingProducts] = useState(false);

	const [productSearch, setProductSearch] = useState("");

	/* ─────────────────────────────────────
	   FETCH RESELLER
	───────────────────────────────────── */

	const fetchReseller = useCallback(
		async (showRefresh = false) => {
			if (!userId) {
				setError("Invalid reseller ID.");
				setLoading(false);
				return;
			}

			try {
				if (showRefresh) {
					setRefreshing(true);
				} else {
					setLoading(true);
				}

				setError("");

				const response = await fetch(
					`/api/admin/resellers?user_id=${encodeURIComponent(userId)}`,
					{
						method: "POST",
						credentials: "include",
						cache: "no-store",
					},
				);

				const text = await response.text();

				let data: ResellerApiResponse;

				try {
					data = JSON.parse(text);
				} catch {
					throw new Error("Invalid response from server.");
				}

				if (!response.ok) {
					throw new Error(data?.message || "Unable to load reseller.");
				}

				if (data?.status !== 200) {
					throw new Error(data?.message || "Unable to load reseller.");
				}

				/*
				 * FIX:
				 *
				 * Old:
				 * const resellerData = data?.data?.[0];
				 *
				 * API actually returns:
				 * data.data = {
				 *    user: {...},
				 *    products: [...]
				 * }
				 *
				 * Therefore use data.data directly.
				 */

				const resellerData = data?.data;

				if (!resellerData?.user) {
					throw new Error("Reseller not found.");
				}

				setReseller({
					...resellerData,
					products: resellerData.products || [],
				});
			} catch (err) {
				console.error("Error fetching reseller:", err);

				setError(
					err instanceof Error ? err.message : "Unable to load reseller.",
				);
			} finally {
				setLoading(false);
				setRefreshing(false);
			}
		},
		[userId],
	);

	useEffect(() => {
		fetchReseller();
	}, [fetchReseller]);

	/* ─────────────────────────────────────
	   FETCH PRODUCTS
	───────────────────────────────────── */

	const fetchAllProducts = useCallback(async () => {
		try {
			setLoadingProducts(true);

			const response = await fetch("/api/admin/products", {
				method: "GET",
				credentials: "include",
				cache: "no-store",
			});

			const text = await response.text();

			let data: ProductsApiResponse;

			try {
				data = JSON.parse(text);
			} catch {
				throw new Error("Invalid products response.");
			}

			if (!response.ok) {
				throw new Error(data?.message || "Unable to load products.");
			}

			let products: Product[] = [];

			if (Array.isArray(data?.data)) {
				products = data.data;
			} else if (
				data?.data &&
				typeof data.data === "object" &&
				Array.isArray(data.data.products)
			) {
				products = data.data.products;
			} else if (Array.isArray(data?.products)) {
				products = data.products;
			}

			setAllProducts(products);
		} catch (err) {
			console.error("Error fetching products:", err);

			alert(err instanceof Error ? err.message : "Unable to load products.");
		} finally {
			setLoadingProducts(false);
		}
	}, []);

	/* ─────────────────────────────────────
	   AVAILABLE PRODUCTS
	───────────────────────────────────── */

	const availableProducts = useMemo(() => {
		const assignedIds = new Set(
			(reseller?.products || []).map((product) => product.id),
		);

		const search = productSearch.trim().toLowerCase();

		return allProducts.filter((product) => {
			if (assignedIds.has(product.id)) {
				return false;
			}

			if (!search) {
				return true;
			}

			return (
				String(product.id).includes(search) ||
				product.name?.toLowerCase().includes(search)
			);
		});
	}, [allProducts, productSearch, reseller?.products]);

	/* ─────────────────────────────────────
	   OPEN ADD MODAL
	───────────────────────────────────── */

	const openAddModal = async () => {
		setSelectedProduct(null);
		setResellerPrice("");
		setProductSearch("");
		setModal("add");

		if (allProducts.length === 0) {
			await fetchAllProducts();
		}
	};

	/* ─────────────────────────────────────
	   OPEN CHANGE MODAL
	───────────────────────────────────── */

	const openChangeModal = (product: Product) => {
		setSelectedProduct(product);

		setResellerPrice(
			product.custom_reseller_price || product.reseller_price || "",
		);

		setModal("change");
	};

	/* ─────────────────────────────────────
	   OPEN REMOVE MODAL
	───────────────────────────────────── */

	const openRemoveModal = (product: Product) => {
		setSelectedProduct(product);
		setModal("remove");
	};

	/* ─────────────────────────────────────
	   CLOSE MODAL
	───────────────────────────────────── */

	const closeModal = () => {
		if (updating) return;

		setModal(null);
		setSelectedProduct(null);
		setResellerPrice("");
		setProductSearch("");
	};

	/* ─────────────────────────────────────
	   UPDATE RESELLER PRODUCT
	───────────────────────────────────── */

	const updateResellerProduct = async (action: "add" | "change" | "remove") => {
		if (!reseller?.user?.id) {
			alert("Invalid reseller.");
			return;
		}

		if (!selectedProduct) {
			alert("Please select a product.");
			return;
		}

		if (
			(action === "add" || action === "change") &&
			(!resellerPrice || Number(resellerPrice) <= 0)
		) {
			alert("Please enter a valid reseller price.");
			return;
		}

		try {
			setUpdating(true);

			const formData = new FormData();

			formData.append("action", action);
			formData.append("user_id", String(reseller.user.id));
			formData.append("product_id", String(selectedProduct.id));

			if (action === "add" || action === "change") {
				formData.append("reseller_price", resellerPrice);
			}

			const response = await fetch("/api/admin/update_reseller", {
				method: "POST",
				credentials: "include",
				body: formData,
			});

			const text = await response.text();

			let data: {
				status?: number;
				message?: string;
			};

			try {
				data = JSON.parse(text);
			} catch {
				throw new Error("Invalid response from server.");
			}

			if (!response.ok) {
				throw new Error(data?.message || "Unable to update reseller.");
			}

			if (data?.status !== 200) {
				throw new Error(data?.message || "Unable to update reseller.");
			}

			closeModal();

			await fetchReseller(true);

			if (action === "add") {
				alert("Product added to reseller successfully.");
			} else if (action === "change") {
				alert("Reseller price updated successfully.");
			} else {
				alert("Product removed from reseller successfully.");
			}
		} catch (err) {
			console.error("Error updating reseller:", err);

			alert(err instanceof Error ? err.message : "Unable to update reseller.");
		} finally {
			setUpdating(false);
		}
	};

	/* ─────────────────────────────────────
	   LOADING
	───────────────────────────────────── */

	if (loading) {
		return (
			<div className="min-h-screen bg-[#faf7f5] flex items-center justify-center">
				<div className="flex flex-col items-center gap-3">
					<div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-[#85161B] animate-spin" />

					<p className="text-sm text-gray-500">Loading reseller...</p>
				</div>
			</div>
		);
	}

	/* ─────────────────────────────────────
	   ERROR
	───────────────────────────────────── */

	if (error || !reseller) {
		return (
			<div className="min-h-screen bg-[#faf7f5] flex items-center justify-center px-4">
				<div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
					<div className="mx-auto mb-5 w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
						<X className="w-7 h-7 text-red-600" />
					</div>

					<h1 className="text-xl font-semibold text-gray-900">
						Unable to load reseller
					</h1>

					<p className="mt-2 text-sm text-gray-500">
						{error || "Reseller information could not be found."}
					</p>

					<div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
						<Link
							href="/admin/resellers"
							className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition"
						>
							<ArrowLeft className="w-4 h-4" />
							Back to Resellers
						</Link>

						<button
							type="button"
							onClick={() => fetchReseller()}
							className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium hover:opacity-90 transition"
							style={{
								backgroundColor: BRAND_COLOR,
							}}
						>
							<RefreshCw className="w-4 h-4" />
							Try Again
						</button>
					</div>
				</div>
			</div>
		);
	}

	const user = reseller.user;
	const products = reseller.products || [];

	const isActive = String(user.is_reseller_active).toLowerCase() === "yes";

	const isCreditEligible =
		String(user.credit_eligibility).toLowerCase() === "eligible";

	/* ─────────────────────────────────────
	   MAIN UI
	───────────────────────────────────── */

	return (
		<div className="min-h-screen bg-[#faf7f5]">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
				{/* ─────────────────────────────
				    HEADER
				───────────────────────────── */}

				<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-7">
					<div className="flex items-start gap-3">
						<Link
							href="/admin/resellers"
							className="mt-1 w-10 h-10 shrink-0 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:text-[#85161B] hover:border-[#85161B]/20 transition"
						>
							<ArrowLeft className="w-5 h-5" />
						</Link>

						<div>
							<div className="flex flex-wrap items-center gap-2">
								<h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
									{user.name}
								</h1>

								{isActive ? (
									<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
										<span className="w-1.5 h-1.5 rounded-full bg-green-500" />
										Active
									</span>
								) : (
									<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
										<span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
										Inactive
									</span>
								)}
							</div>

							<p className="mt-1 text-sm text-gray-500">
								Reseller ID #{user.id}
							</p>
						</div>
					</div>

					<div className="flex flex-col sm:flex-row gap-2">
						<button
							type="button"
							onClick={() => fetchReseller(true)}
							disabled={refreshing}
							className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-60"
						>
							<RefreshCw
								className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
							/>
							Refresh
						</button>

						<button
							type="button"
							onClick={openAddModal}
							className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm hover:opacity-90 transition"
							style={{
								backgroundColor: BRAND_COLOR,
							}}
						>
							<Plus className="w-4 h-4" />
							Add Product
						</button>
					</div>
				</div>

				{/* ─────────────────────────────
				    USER INFO CARDS
				───────────────────────────── */}

				<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
					{/* NAME */}

					<div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
						<div className="flex items-start justify-between">
							<div>
								<p className="text-xs font-medium uppercase tracking-wide text-gray-400">
									Name
								</p>

								<p className="mt-2 font-semibold text-gray-900">
									{user.name || "—"}
								</p>
							</div>

							<div className="w-10 h-10 rounded-xl bg-[#85161B]/10 flex items-center justify-center">
								<User
									className="w-5 h-5"
									style={{
										color: BRAND_COLOR,
									}}
								/>
							</div>
						</div>
					</div>

					{/* EMAIL */}

					<div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
						<div className="flex items-start justify-between">
							<div className="min-w-0 pr-3">
								<p className="text-xs font-medium uppercase tracking-wide text-gray-400">
									Email
								</p>

								<p className="mt-2 font-semibold text-gray-900 truncate">
									{user.email || "—"}
								</p>
							</div>

							<div className="w-10 h-10 shrink-0 rounded-xl bg-[#85161B]/10 flex items-center justify-center">
								<Mail
									className="w-5 h-5"
									style={{
										color: BRAND_COLOR,
									}}
								/>
							</div>
						</div>
					</div>

					{/* PHONE */}

					<div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
						<div className="flex items-start justify-between">
							<div>
								<p className="text-xs font-medium uppercase tracking-wide text-gray-400">
									Phone
								</p>

								<p className="mt-2 font-semibold text-gray-900">
									{user.phone || "—"}
								</p>
							</div>

							<div className="w-10 h-10 rounded-xl bg-[#85161B]/10 flex items-center justify-center">
								<Phone
									className="w-5 h-5"
									style={{
										color: BRAND_COLOR,
									}}
								/>
							</div>
						</div>
					</div>

					{/* PRODUCTS */}

					<div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
						<div className="flex items-start justify-between">
							<div>
								<p className="text-xs font-medium uppercase tracking-wide text-gray-400">
									Assigned Products
								</p>

								<p className="mt-2 text-2xl font-bold text-gray-900">
									{products.length}
								</p>
							</div>

							<div className="w-10 h-10 rounded-xl bg-[#85161B]/10 flex items-center justify-center">
								<Boxes
									className="w-5 h-5"
									style={{
										color: BRAND_COLOR,
									}}
								/>
							</div>
						</div>
					</div>
				</div>

				{/* ─────────────────────────────
				    STATUS SECTION
				───────────────────────────── */}

				<div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6 mb-6">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div>
							<h2 className="text-base font-semibold text-gray-900">
								Reseller Status
							</h2>

							<p className="text-sm text-gray-500 mt-1">
								Account status and credit eligibility
							</p>
						</div>

						<div className="flex flex-wrap gap-3">
							<div
								className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium ${
									isActive
										? "bg-green-50 text-green-700"
										: "bg-gray-100 text-gray-600"
								}`}
							>
								{isActive ? (
									<CheckCircle2 className="w-4 h-4" />
								) : (
									<X className="w-4 h-4" />
								)}

								{isActive ? "Reseller Active" : "Reseller Inactive"}
							</div>

							<div
								className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium ${
									isCreditEligible
										? "bg-blue-50 text-blue-700"
										: "bg-orange-50 text-orange-700"
								}`}
							>
								<CheckCircle2 className="w-4 h-4" />

								{isCreditEligible ? "Credit Eligible" : "Credit Not Eligible"}
							</div>
						</div>
					</div>
				</div>

				{/* ─────────────────────────────
				    PRODUCTS HEADER
				───────────────────────────── */}

				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
					<div>
						<h2 className="text-xl font-bold text-gray-900">
							Assigned Products
						</h2>

						<p className="text-sm text-gray-500 mt-1">
							Manage products and reseller-specific pricing.
						</p>
					</div>

					<div className="inline-flex items-center gap-2 text-sm text-gray-500">
						<Package className="w-4 h-4" />
						{products.length} {products.length === 1 ? "product" : "products"}
					</div>
				</div>

				{/* ─────────────────────────────
				    EMPTY STATE
				───────────────────────────── */}

				{products.length === 0 ? (
					<div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 sm:p-14 text-center">
						<div className="mx-auto w-16 h-16 rounded-2xl bg-[#85161B]/10 flex items-center justify-center">
							<Package
								className="w-8 h-8"
								style={{
									color: BRAND_COLOR,
								}}
							/>
						</div>

						<h3 className="mt-5 text-lg font-semibold text-gray-900">
							No products assigned
						</h3>

						<p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
							This reseller doesn't have any products assigned yet. Add a
							product to get started.
						</p>

						<button
							type="button"
							onClick={openAddModal}
							className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition"
							style={{
								backgroundColor: BRAND_COLOR,
							}}
						>
							<Plus className="w-4 h-4" />
							Add Product
						</button>
					</div>
				) : (
					/* ─────────────────────────────
					   PRODUCT GRID
					───────────────────────────── */

					<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
						{products.map((product) => {
							const image = getImageUrl(product.primary_photo_path);

							const resellerProductPrice =
								product.custom_reseller_price || product.reseller_price;

							return (
								<div
									key={product.id}
									className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition"
								>
									{/* IMAGE */}

									<div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
										{image ? (
											<img
												src={image}
												alt={product.name || "Product"}
												className="w-full h-full object-cover"
											/>
										) : (
											<div className="w-full h-full flex items-center justify-center">
												<Package className="w-12 h-12 text-gray-300" />
											</div>
										)}

										<div className="absolute top-3 left-3">
											<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur text-xs font-semibold text-gray-700 shadow-sm">
												#{product.id}
											</span>
										</div>
									</div>

									{/* CONTENT */}

									<div className="p-5">
										<div className="min-h-[52px]">
											<h3 className="font-semibold text-gray-900 line-clamp-2">
												{product.name || "Unnamed Product"}
											</h3>
										</div>

										{/* PRICES */}

										<div className="mt-4 grid grid-cols-3 gap-2">
											<div className="rounded-xl bg-gray-50 p-3">
												<p className="text-[10px] uppercase tracking-wide font-medium text-gray-400">
													Market
												</p>

												<p className="mt-1 text-sm font-semibold text-gray-900">
													{formatCurrency(product.market_price)}
												</p>
											</div>

											<div className="rounded-xl bg-gray-50 p-3">
												<p className="text-[10px] uppercase tracking-wide font-medium text-gray-400">
													Selling
												</p>

												<p className="mt-1 text-sm font-semibold text-gray-900">
													{formatCurrency(product.selling_price)}
												</p>
											</div>

											<div className="rounded-xl bg-[#85161B]/5 p-3">
												<p className="text-[10px] uppercase tracking-wide font-medium text-[#85161B]/70">
													Reseller
												</p>

												<p
													className="mt-1 text-sm font-bold"
													style={{
														color: BRAND_COLOR,
													}}
												>
													{formatCurrency(resellerProductPrice)}
												</p>
											</div>
										</div>

										{/* ACTIONS */}

										<div className="mt-5 grid grid-cols-2 gap-2">
											<button
												type="button"
												onClick={() => openChangeModal(product)}
												className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition"
											>
												<Edit3 className="w-4 h-4" />
												Change Price
											</button>

											<button
												type="button"
												onClick={() => openRemoveModal(product)}
												className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-red-100 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition"
											>
												<Trash2 className="w-4 h-4" />
												Remove
											</button>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* ═════════════════════════════════
			    ADD PRODUCT MODAL
			═════════════════════════════════ */}

			{modal === "add" && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div
						className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
						onClick={closeModal}
					/>

					<div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
						{/* HEADER */}

						<div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100">
							<div>
								<h2 className="text-lg font-bold text-gray-900">Add Product</h2>

								<p className="text-sm text-gray-500 mt-0.5">
									Select a product to assign to this reseller.
								</p>
							</div>

							<button
								type="button"
								onClick={closeModal}
								className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						{/* SEARCH */}

						<div className="px-5 sm:px-6 pt-4">
							<div className="relative">
								<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

								<input
									type="text"
									value={productSearch}
									onChange={(e) => setProductSearch(e.target.value)}
									placeholder="Search by product name or ID..."
									className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:bg-white focus:border-[#85161B]/40 focus:ring-2 focus:ring-[#85161B]/10 transition"
								/>
							</div>
						</div>

						{/* PRODUCT LIST */}

						<div className="flex-1 overflow-y-auto p-5 sm:p-6">
							{loadingProducts ? (
								<div className="flex flex-col items-center justify-center py-12">
									<Loader2
										className="w-7 h-7 animate-spin"
										style={{
											color: BRAND_COLOR,
										}}
									/>

									<p className="mt-3 text-sm text-gray-500">
										Loading products...
									</p>
								</div>
							) : availableProducts.length === 0 ? (
								<div className="text-center py-12">
									<Package className="mx-auto w-10 h-10 text-gray-300" />

									<p className="mt-3 text-sm font-medium text-gray-700">
										No products found
									</p>

									<p className="mt-1 text-xs text-gray-400">
										All matching products may already be assigned.
									</p>
								</div>
							) : (
								<div className="space-y-2">
									{availableProducts.map((product) => {
										const image = getImageUrl(product.primary_photo_path);

										return (
											<button
												key={product.id}
												type="button"
												onClick={() => {
													setSelectedProduct(product);

													setResellerPrice(product.reseller_price || "");
												}}
												className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition ${
													selectedProduct?.id === product.id
														? "border-[#85161B]/40 bg-[#85161B]/5"
														: "border-gray-200 hover:bg-gray-50"
												}`}
											>
												<div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
													{image ? (
														<img
															src={image}
															alt={product.name}
															className="w-full h-full object-cover"
														/>
													) : (
														<div className="w-full h-full flex items-center justify-center">
															<Package className="w-6 h-6 text-gray-300" />
														</div>
													)}
												</div>

												<div className="min-w-0 flex-1">
													<p className="font-medium text-sm text-gray-900 truncate">
														{product.name}
													</p>

													<p className="text-xs text-gray-400 mt-0.5">
														ID #{product.id}
													</p>

													<p className="text-xs text-gray-500 mt-1">
														Selling:{" "}
														<span className="font-medium text-gray-700">
															{formatCurrency(product.selling_price)}
														</span>
													</p>
												</div>

												{selectedProduct?.id === product.id && (
													<CheckCircle2
														className="w-5 h-5 shrink-0"
														style={{
															color: BRAND_COLOR,
														}}
													/>
												)}
											</button>
										);
									})}
								</div>
							)}
						</div>

						{/* SELECTED PRODUCT / PRICE */}

						{selectedProduct && (
							<div className="px-5 sm:px-6 py-4 border-t border-gray-100 bg-gray-50">
								<div className="flex flex-col sm:flex-row sm:items-end gap-3">
									<div className="flex-1">
										<label className="block text-xs font-semibold text-gray-600 mb-1.5">
											Reseller Price
										</label>

										<div className="relative">
											<span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
												₹
											</span>

											<input
												type="number"
												min="0"
												step="0.01"
												value={resellerPrice}
												onChange={(e) => setResellerPrice(e.target.value)}
												placeholder="Enter reseller price"
												className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#85161B]/40 focus:ring-2 focus:ring-[#85161B]/10"
											/>
										</div>
									</div>

									<button
										type="button"
										disabled={updating || !resellerPrice}
										onClick={() => updateResellerProduct("add")}
										className="sm:w-auto px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition"
										style={{
											backgroundColor: BRAND_COLOR,
										}}
									>
										{updating ? (
											<span className="inline-flex items-center gap-2">
												<Loader2 className="w-4 h-4 animate-spin" />
												Adding...
											</span>
										) : (
											"Add Product"
										)}
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{/* ═════════════════════════════════
			    CHANGE PRICE MODAL
			═════════════════════════════════ */}

			{modal === "change" && selectedProduct && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div
						className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
						onClick={closeModal}
					/>

					<div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
						<div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100">
							<div>
								<h2 className="text-lg font-bold text-gray-900">
									Change Reseller Price
								</h2>

								<p className="text-sm text-gray-500 mt-0.5">
									Update the price for this reseller.
								</p>
							</div>

							<button
								type="button"
								onClick={closeModal}
								className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						<div className="p-5 sm:p-6">
							<div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 mb-5">
								<div className="w-12 h-12 rounded-lg bg-white overflow-hidden shrink-0">
									{getImageUrl(selectedProduct.primary_photo_path) ? (
										<img
											src={getImageUrl(selectedProduct.primary_photo_path)}
											alt={selectedProduct.name}
											className="w-full h-full object-cover"
										/>
									) : (
										<div className="w-full h-full flex items-center justify-center">
											<Package className="w-5 h-5 text-gray-300" />
										</div>
									)}
								</div>

								<div className="min-w-0">
									<p className="text-sm font-semibold text-gray-900 truncate">
										{selectedProduct.name}
									</p>

									<p className="text-xs text-gray-400 mt-0.5">
										ID #{selectedProduct.id}
									</p>
								</div>
							</div>

							<div>
								<label className="block text-sm font-semibold text-gray-700 mb-2">
									Reseller Price
								</label>

								<div className="relative">
									<span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
										₹
									</span>

									<input
										type="number"
										min="0"
										step="0.01"
										autoFocus
										value={resellerPrice}
										onChange={(e) => setResellerPrice(e.target.value)}
										className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 outline-none focus:border-[#85161B]/40 focus:ring-2 focus:ring-[#85161B]/10"
									/>
								</div>
							</div>

							<div className="mt-6 flex gap-2">
								<button
									type="button"
									onClick={closeModal}
									disabled={updating}
									className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition"
								>
									Cancel
								</button>

								<button
									type="button"
									onClick={() => updateResellerProduct("change")}
									disabled={updating || !resellerPrice}
									className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition"
									style={{
										backgroundColor: BRAND_COLOR,
									}}
								>
									{updating ? (
										<span className="inline-flex items-center gap-2">
											<Loader2 className="w-4 h-4 animate-spin" />
											Updating...
										</span>
									) : (
										"Update Price"
									)}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* ═════════════════════════════════
			    REMOVE PRODUCT MODAL
			═════════════════════════════════ */}

			{modal === "remove" && selectedProduct && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div
						className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
						onClick={closeModal}
					/>

					<div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
						<div className="p-5 sm:p-6">
							<div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
								<Trash2 className="w-6 h-6 text-red-600" />
							</div>

							<div className="text-center mt-4">
								<h2 className="text-lg font-bold text-gray-900">
									Remove Product?
								</h2>

								<p className="mt-2 text-sm text-gray-500 leading-relaxed">
									Are you sure you want to remove{" "}
									<span className="font-semibold text-gray-700">
										{selectedProduct.name}
									</span>{" "}
									from this reseller?
								</p>
							</div>

							<div className="mt-6 flex gap-2">
								<button
									type="button"
									onClick={closeModal}
									disabled={updating}
									className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition"
								>
									Cancel
								</button>

								<button
									type="button"
									onClick={() => updateResellerProduct("remove")}
									disabled={updating}
									className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition"
								>
									{updating ? (
										<>
											<Loader2 className="w-4 h-4 animate-spin" />
											Removing...
										</>
									) : (
										<>
											<Trash2 className="w-4 h-4" />
											Remove
										</>
									)}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
