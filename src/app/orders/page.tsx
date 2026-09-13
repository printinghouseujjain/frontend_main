
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
	Package,
	ArrowRight,
	Clock3,
	CheckCircle2,
	Truck,
	ShoppingBag,
	MapPin,
	Box,
	AlertCircle,
} from "lucide-react";

/* ─────────────────────────────────────────
   IMAGE BASE URL
───────────────────────────────────────── */

const PRODUCT_IMAGE_URL =
	"https://api.printinghouseujjain.in/assets/products/";

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */

type OrderStatus =
	| "Order placed"
	| "Order accepted"
	| "Packed"
	| "Shipped"
	| "Delivered"
	| "Cancelled";

type OrderStatusType =
	| "processing"
	| "shipping"
	| "delivered"
	| "cancelled";

type OrderItem = {
	id: string;
	name: string;
	image: string;
	qty: number;
};

type OrderAddress = {
	name?: string;
	flatHouseBuilding: string;
	roadAreaColony: string;
	landmark: string;
	city: string;
	state: string;
	pincode: string;
	phone: string;
};

type Order = {
	id: string;
	date: string;
	status: OrderStatus;
	statusType: OrderStatusType;
	paymentStatus: string;
	total: string;
	items: OrderItem[];
	address: OrderAddress | null;
};

/* ─────────────────────────────────────────
   RAW API TYPES
───────────────────────────────────────── */

type RawOrderItem = {
	id?: string | number;
	name?: string;
	primary_photo_path?: string;
	quantity?: number | string;
	selling_price?: number | string;
};

type RawOrderAddress = {
	name?: string;
	flat_house_building?: string;
	road_area_colony?: string;
	landmark?: string;
	city?: string;
	state?: string;
	pincode?: string | number;
	phone?: string;
};

type RawOrder = {
	id?: string | number;
	order_id?: string | number;

	payment_status?: string;
	order_status?: string;

	address?: string;
	cart?: string;

	products_count?: string | number;
	total_price?: string | number;
	delivery_fee?: string | number;
	grand_total?: string | number;

	created_at?: string;
};

type OrdersResponse = {
	status?: number;
	message?: string;
	login_status?: boolean;
	wishlist?: RawOrder[];
	orders?: RawOrder[];
	result?: RawOrder[];
};

/* ─────────────────────────────────────────
   STATUS FILTERS
───────────────────────────────────────── */

const STATUS_FILTERS = [
	"All orders",
	"Processing",
	"Shipped",
	"Delivered",
];

/* ─────────────────────────────────────────
   STATUS NORMALIZATION
───────────────────────────────────────── */

function normalizeStatus(rawStatus: string | undefined): {
	status: OrderStatus;
	statusType: OrderStatusType;
} {
	const key = (rawStatus ?? "")
		.toLowerCase()
		.replace(/[\s_-]+/g, "");

	if (key.includes("cancel")) {
		return {
			status: "Cancelled",
			statusType: "cancelled",
		};
	}

	if (key.includes("delivered")) {
		return {
			status: "Delivered",
			statusType: "delivered",
		};
	}

	if (
		key.includes("shipped") ||
		key.includes("dispatch") ||
		key.includes("outfordelivery")
	) {
		return {
			status: "Shipped",
			statusType: "shipping",
		};
	}

	if (key.includes("packed")) {
		return {
			status: "Packed",
			statusType: "processing",
		};
	}

	if (
		key.includes("accepted") ||
		key.includes("confirmed") ||
		key.includes("processing")
	) {
		return {
			status: "Order accepted",
			statusType: "processing",
		};
	}

	/*
	 * Pending and unknown statuses
	 * are treated as Order placed.
	 */
	return {
		status: "Order placed",
		statusType: "processing",
	};
}

/* ─────────────────────────────────────────
   NORMALIZE ORDER
───────────────────────────────────────── */

function normalizeOrder(raw: RawOrder, index: number): Order {
	const id = String(
		raw.order_id ?? raw.id ?? `order-${index}`,
	);

	let date = raw.created_at ?? "";

	if (date) {
		const parsed = new Date(date.replace(" ", "T"));

		if (!Number.isNaN(parsed.getTime())) {
			date = parsed.toLocaleDateString("en-IN", {
				year: "numeric",
				month: "long",
				day: "numeric",
			});
		}
	}

	const { status, statusType } = normalizeStatus(
		raw.order_status,
	);

	const rawTotal = Number(raw.grand_total ?? 0);

	const total = `₹${(
		Number.isFinite(rawTotal) ? rawTotal : 0
	).toFixed(2)}`;

	/* ─────────────────────────────────────
	   PARSE CART
	───────────────────────────────────── */

	let items: OrderItem[] = [];

	if (raw.cart) {
		try {
			const rawItems: RawOrderItem[] =
				JSON.parse(raw.cart);

			items = rawItems.map((rawItem, itemIndex) => {
				const quantity = Number(
					rawItem.quantity ?? 1,
				);

				return {
					id: String(
						rawItem.id ??
							`${id}-item-${itemIndex}`,
					),

					name:
						rawItem.name ??
						"Untitled product",

					image: rawItem.primary_photo_path
						? `${PRODUCT_IMAGE_URL}${rawItem.primary_photo_path}`
						: "",

					qty:
						Number.isFinite(quantity) &&
						quantity > 0
							? Math.floor(quantity)
							: 1,
				};
			});
		} catch (err) {
			console.error(
				"Failed to parse order cart JSON:",
				err,
				raw.cart,
			);
		}
	}

	/* ─────────────────────────────────────
	   PARSE ADDRESS
	───────────────────────────────────── */

	let address: OrderAddress | null = null;

	if (raw.address) {
		try {
			const rawAddress: RawOrderAddress =
				JSON.parse(raw.address);

			address = {
				name: rawAddress.name ?? "",

				flatHouseBuilding:
					rawAddress.flat_house_building ?? "",

				roadAreaColony:
					rawAddress.road_area_colony ?? "",

				landmark: rawAddress.landmark ?? "",

				city: rawAddress.city ?? "",

				state: rawAddress.state ?? "",

				pincode:
					rawAddress.pincode !== undefined
						? String(rawAddress.pincode)
						: "",

				phone: rawAddress.phone ?? "",
			};
		} catch (err) {
			console.error(
				"Failed to parse order address JSON:",
				err,
				raw.address,
			);
		}
	}

	return {
		id,
		date: date || "—",
		status,
		statusType,
		paymentStatus: raw.payment_status ?? "",
		total,
		items,
		address,
	};
}

/* ─────────────────────────────────────────
   ORDERS PAGE
───────────────────────────────────────── */

export default function OrdersPage() {
	const [activeFilter, setActiveFilter] =
		useState("All orders");

	const [orders, setOrders] = useState<Order[]>([]);

	const [loading, setLoading] = useState(true);

	const [error, setError] = useState("");

	/* ─────────────────────────────────────
	   FETCH ORDERS
	   
	   IMPORTANT:
	   /api/orders is the ONLY request used
	   to determine whether the user should
	   be redirected.
	───────────────────────────────────── */

	const fetchOrders = useCallback(async () => {
		setLoading(true);
		setError("");

		try {
			const response = await fetch("/api/orders", {
				method: "GET",
				credentials: "include",
				cache: "no-store",
			});

			const data = (await response
				.json()
				.catch(() => ({}))) as OrdersResponse;

			console.log("ORDERS RESPONSE:", data);

			/*
			 * If the orders API explicitly says the user
			 * is not logged in, redirect to order tracking.
			 *
			 * This replaces the previous /api/auth/init check.
			 */
			if (data.login_status === false) {
				window.location.replace("/order-tracking");
				return;
			}

			/*
			 * Some APIs return an authentication error
			 * through the HTTP status instead of login_status.
			 *
			 * Handle the common unauthorized statuses here.
			 */
			if (
				response.status === 401 ||
				response.status === 403
			) {
				window.location.replace("/order-tracking");
				return;
			}

			if (!response.ok) {
				throw new Error(
					data.message ??
						"Unable to load your orders.",
				);
			}

			const rawOrders =
				data.wishlist ??
				data.orders ??
				data.result ??
				[];

			const normalizedOrders = rawOrders.map(
				(raw, index) =>
					normalizeOrder(raw, index),
			);

			/*
			 * Most recent first.
			 */
			normalizedOrders.sort((a, b) =>
				b.id.localeCompare(a.id),
			);

			setOrders(normalizedOrders);
		} catch (err) {
			console.error(
				"Fetch orders failed:",
				err,
			);

			/*
			 * If the request itself failed because
			 * authentication/session is unavailable,
			 * send the user to order tracking.
			 */
			if (
				err instanceof TypeError &&
				err.message
					.toLowerCase()
					.includes("fetch")
			) {
				setError(
					"Unable to connect to the orders service.",
				);
			} else {
				setError(
					err instanceof Error
						? err.message
						: "Unable to load your orders.",
				);
			}
		} finally {
			setLoading(false);
		}
	}, []);

	/* ─────────────────────────────────────────
	   LOAD ORDERS
	───────────────────────────────────────── */

	useEffect(() => {
		fetchOrders();
	}, [fetchOrders]);

	/* ─────────────────────────────────────────
	   STATS
	───────────────────────────────────────── */

	const stats = useMemo(() => {
		const totalOrders = orders.length;

		const delivered = orders.filter(
			(order) => order.status === "Delivered",
		).length;

		const inProgress = orders.filter(
			(order) =>
				order.status !== "Delivered" &&
				order.status !== "Cancelled",
		).length;

		return {
			totalOrders,
			inProgress,
			delivered,
		};
	}, [orders]);

	/* ─────────────────────────────────────────
	   FILTER
	───────────────────────────────────────── */

	const filteredOrders = useMemo(() => {
		if (activeFilter === "All orders") {
			return orders;
		}

		if (activeFilter === "Processing") {
			return orders.filter(
				(order) =>
					order.status === "Order placed" ||
					order.status === "Order accepted" ||
					order.status === "Packed",
			);
		}

		if (activeFilter === "Shipped") {
			return orders.filter(
				(order) => order.status === "Shipped",
			);
		}

		if (activeFilter === "Delivered") {
			return orders.filter(
				(order) => order.status === "Delivered",
			);
		}

		return orders;
	}, [activeFilter, orders]);

	/* ─────────────────────────────────────────
	   LOADING ORDERS
	───────────────────────────────────────── */

	if (loading) {
		return (
			<main
				className="
					min-h-[calc(100vh-90px)]
					bg-[#FBF9F7]
					pt-[112px]
					sm:pt-[120px]
				"
			>
				<div className="mx-auto flex min-h-[calc(100vh-90px)] max-w-6xl items-center justify-center px-5 py-12">
					<div className="flex flex-col items-center gap-3">
						<span className="h-8 w-8 animate-spin rounded-full border-2 border-[#85161B]/25 border-t-[#85161B]" />

						<p className="text-sm text-[#2E2E2E]/50">
							Loading your orders...
						</p>
					</div>
				</div>
			</main>
		);
	}

	/* ─────────────────────────────────────────
	   ERROR
	───────────────────────────────────────── */

	if (error) {
		return (
			<main
				className="
					min-h-[calc(100vh-90px)]
					bg-[#FBF9F7]
					pt-[112px]
					sm:pt-[120px]
				"
			>
				<div className="mx-auto flex min-h-[calc(100vh-90px)] max-w-4xl items-center justify-center px-5 py-12">
					<div className="w-full rounded-3xl border border-red-200 bg-white px-6 py-14 text-center shadow-[0_12px_45px_rgba(80,40,20,0.06)] sm:px-12">
						<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
							<AlertCircle
								size={32}
								className="text-red-500"
								strokeWidth={1.7}
							/>
						</div>

						<h1 className="mt-6 text-2xl font-bold text-[#2E2E2E]">
							Unable to load orders
						</h1>

						<p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#2E2E2E]/55">
							{error}
						</p>

						<button
							type="button"
							onClick={fetchOrders}
							className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#85161B] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#721318]"
						>
							Try Again
						</button>
					</div>
				</div>
			</main>
		);
	}

	/* ─────────────────────────────────────────
	   LOGGED-IN ORDERS PAGE
	───────────────────────────────────────── */

	return (
		<main
			className="
				min-h-[calc(100vh-90px)]
				bg-[#FBF9F7]
				pt-[112px]
				sm:pt-[120px]
			"
		>
			<section className="mx-auto max-w-6xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
				{/* HEADER */}

				<div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#85161B]">
							My account
						</p>

						<h1 className="text-3xl font-bold tracking-tight text-[#2E2E2E] sm:text-4xl">
							My Orders
						</h1>

						<p className="mt-2 text-sm text-[#2E2E2E]/55 sm:text-base">
							Track your purchases and view your
							order history.
						</p>
					</div>

					<Link
						href="/shop"
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
							transition-all
							hover:bg-[#721318]
							hover:shadow-lg
							active:scale-[0.98]
						"
					>
						<ShoppingBag size={17} />
						Continue Shopping
					</Link>
				</div>

				{/* SUMMARY */}

				<div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
					<StatCard
						label="Total orders"
						value={stats.totalOrders}
						icon={<Package size={19} />}
						iconClass="bg-[#F7D6BF]/50 text-[#85161B]"
					/>

					<StatCard
						label="In progress"
						value={stats.inProgress}
						icon={<Clock3 size={19} />}
						iconClass="bg-[#FFF3E8] text-[#B56B27]"
					/>

					<StatCard
						label="Delivered"
						value={stats.delivered}
						icon={<CheckCircle2 size={19} />}
						iconClass="bg-[#EDF8F0] text-[#31824A]"
					/>
				</div>

				{/* FILTERS */}

				<div className="mb-6 rounded-2xl border border-[#E9DED7] bg-white p-4">
					<div className="flex gap-2 overflow-x-auto scrollbar-hide">
						{STATUS_FILTERS.map((filter) => (
							<button
								key={filter}
								type="button"
								onClick={() =>
									setActiveFilter(filter)
								}
								className={`
									whitespace-nowrap
									rounded-full
									px-4
									py-2.5
									text-xs
									font-medium
									transition-all
									${
										activeFilter === filter
											? "bg-[#85161B] text-white shadow-sm"
											: "bg-[#F8F3F0] text-[#2E2E2E]/65 hover:bg-[#F1E7E1]"
									}
								`}
							>
								{filter}
							</button>
						))}
					</div>
				</div>

				{/* ORDERS */}

				{filteredOrders.length > 0 ? (
					<div className="space-y-4">
						{filteredOrders.map((order) => (
							<OrderCard
								key={order.id}
								order={order}
							/>
						))}
					</div>
				) : (
					<EmptyOrders />
				)}
			</section>
		</main>
	);
}

/* ─────────────────────────────────────────
   STAT CARD
───────────────────────────────────────── */

function StatCard({
	label,
	value,
	icon,
	iconClass,
}: {
	label: string;
	value: number;
	icon: React.ReactNode;
	iconClass: string;
}) {
	return (
		<div className="rounded-2xl border border-[#E9DED7] bg-white p-5">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-xs font-medium text-[#2E2E2E]/50">
						{label}
					</p>

					<p className="mt-1 text-2xl font-bold text-[#2E2E2E]">
						{value}
					</p>
				</div>

				<div
					className={`
						flex
						h-10
						w-10
						items-center
						justify-center
						rounded-full
						${iconClass}
					`}
				>
					{icon}
				</div>
			</div>
		</div>
	);
}

/* ─────────────────────────────────────────
   ORDER CARD
───────────────────────────────────────── */

function OrderCard({ order }: { order: Order }) {
	const isDelivered = order.status === "Delivered";

	return (
		<article
			className="
				overflow-hidden
				rounded-2xl
				border
				border-[#E9DED7]
				bg-white
				transition-all
				duration-200
				hover:-translate-y-0.5
				hover:shadow-[0_12px_35px_rgba(80,40,20,0.07)]
			"
		>
			{/* ORDER HEADER */}

			<div
				className="
					flex
					flex-col
					gap-3
					border-b
					border-[#EEE6E1]
					px-5
					py-4
					sm:flex-row
					sm:items-center
					sm:justify-between
					sm:px-6
				"
			>
				<div>
					<p className="text-xs text-[#2E2E2E]/45">
						Order placed on {order.date}
					</p>

					<p className="mt-1 text-sm font-semibold text-[#2E2E2E]">
						#{order.id}
					</p>

					{order.address && (
						<p className="mt-1 text-xs text-[#2E2E2E]/45">
							<MapPin
								size={11}
								className="mr-1 inline-block align-[-1px]"
							/>
							{order.address.city || "—"}
							{order.address.state
								? `, ${order.address.state}`
								: ""}
						</p>
					)}
				</div>

				<div className="flex flex-col items-start gap-1.5 sm:items-end">
					<StatusBadge
						status={order.status}
						type={order.statusType}
					/>

					{order.paymentStatus && (
						<span
							className={`text-[10px] font-semibold uppercase tracking-wide ${
								order.paymentStatus.toLowerCase() ===
								"paid"
									? "text-[#31824A]"
									: "text-[#B56B27]"
							}`}
						>
							Payment {order.paymentStatus}
						</span>
					)}
				</div>
			</div>

			{/* PRODUCTS */}

			<div className="px-5 py-5 sm:px-6">
				<div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex min-w-0 flex-1 items-center gap-4">
						<div className="flex -space-x-3">
							{order.items.length > 0 ? (
								order.items.map((item) => (
									<div
										key={item.id}
										className="
											h-16
											w-16
											overflow-hidden
											rounded-xl
											border-2
											border-white
											bg-[#F5F1ED]
											shadow-sm
											sm:h-20
											sm:w-20
										"
									>
										{item.image ? (
											<img
												src={item.image}
												alt={item.name}
												className="h-full w-full object-cover"
											/>
										) : (
											<div className="flex h-full w-full items-center justify-center">
												<ShoppingBag
													size={20}
													className="text-[#85161B]/30"
												/>
											</div>
										)}
									</div>
								))
							) : (
								<div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#F5F1ED] sm:h-20 sm:w-20">
									<ShoppingBag
										size={20}
										className="text-[#85161B]/30"
									/>
								</div>
							)}
						</div>

						<div className="min-w-0">
							<p className="text-sm font-semibold text-[#2E2E2E]">
								{order.items[0]?.name ??
									"Untitled product"}
							</p>

							{order.items.length > 1 && (
								<p className="mt-1 text-xs text-[#2E2E2E]/50">
									+ {order.items.length - 1}{" "}
									more item
									{order.items.length > 2
										? "s"
										: ""}
								</p>
							)}

							<p className="mt-2 text-sm font-bold text-[#85161B]">
								{order.total}
							</p>
						</div>
					</div>

					{/* ACTIONS */}

					<div className="flex flex-col gap-2 sm:flex-row">
						<Link
							href={`/orders/${encodeURIComponent(
								order.id,
							)}`}
							className="
								group
								inline-flex
								items-center
								justify-center
								gap-2
								rounded-xl
								border
								border-[#DED6D0]
								px-4
								py-2.5
								text-xs
								font-semibold
								text-[#2E2E2E]/70
								transition-all
								hover:border-[#85161B]/20
								hover:bg-[#F8F3F0]
								hover:text-[#85161B]
							"
						>
							View order
							<ArrowRight
								size={15}
								className="transition-transform group-hover:translate-x-0.5"
							/>
						</Link>

						{/* TRACK ORDER */}

						<Link
							href={`/order-tracking?order_id=${encodeURIComponent(
								order.id,
							)}`}
							className={`
								group
								inline-flex
								items-center
								justify-center
								gap-2
								rounded-xl
								px-4
								py-2.5
								text-xs
								font-semibold
								transition-all
								${
									isDelivered
										? `
											border
											border-[#31824A]/20
											bg-[#EDF8F0]
											text-[#31824A]
											hover:bg-[#31824A]
											hover:text-white
										`
										: `
											bg-[#85161B]
											text-white
											hover:bg-[#721318]
											hover:shadow-md
										`
								}
							`}
						>
							{isDelivered ? (
								<>
									<CheckCircle2 size={15} />
									View delivery
								</>
							) : (
								<>
									<MapPin
										size={15}
										className="transition-transform group-hover:-translate-y-0.5"
									/>
									Track order
								</>
							)}
						</Link>
					</div>
				</div>

				{/* CURRENT STATUS */}

				{!isDelivered && (
					<div className="mt-5 flex items-center gap-3 rounded-xl bg-[#F8F3F0] px-4 py-3">
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F7D6BF] text-[#85161B]">
							<Package size={15} />
						</div>

						<div>
							<p className="text-xs font-semibold text-[#85161B]">
								Current status
							</p>

							<p className="mt-0.5 text-xs text-[#2E2E2E]/55">
								Your order is currently at the "
								{order.status}" stage.
							</p>
						</div>
					</div>
				)}
			</div>
		</article>
	);
}

/* ─────────────────────────────────────────
   STATUS BADGE
───────────────────────────────────────── */

function StatusBadge({
	status,
	type,
}: {
	status: OrderStatus;
	type: OrderStatusType;
}) {
	const getStatusIcon = () => {
		switch (status) {
			case "Order placed":
				return <Package size={14} />;

			case "Order accepted":
				return <CheckCircle2 size={14} />;

			case "Packed":
				return <Box size={14} />;

			case "Shipped":
				return <Truck size={14} />;

			case "Delivered":
				return <CheckCircle2 size={14} />;

			case "Cancelled":
				return <AlertCircle size={14} />;

			default:
				return <Package size={14} />;
		}
	};

	const styles = {
		delivered:
			"bg-[#EDF8F0] text-[#31824A]",
		shipping:
			"bg-[#EEF5FF] text-[#3973B9]",
		processing:
			"bg-[#FFF3E8] text-[#B56B27]",
		cancelled:
			"bg-red-50 text-red-600",
	};

	return (
		<span
			className={`
				inline-flex
				w-fit
				items-center
				gap-1.5
				rounded-full
				px-3
				py-1.5
				text-xs
				font-semibold
				${styles[type]}
			`}
		>
			{getStatusIcon()}
			{status}
		</span>
	);
}

/* ─────────────────────────────────────────
   EMPTY STATE
───────────────────────────────────────── */

function EmptyOrders() {
	return (
		<div className="rounded-2xl border border-[#E9DED7] bg-white px-6 py-16 text-center">
			<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F7D6BF]/50 text-[#85161B]">
				<Package size={27} />
			</div>

			<h3 className="mt-5 text-xl font-semibold text-[#2E2E2E]">
				No orders found
			</h3>

			<p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#2E2E2E]/55">
				You don't have any orders yet. You can track
				an order using your order details.
			</p>

			<div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
				<Link
					href="/order-tracking"
					className="
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
						hover:shadow-md
					"
				>
					Track an Order
					<ArrowRight size={16} />
				</Link>

				<Link
					href="/shop"
					className="
						inline-flex
						items-center
						gap-2
						rounded-xl
						border
						border-[#DED6D0]
						px-5
						py-3
						text-sm
						font-semibold
						text-[#2E2E2E]/70
						transition
						hover:border-[#85161B]/20
						hover:bg-[#F8F3F0]
						hover:text-[#85161B]
					"
				>
					Start Shopping
				</Link>
			</div>
		</div>
	);
}
