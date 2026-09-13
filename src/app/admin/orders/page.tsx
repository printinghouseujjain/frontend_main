"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	ArrowLeft,
	Search,
	ChevronRight,
	ClipboardList,
	Loader2,
	AlertCircle,
	MapPin,
	Store,
	LogOut,
	Package,
	User,
	CalendarDays,
} from "lucide-react";

/* ============================================================================
   TYPES
============================================================================ */

type OrderStatus = "Delivered" | "Processing" | "Shipped" | "Pending" | string;

type CartProduct = {
	id?: number | string;
	name?: string;
	quantity?: number | string;
	qty?: number | string;
	price?: number | string;
	total_price?: number | string;
	[key: string]: unknown;
};

type OrderAddress = {
	name?: string;
	flat_house_building?: string;
	road_area_colony?: string;
	city?: string;
	state?: string;
	pincode?: string;
	landmark?: string;
	phone?: string;
	[key: string]: unknown;
};

type BackendOrder = {
	id: number | string;
	user_id?: number | string | null;
	cart_id?: number | string | null;
	type?: string | null;
	delivery_method?: string | null;
	order_id?: string | null;
	payment_status?: string | null;
	order_status?: string | null;
	address?: string | OrderAddress | null;
	transaction_id?: string | null;
	products_count?: number | string | null;
	total_price?: number | string | null;
	delivery_fee?: number | string | null;
	grand_total?: number | string | null;
	cart?: string | CartProduct[] | null;
	created_at?: string | null;
	createdAt?: string | null;
	order_date?: string | null;
	orderDate?: string | null;
	date?: string | null;

	[key: string]: unknown;
};

type Order = {
	id: string;
	customer: string;
	product: string;
	items: number;
	amount: number;
	status: OrderStatus;
	date: string;
	address: string;
	// Raw timestamp (ms since epoch, or 0 if unparseable) used purely for
	// sorting — we don't rely on the API returning orders in date order.
	sortValue: number;
};

/* ============================================================================
   STATUS FILTERS
============================================================================ */

const STATUS_FILTERS: (OrderStatus | "All")[] = [
	"All",
	"Pending",
	"Processing",
	"Shipped",
	"Delivered",
];

/* ============================================================================
   PAGINATION
============================================================================ */

const PAGE_SIZE = 20;

/* ============================================================================
   STATUS STYLES
============================================================================ */

const STATUS_STYLES: Record<string, string> = {
	Delivered: "bg-[#EDF8F0] text-[#31824A]",
	Processing: "bg-[#EEF5FF] text-[#3973B9]",
	Shipped: "bg-[#F3EBFA] text-[#8B4FC7]",
	Pending: "bg-[#FFF3E8] text-[#B56B27]",

	delivered: "bg-[#EDF8F0] text-[#31824A]",
	processing: "bg-[#EEF5FF] text-[#3973B9]",
	shipped: "bg-[#F3EBFA] text-[#8B4FC7]",
	pending: "bg-[#FFF3E8] text-[#B56B27]",
};

/* ============================================================================
   STATUS DOT
============================================================================ */

const STATUS_DOTS: Record<string, string> = {
	Delivered: "bg-[#31824A]",
	Processing: "bg-[#3973B9]",
	Shipped: "bg-[#8B4FC7]",
	Pending: "bg-[#B56B27]",
};

/* ============================================================================
   PARSE CART
============================================================================ */

function parseCart(
	cart: string | CartProduct[] | null | undefined,
): CartProduct[] {
	if (!cart) {
		return [];
	}

	if (Array.isArray(cart)) {
		return cart;
	}

	try {
		const parsed = JSON.parse(cart);

		return Array.isArray(parsed) ? parsed : [];
	} catch (error) {
		console.error("Failed to parse order cart:", error);
		return [];
	}
}

/* ============================================================================
   PARSE ADDRESS
============================================================================ */

function parseAddress(
	address: string | OrderAddress | null | undefined,
): OrderAddress | null {
	if (!address) {
		return null;
	}

	if (typeof address === "object") {
		return address;
	}

	try {
		const parsed = JSON.parse(address);

		if (typeof parsed === "object" && parsed !== null) {
			return parsed;
		}

		return null;
	} catch (error) {
		console.error("Failed to parse order address:", error);

		return null;
	}
}

/* ============================================================================
   FORMAT ADDRESS
============================================================================ */

function formatAddress(
	address: string | OrderAddress | null | undefined,
): string {
	const parsed = parseAddress(address);

	if (!parsed) {
		return "—";
	}

	const parts = [
		parsed.flat_house_building,
		parsed.road_area_colony,
		parsed.landmark,
		parsed.city,
		parsed.state,
		parsed.pincode,
	].filter(
		(value) =>
			value !== undefined && value !== null && String(value).trim() !== "",
	);

	return parts.length > 0 ? parts.join(", ") : "—";
}

/* ============================================================================
   FORMAT STATUS
============================================================================ */

function formatStatus(status: unknown): string {
	if (!status) {
		return "Pending";
	}

	const value = String(status).trim().toLowerCase();

	switch (value) {
		case "pending":
			return "Pending";

		case "processing":
		case "process":
		case "confirmed":
		case "confirm":
			return "Processing";

		case "shipped":
		case "shipping":
		case "dispatch":
		case "dispatched":
		case "out_for_delivery":
		case "out for delivery":
			return "Shipped";

		case "delivered":
		case "completed":
		case "complete":
			return "Delivered";

		default:
			return String(status);
	}
}

/* ============================================================================
   FORMAT DATE
============================================================================ */

function formatDate(value: unknown): string {
	if (!value) {
		return "—";
	}

	const valueString = String(value);

	const date = new Date(valueString);

	if (Number.isNaN(date.getTime())) {
		return valueString;
	}

	return date.toLocaleDateString("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

/* ============================================================================
   GET SORTABLE TIME

   Turns the raw (unformatted) date value into a millisecond timestamp so
   orders can be sorted explicitly in code, instead of trusting the order
   the API happens to return them in. Unparseable/missing dates sort to
   the bottom (treated as oldest) rather than crashing the sort.
============================================================================ */

function getSortableTime(value: unknown): number {
	if (!value) {
		return 0;
	}

	const time = new Date(String(value)).getTime();

	return Number.isNaN(time) ? 0 : time;
}

/* ============================================================================
   FORMAT AMOUNT
============================================================================ */

function formatAmount(value: unknown): number {
	const amount = Number(value);

	return Number.isFinite(amount) ? amount : 0;
}

/* ============================================================================
   GET CUSTOMER
============================================================================ */

function getCustomerName(order: BackendOrder): string {
	const userId = order.user_id;

	if (userId === null || userId === undefined || String(userId).trim() === "") {
		return "Guest";
	}

	return `User #${userId}`;
}

/* ============================================================================
   NORMALIZE ORDER
============================================================================ */

function normalizeOrder(order: BackendOrder): Order {
	const cartProducts = parseCart(order.cart);

	const firstProduct = cartProducts[0];

	const productName =
		firstProduct?.name || (cartProducts.length > 0 ? "Order items" : "—");

	const calculatedItems = cartProducts.reduce((total, product) => {
		const quantity = Number(product.quantity ?? product.qty ?? 1) || 1;

		return total + quantity;
	}, 0);

	const items = Number(order.products_count) || calculatedItems || 1;

	const amount =
		formatAmount(order.grand_total) || formatAmount(order.total_price);

	const dateValue =
		order.created_at ??
		order.createdAt ??
		order.order_date ??
		order.orderDate ??
		order.date;

	return {
		id: String(order.order_id ?? order.id),

		customer: getCustomerName(order),

		product: productName,

		items,

		amount,

		status: formatStatus(order.order_status),

		date: formatDate(dateValue),

		address: formatAddress(order.address),

		sortValue: getSortableTime(dateValue),
	};
}

/* ============================================================================
   EXTRACT ORDERS
============================================================================ */

function extractOrders(data: unknown): Order[] {
	if (typeof data !== "object" || data === null) {
		return [];
	}

	const response = data as {
		orders?: unknown;
	};

	if (!Array.isArray(response.orders)) {
		return [];
	}

	return (
		response.orders
			.filter(
				(order): order is BackendOrder =>
					typeof order === "object" && order !== null && !Array.isArray(order),
			)
			.map(normalizeOrder)
			// Newest first — sorted explicitly here rather than relying on
			// whatever order the API happens to return.
			.sort((a, b) => b.sortValue - a.sortValue)
	);
}

/* ============================================================================
   PAGE
============================================================================ */

export default function AdminOrdersPage() {
	const router = useRouter();

	const [orders, setOrders] = useState<Order[]>([]);
	const [query, setQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<OrderStatus | "All">("All");

	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");
	const [loggingOut, setLoggingOut] = useState(false);
	const [page, setPage] = useState(1);

	/* ========================================================================
	   FETCH ORDERS
	========================================================================= */

	useEffect(() => {
		let isMounted = true;

		const fetchOrders = async () => {
			try {
				setIsLoading(true);
				setError("");

				const response = await fetch("/api/admin/orders", {
					method: "GET",
					credentials: "include",
					cache: "no-store",
				});

				const text = await response.text();

				let data: unknown;

				try {
					data = text ? JSON.parse(text) : {};
				} catch {
					throw new Error("Invalid JSON response from admin orders API.");
				}

				if (!response.ok) {
					let message = "Unable to fetch admin orders.";

					if (
						typeof data === "object" &&
						data !== null &&
						"message" in data &&
						typeof data.message === "string"
					) {
						message = data.message;
					}

					throw new Error(message);
				}

				const fetchedOrders = extractOrders(data);

				if (isMounted) {
					setOrders(fetchedOrders);
				}
			} catch (error) {
				console.error("Failed to fetch admin orders:", error);

				if (isMounted) {
					setOrders([]);

					setError(
						error instanceof Error
							? error.message
							: "Unable to fetch orders. Please try again.",
					);
				}
			} finally {
				if (isMounted) {
					setIsLoading(false);
				}
			}
		};

		fetchOrders();

		return () => {
			isMounted = false;
		};
	}, []);

	/* ========================================================================
	   FILTER
	========================================================================= */

	const filteredOrders = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();

		return orders.filter((order) => {
			const matchesStatus =
				statusFilter === "All" ||
				order.status.toLowerCase() === statusFilter.toLowerCase();

			const matchesQuery =
				normalizedQuery === "" ||
				order.id.toLowerCase().includes(normalizedQuery) ||
				order.customer.toLowerCase().includes(normalizedQuery) ||
				order.product.toLowerCase().includes(normalizedQuery) ||
				order.address.toLowerCase().includes(normalizedQuery);

			return matchesStatus && matchesQuery;
		});
	}, [orders, query, statusFilter]);

	/* ========================================================================
	   PAGINATE
	========================================================================= */

	const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));

	// Keep the current page in range whenever the filtered result set
	// shrinks (e.g. a new search term or status filter narrows things down).
	useEffect(() => {
		setPage((current) => Math.min(current, totalPages));
	}, [totalPages]);

	// Jump back to page 1 whenever the search term or status filter changes,
	// so the user doesn't land on an empty page of stale results.
	useEffect(() => {
		setPage(1);
	}, [query, statusFilter]);

	const paginatedOrders = useMemo(() => {
		const start = (page - 1) * PAGE_SIZE;

		return filteredOrders.slice(start, start + PAGE_SIZE);
	}, [filteredOrders, page]);

	const rangeStart =
		filteredOrders.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

	const rangeEnd = Math.min(page * PAGE_SIZE, filteredOrders.length);

	/* ========================================================================
	   LOGOUT
	========================================================================= */

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
					(data as { message?: string })?.message || "Unable to logout.",
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

	/* ========================================================================
	   RENDER
	========================================================================= */

	return (
		<main className="min-h-screen bg-[#FBF9F7]">
			<style>{`
				@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap');

				.font-display {
					font-family: 'Fraunces', Georgia, serif;
				}
			`}</style>

			{/* ================================================================
			    HEADER
			================================================================ */}

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
						px-4
						sm:px-6
						lg:px-8
					"
				>
					<Link
						href="/admin"
						className="group flex min-w-0 items-center gap-2.5 sm:gap-3"
					>
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
							<img
								src="https://api.printinghouseujjain.in/assets/logo.png"
								alt="Printing House"
								className="h-10 w-10 object-contain"
							/>
						</div>

						<div className="hidden min-w-0 sm:block">
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

							<p className="mt-0.5 text-sm font-semibold text-[#2E2E2E]">
								Admin Dashboard
							</p>
						</div>
					</Link>

					<div className="flex shrink-0 items-center gap-2 sm:gap-3">
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

						{/* PROFILE */}

						<div
							className="
								flex
								items-center
								gap-2.5
								rounded-xl
								border
								border-[#E8DED7]
								bg-white
								px-2
								py-2
								sm:px-2.5
							"
						>
							<div
								className="
									flex
									h-8
									w-8
									shrink-0
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
								px-3
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

			{/* ================================================================
			    CONTENT
			================================================================ */}

			<div className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
				{/* BACK */}

				<Link
					href="/admin"
					className="
						inline-flex
						items-center
						gap-2
						text-sm
						font-medium
						text-[#2E2E2E]/55
						transition-colors
						hover:text-[#85161B]
					"
				>
					<ArrowLeft size={16} />
					<span>Back to dashboard</span>
				</Link>

				{/* PAGE TITLE */}

				<div className="mt-5 sm:mt-6">
					<p
						className="
							text-[11px]
							font-semibold
							uppercase
							tracking-[0.18em]
							text-[#85161B]
							sm:text-xs
						"
					>
						Orders
					</p>

					<h1
						className="
							font-display
							mt-1
							text-3xl
							font-bold
							text-[#2E2E2E]
							sm:text-4xl
						"
					>
						All Orders
					</h1>

					<p className="mt-2 text-sm text-[#2E2E2E]/55">
						{isLoading
							? "Loading orders..."
							: `${filteredOrders.length} of ${orders.length} orders`}
					</p>
				</div>

				{/* ============================================================
				    SEARCH
				============================================================ */}

				<div className="mt-5">
					<div className="relative w-full sm:max-w-md">
						<Search
							size={17}
							className="
								pointer-events-none
								absolute
								left-3.5
								top-1/2
								-translate-y-1/2
								text-[#2E2E2E]/35
							"
						/>

						<input
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search order, customer, product..."
							className="
								w-full
								rounded-xl
								border
								border-[#E8DED7]
								bg-white
								py-3
								pl-10
								pr-4
								text-sm
								text-[#2E2E2E]
								outline-none
								transition
								placeholder:text-[#2E2E2E]/35
								focus:border-[#85161B]/40
								focus:ring-2
								focus:ring-[#85161B]/10
							"
						/>
					</div>
				</div>

				{/* ============================================================
				    STATUS FILTERS
				============================================================ */}

				<div
					className="
						mt-3
						-flex
						flex
						gap-2
						overflow-x-auto
						pb-1
						[-ms-overflow-style:none]
						[scrollbar-width:none]
						[&::-webkit-scrollbar]:hidden
						sm:flex-wrap
						sm:overflow-visible
					"
				>
					{STATUS_FILTERS.map((status) => (
						<button
							key={status}
							type="button"
							onClick={() => setStatusFilter(status)}
							className={`
								shrink-0
								whitespace-nowrap
								rounded-full
								px-4
								py-2.5
								text-xs
								font-medium
								transition-all
								sm:px-3.5
								sm:py-2
								${
									statusFilter === status
										? "bg-[#85161B] text-white shadow-sm"
										: "border border-[#E8DED7] bg-white text-[#2E2E2E]/60 hover:border-[#85161B]/30"
								}
							`}
						>
							{status}
						</button>
					))}
				</div>

				{/* ============================================================
				    ERROR
				============================================================ */}

				{error && (
					<div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 sm:px-5">
						<AlertCircle size={19} className="mt-0.5 shrink-0 text-red-600" />

						<div>
							<p className="text-sm font-semibold text-red-700">
								Unable to load orders
							</p>

							<p className="mt-1 text-xs text-red-600">{error}</p>
						</div>
					</div>
				)}

				{/* ============================================================
				    ORDERS CONTAINER
				============================================================ */}

				<div className="mt-5">
					{isLoading ? (
						<div
							className="
								flex
								min-h-[350px]
								flex-col
								items-center
								justify-center
								rounded-2xl
								border
								border-[#E9DED7]
								bg-white
								px-6
								text-center
							"
						>
							<div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F7D6BF]/40">
								<Loader2 size={24} className="animate-spin text-[#85161B]" />
							</div>

							<p className="mt-4 text-sm font-semibold text-[#2E2E2E]">
								Loading orders
							</p>

							<p className="mt-1 text-xs text-[#2E2E2E]/45">
								Fetching orders from the server...
							</p>
						</div>
					) : filteredOrders.length > 0 ? (
						<>
							{/* ==================================================
							    MOBILE CARDS
							================================================== */}

							<div className="space-y-3 lg:hidden">
								{paginatedOrders.map((order, index) => (
									<Link
										key={`${order.id}-${index}`}
										href={`/admin/orders/${order.id}`}
										className="
												block
												rounded-2xl
												border
												border-[#E9DED7]
												bg-white
												p-4
												shadow-[0_1px_2px_rgba(0,0,0,0.02)]
												transition
												active:scale-[0.995]
												hover:border-[#85161B]/20
											"
									>
										{/* TOP */}

										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2E2E2E]/40">
													Order
												</p>

												<p className="mt-1 truncate text-base font-bold text-[#85161B]">
													#{order.id}
												</p>
											</div>

											<div className="flex shrink-0 items-center gap-2">
												<span
													className={`
															inline-flex
															items-center
															gap-1.5
															rounded-full
															px-2.5
															py-1.5
															text-[11px]
															font-semibold
															${STATUS_STYLES[order.status] || "bg-gray-100 text-gray-600"}
														`}
												>
													<span
														className={`
																h-1.5
																w-1.5
																rounded-full
																${STATUS_DOTS[order.status] || "bg-gray-500"}
															`}
													/>

													{order.status}
												</span>

												<ChevronRight size={17} className="text-[#2E2E2E]/25" />
											</div>
										</div>

										{/* DIVIDER */}

										<div className="my-3 border-t border-[#EEE6E1]" />

										{/* CUSTOMER + PRODUCT */}

										<div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
											<div className="min-w-0">
												<div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#2E2E2E]/35">
													<User size={12} />
													Customer
												</div>

												<p
													className={`
															mt-1
															truncate
															text-sm
															${
																order.customer === "Guest"
																	? "font-semibold text-[#8A6A5B]"
																	: "font-medium text-[#2E2E2E]"
															}
														`}
												>
													{order.customer}
												</p>
											</div>

											<div className="min-w-0">
												<div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#2E2E2E]/35">
													<Package size={12} />
													Product
												</div>

												<p
													className="mt-1 truncate text-sm font-medium text-[#2E2E2E]"
													title={order.product}
												>
													{order.product}
												</p>

												{order.items > 1 && (
													<p className="mt-0.5 text-[11px] text-[#2E2E2E]/40">
														+{order.items - 1} more item
														{order.items - 1 > 1 ? "s" : ""}
													</p>
												)}
											</div>
										</div>

										{/* AMOUNT + DATE */}

										<div className="mt-4 flex items-center justify-between rounded-xl bg-[#FBF9F7] px-3.5 py-3">
											<div>
												<p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#2E2E2E]/35">
													Amount
												</p>

												<p className="mt-0.5 text-base font-bold text-[#2E2E2E]">
													₹{order.amount.toLocaleString("en-IN")}
												</p>
											</div>

											<div className="text-right">
												<div className="flex items-center justify-end gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#2E2E2E]/35">
													<CalendarDays size={12} />
													Date
												</div>

												<p className="mt-0.5 text-xs font-medium text-[#2E2E2E]/60">
													{order.date}
												</p>
											</div>
										</div>

										{/* ADDRESS */}

										<div className="mt-3 flex items-start gap-2.5">
											<div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F7D6BF]/40">
												<MapPin size={14} className="text-[#85161B]" />
											</div>

											<div className="min-w-0">
												<p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#2E2E2E]/35">
													Delivery Address
												</p>

												<p
													className="mt-1 line-clamp-2 text-xs leading-5 text-[#2E2E2E]/60"
													title={order.address}
												>
													{order.address}
												</p>
											</div>
										</div>
									</Link>
								))}
							</div>

							{/* ==================================================
							    DESKTOP TABLE
							================================================== */}

							<div className="hidden overflow-hidden rounded-2xl border border-[#E9DED7] bg-white lg:block">
								<div className="w-full overflow-x-auto">
									<table className="w-full min-w-[1050px] text-left text-sm">
										<thead>
											<tr className="border-b border-[#EEE6E1] text-xs text-[#2E2E2E]/40">
												<th className="px-5 py-4 font-medium">Order</th>

												<th className="px-5 py-4 font-medium">Customer</th>

												<th className="px-5 py-4 font-medium">Product</th>

												<th className="px-5 py-4 font-medium">Amount</th>

												<th className="px-5 py-4 font-medium">Status</th>

												<th className="px-5 py-4 font-medium">Address</th>

												<th className="px-5 py-4 font-medium">Date</th>
											</tr>
										</thead>

										<tbody className="divide-y divide-[#EEE6E1]">
											{paginatedOrders.map((order, index) => (
												<tr
													key={`${order.id}-${index}`}
													className="transition-colors hover:bg-[#FBF9F7]"
												>
													{/* ORDER */}

													<td className="px-5 py-5">
														<Link
															href={`/admin/orders/${order.id}`}
															className="font-semibold text-[#85161B] hover:underline"
														>
															#{order.id}
														</Link>
													</td>

													{/* CUSTOMER */}

													<td className="max-w-[150px] px-5 py-5">
														<span
															className={`
																	block
																	truncate
																	${
																		order.customer === "Guest"
																			? "font-semibold text-[#8A6A5B]"
																			: "text-[#2E2E2E]"
																	}
																`}
														>
															{order.customer}
														</span>
													</td>

													{/* PRODUCT */}

													<td className="max-w-[220px] px-5 py-5">
														<p
															className="truncate text-[#2E2E2E]/70"
															title={order.product}
														>
															{order.product}
														</p>

														{order.items > 1 && (
															<span className="mt-0.5 block text-xs text-[#2E2E2E]/40">
																+{order.items - 1} more
															</span>
														)}
													</td>

													{/* AMOUNT */}

													<td className="whitespace-nowrap px-5 py-5 font-semibold text-[#2E2E2E]">
														₹{order.amount.toLocaleString("en-IN")}
													</td>

													{/* STATUS */}

													<td className="px-5 py-5">
														<span
															className={`
																	inline-flex
																	whitespace-nowrap
																	rounded-full
																	px-2.5
																	py-1
																	text-xs
																	font-semibold
																	${STATUS_STYLES[order.status] || "bg-gray-100 text-gray-600"}
																`}
														>
															{order.status}
														</span>
													</td>

													{/* ADDRESS */}

													<td className="max-w-[300px] px-5 py-5">
														<div className="flex min-w-0 items-start gap-2">
															<MapPin
																size={15}
																className="mt-0.5 shrink-0 text-[#85161B]"
															/>

															<p
																className="line-clamp-2 text-xs leading-5 text-[#2E2E2E]/65"
																title={order.address}
															>
																{order.address}
															</p>
														</div>
													</td>

													{/* DATE */}

													<td className="whitespace-nowrap px-5 py-5 text-xs text-[#2E2E2E]/45">
														{order.date}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>

							{/* ==================================================
							    PAGINATION
							================================================== */}

							{totalPages > 1 && (
								<div
									className="
										mt-5
										flex
										flex-col
										items-center
										justify-between
										gap-3
										rounded-2xl
										border
										border-[#E9DED7]
										bg-white
										px-4
										py-3.5
										sm:flex-row
										sm:px-5
									"
								>
									<p className="text-xs text-[#2E2E2E]/50">
										Showing{" "}
										<span className="font-semibold text-[#2E2E2E]">
											{rangeStart}–{rangeEnd}
										</span>{" "}
										of{" "}
										<span className="font-semibold text-[#2E2E2E]">
											{filteredOrders.length}
										</span>{" "}
										orders
									</p>

									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() =>
												setPage((current) => Math.max(1, current - 1))
											}
											disabled={page === 1}
											className="
												rounded-lg
												border
												border-[#E8DED7]
												bg-white
												px-3.5
												py-2
												text-xs
												font-semibold
												text-[#2E2E2E]/70
												transition
												hover:border-[#85161B]/30
												hover:text-[#85161B]
												disabled:cursor-not-allowed
												disabled:opacity-40
												disabled:hover:border-[#E8DED7]
												disabled:hover:text-[#2E2E2E]/70
											"
										>
											Previous
										</button>

										<span className="px-1 text-xs font-medium text-[#2E2E2E]/55">
											Page {page} of {totalPages}
										</span>

										<button
											type="button"
											onClick={() =>
												setPage((current) => Math.min(totalPages, current + 1))
											}
											disabled={page === totalPages}
											className="
												rounded-lg
												border
												border-[#E8DED7]
												bg-white
												px-3.5
												py-2
												text-xs
												font-semibold
												text-[#2E2E2E]/70
												transition
												hover:border-[#85161B]/30
												hover:text-[#85161B]
												disabled:cursor-not-allowed
												disabled:opacity-40
												disabled:hover:border-[#E8DED7]
												disabled:hover:text-[#2E2E2E]/70
											"
										>
											Next
										</button>
									</div>
								</div>
							)}
						</>
					) : (
						/* ======================================================
						   EMPTY
						====================================================== */

						<div
							className="
								rounded-2xl
								border
								border-[#E9DED7]
								bg-white
								px-6
								py-16
								text-center
							"
						>
							<div
								className="
									mx-auto
									flex
									h-14
									w-14
									items-center
									justify-center
									rounded-full
									bg-[#F7D6BF]/40
								"
							>
								<ClipboardList size={22} className="text-[#85161B]" />
							</div>

							<p className="mt-4 text-sm font-semibold text-[#2E2E2E]">
								{error ? "No orders available" : "No orders match your search"}
							</p>

							<p className="mt-1 text-xs text-[#2E2E2E]/45">
								{error
									? "Please check your admin session and try again."
									: "Try a different keyword or status filter."}
							</p>

							{query && !error && (
								<button
									type="button"
									onClick={() => setQuery("")}
									className="
										mt-4
										text-xs
										font-semibold
										text-[#85161B]
										underline
									"
								>
									Clear search
								</button>
							)}
						</div>
					)}
				</div>
			</div>
		</main>
	);
}
