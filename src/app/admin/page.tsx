"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	ShoppingBag,
	Users,
	Package,
	IndianRupee,
	Plus,
	ClipboardList,
	Boxes,
	UserPlus,
	MoreHorizontal,
	AlertTriangle,
	AlertCircle,
	Store,
	LogOut,
} from "lucide-react";

/* ============================================================================
   HELPERS
============================================================================ */

function toNumber(value: unknown, fallback = 0): number {
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
}

function unwrapList<T>(data: unknown, keys: string[]): T[] {
	if (Array.isArray(data)) {
		return data as T[];
	}

	if (data && typeof data === "object") {
		for (const key of keys) {
			const value = (data as Record<string, unknown>)[key];

			if (Array.isArray(value)) {
				return value as T[];
			}
		}
	}

	return [];
}

/* ============================================================================
   USERS
============================================================================ */

type RawUser = {
	id?: string | number;
	name?: string;
	email?: string;
	reseller?: string | boolean;
};

/* ============================================================================
   PRODUCTS
============================================================================ */

type RawAdminProduct = {
	id?: string | number;
	name?: string;
	in_stock?: string;
};

type OutOfStockProduct = {
	id: string;
	name: string;
};

/* ============================================================================
   ORDERS
============================================================================ */

type AdminOrderStatus =
	| "Delivered"
	| "Processing"
	| "Shipped"
	| "Pending"
	| "Cancelled";

type RawAdminOrder = {
	id?: string | number;
	order_id?: string | number;
	order_status?: string;
	grand_total?: string | number;
	cart?: string;
	created_at?: string;
	customer_name?: string;
	name?: string;
	user_name?: string;
};

type RecentOrder = {
	id: string;
	customer: string;
	product: string;
	amount: number;
	status: AdminOrderStatus;
};

const STATUS_STYLES: Record<AdminOrderStatus, string> = {
	Delivered: "bg-green-50 text-green-700",
	Processing: "bg-blue-50 text-blue-700",
	Shipped: "bg-purple-50 text-purple-700",
	Pending: "bg-amber-50 text-amber-700",
	Cancelled: "bg-red-50 text-red-700",
};

function normalizeOrderStatus(rawStatus?: string): AdminOrderStatus {
	const key = (rawStatus ?? "").toLowerCase().replace(/[\s_-]+/g, "");

	if (key.includes("cancel")) return "Cancelled";

	if (key.includes("delivered")) return "Delivered";

	if (key.includes("shipped") || key.includes("dispatch")) {
		return "Shipped";
	}

	if (key.includes("process") || key.includes("accepted")) {
		return "Processing";
	}

	return "Pending";
}

function getFirstProductName(cartJson?: string): {
	name: string;
	extraCount: number;
} {
	if (!cartJson) {
		return {
			name: "—",
			extraCount: 0,
		};
	}

	try {
		const items: { name?: string }[] = JSON.parse(cartJson);

		if (Array.isArray(items) && items.length > 0) {
			return {
				name: items[0]?.name ?? "Untitled product",
				extraCount: items.length - 1,
			};
		}
	} catch (error) {
		console.error("Failed to parse order cart JSON:", error, cartJson);
	}

	return {
		name: "—",
		extraCount: 0,
	};
}

/* ============================================================================
   ADMIN DASHBOARD
============================================================================ */

export default function AdminPage() {
	const router = useRouter();

	/* =====================================================
	   LOGOUT
	===================================================== */

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
					(data as { message?: string })?.message || "Unable to logout.",
				);
			}

			/*
			 * Change this route if your admin login page
			 * uses a different URL.
			 */

			router.replace("/login");
			// router.refresh();
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

	/* =====================================================
	   USERS
	===================================================== */

	const [usersLoading, setUsersLoading] = useState(true);

	const [usersError, setUsersError] = useState("");

	const [customersCount, setCustomersCount] = useState(0);

	useEffect(() => {
		const fetchUsers = async () => {
			setUsersLoading(true);
			setUsersError("");

			try {
				const response = await fetch("/api/admin/users", {
					method: "GET",
					credentials: "include",
					cache: "no-store",
				});

				const data = await response.json().catch(() => ({}));

				console.log("ADMIN USERS RESPONSE:", data);

				if (!response.ok) {
					throw new Error(
						(
							data as {
								message?: string;
							}
						)?.message || "Unable to load users.",
					);
				}

				const users = unwrapList<RawUser>(data, ["users", "result", "data"]);

				setCustomersCount(users.length);
			} catch (err) {
				console.error("Fetch admin users failed:", err);

				setUsersError(
					err instanceof Error ? err.message : "Unable to load users.",
				);
			} finally {
				setUsersLoading(false);
			}
		};

		fetchUsers();
	}, []);

	/* =====================================================
	   PRODUCTS
	===================================================== */

	const [productsLoading, setProductsLoading] = useState(true);

	const [productsError, setProductsError] = useState("");

	const [productsCount, setProductsCount] = useState(0);

	const [outOfStock, setOutOfStock] = useState<OutOfStockProduct[]>([]);

	useEffect(() => {
		const fetchProducts = async () => {
			setProductsLoading(true);
			setProductsError("");

			try {
				const response = await fetch("/api/admin/products", {
					method: "GET",
					credentials: "include",
					cache: "no-store",
				});

				const data = await response.json().catch(() => ({}));

				console.log("ADMIN PRODUCTS RESPONSE:", data);

				if (!response.ok) {
					throw new Error(
						(
							data as {
								message?: string;
							}
						)?.message || "Unable to load products.",
					);
				}

				const rawProducts = unwrapList<RawAdminProduct>(data, [
					"products",
					"result",
					"data",
				]);

				setProductsCount(rawProducts.length);

				const outOfStockProducts = rawProducts
					.filter(
						(raw) =>
							(raw.in_stock ?? "").toLowerCase().trim() === "out_of_stock",
					)
					.map(
						(raw): OutOfStockProduct => ({
							id: String(raw.id ?? raw.name ?? ""),
							name: raw.name ?? "Untitled product",
						}),
					)
					.sort((a, b) => a.name.localeCompare(b.name));

				setOutOfStock(outOfStockProducts);
			} catch (err) {
				console.error("Fetch admin products failed:", err);

				setProductsError(
					err instanceof Error ? err.message : "Unable to load products.",
				);
			} finally {
				setProductsLoading(false);
			}
		};

		fetchProducts();
	}, []);

	/* =====================================================
	   ORDERS
	===================================================== */

	const [ordersLoading, setOrdersLoading] = useState(true);

	const [ordersError, setOrdersError] = useState("");

	const [totalOrders, setTotalOrders] = useState(0);

	const [totalRevenue, setTotalRevenue] = useState(0);

	const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

	useEffect(() => {
		const fetchOrders = async () => {
			setOrdersLoading(true);
			setOrdersError("");

			try {
				const response = await fetch("/api/admin/orders", {
					method: "GET",
					credentials: "include",
					cache: "no-store",
				});

				const data = await response.json().catch(() => ({}));

				console.log("ADMIN ORDERS RESPONSE:", data);

				if (!response.ok) {
					throw new Error(
						(
							data as {
								message?: string;
							}
						)?.message || "Unable to load orders.",
					);
				}

				const rawOrders = unwrapList<RawAdminOrder>(data, [
					"orders",
					"wishlist",
					"result",
					"data",
				]);

				setTotalOrders(rawOrders.length);

				setTotalRevenue(
					rawOrders.reduce(
						(sum, order) => sum + toNumber(order.grand_total, 0),
						0,
					),
				);

				const sorted = [...rawOrders].sort((a, b) => {
					const dateA = new Date(a.created_at ?? "").getTime();

					const dateB = new Date(b.created_at ?? "").getTime();

					return (
						(Number.isFinite(dateB) ? dateB : 0) -
						(Number.isFinite(dateA) ? dateA : 0)
					);
				});

				const recent = sorted.slice(0, 5).map((raw): RecentOrder => {
					const { name, extraCount } = getFirstProductName(raw.cart);

					return {
						id: String(raw.order_id ?? raw.id ?? "—"),

						customer:
							raw.customer_name ?? raw.name ?? raw.user_name ?? "Customer",

						product: extraCount > 0 ? `${name} +${extraCount} more` : name,

						amount: toNumber(raw.grand_total, 0),

						status: normalizeOrderStatus(raw.order_status),
					};
				});

				setRecentOrders(recent);
			} catch (err) {
				console.error("Fetch admin orders failed:", err);

				setOrdersError(
					err instanceof Error ? err.message : "Unable to load orders.",
				);
			} finally {
				setOrdersLoading(false);
			}
		};

		fetchOrders();
	}, []);

	/* =====================================================
	   STATS
	===================================================== */

	const stats = useMemo(
		() => [
			{
				title: "Total Revenue",
				value: `₹${totalRevenue.toLocaleString("en-IN")}`,
				icon: IndianRupee,
				loading: ordersLoading,
				error: ordersError,
			},
			{
				title: "Total Orders",
				value: String(totalOrders),
				icon: ShoppingBag,
				loading: ordersLoading,
				error: ordersError,
			},
			{
				title: "Customers",
				value: customersCount.toLocaleString("en-IN"),
				icon: Users,
				loading: usersLoading,
				error: usersError,
			},
			{
				title: "Products",
				value: String(productsCount),
				icon: Package,
				loading: productsLoading,
				error: productsError,
			},
		],
		[
			totalRevenue,
			totalOrders,
			customersCount,
			productsCount,
			ordersLoading,
			usersLoading,
			productsLoading,
			ordersError,
			usersError,
			productsError,
		],
	);

	/* =====================================================
	   RENDER
	===================================================== */

	return (
		<main className="min-h-screen bg-[#FBF9F7]">
			{/* =====================================================
			    TOP NAVBAR
			===================================================== */}

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
										group-hover:border-white/30
										group-hover:border-t-white
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

			{/* =====================================================
			    DASHBOARD CONTENT
			===================================================== */}

			<div
				className="
					mx-auto
					max-w-7xl
					px-5
					py-8
					sm:px-6
					lg:px-8
					lg:py-10
				"
			>
				{/* =====================================================
				    HEADER
				===================================================== */}

				<div
					className="
						mb-8
						flex
						flex-col
						gap-5
						sm:flex-row
						sm:items-end
						sm:justify-between
					"
				>
					<div>
						<p
							className="
								mb-2
								text-xs
								font-semibold
								uppercase
								tracking-[0.2em]
								text-[#85161B]
							"
						>
							Store Overview
						</p>

						<h1
							className="
								text-3xl
								font-bold
								tracking-tight
								text-[#2E2E2E]
								sm:text-4xl
							"
						>
							Hello, Admin.
						</h1>

						<p
							className="
								mt-2
								text-sm
								text-[#2E2E2E]/55
								sm:text-base
							"
						>
							Here's what's happening with your store today.
						</p>
					</div>

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
							transition-all
							hover:bg-[#721318]
							hover:shadow-lg
							active:scale-[0.98]
						"
					>
						<Plus size={17} />
						Add Product
					</Link>
				</div>

				{/* =====================================================
				    STATS
				===================================================== */}

				<div
					className="
						grid
						grid-cols-1
						gap-4
						sm:grid-cols-2
						xl:grid-cols-4
					"
				>
					{stats.map((stat) => {
						const Icon = stat.icon;

						return (
							<div
								key={stat.title}
								className="
									rounded-2xl
									border
									border-[#E8DED7]
									bg-white
									p-5
									shadow-[0_4px_20px_rgba(80,40,20,0.04)]
									transition-all
									duration-200
									hover:-translate-y-0.5
									hover:shadow-[0_8px_25px_rgba(80,40,20,0.07)]
								"
							>
								<div
									className="
										flex
										h-11
										w-11
										items-center
										justify-center
										rounded-xl
										bg-[#F7D6BF]/45
										text-[#85161B]
									"
								>
									<Icon size={20} />
								</div>

								<p className="mt-5 text-sm text-[#2E2E2E]/50">{stat.title}</p>

								{stat.loading ? (
									<span
										className="
											mt-2
											inline-block
											h-7
											w-20
											animate-pulse
											rounded
											bg-[#F0EAE5]
										"
									/>
								) : stat.error ? (
									<p className="mt-1 text-xs font-medium text-red-500">
										Unable to load
									</p>
								) : (
									<p
										className="
											mt-1
											text-2xl
											font-bold
											tracking-tight
											text-[#2E2E2E]
										"
									>
										{stat.value}
									</p>
								)}
							</div>
						);
					})}
				</div>

				{/* =====================================================
				    QUICK ACTIONS
				===================================================== */}

				<div className="mt-8">
					<h2 className="mb-4 text-lg font-semibold text-[#2E2E2E]">
						Quick actions
					</h2>

					<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
						<Link
							href="/admin/products/new"
							className="
								group
								flex
								items-center
								gap-3
								rounded-2xl
								border
								border-[#E8DED7]
								bg-white
								p-4
								text-left
								transition-all
								hover:border-[#85161B]/30
								hover:shadow-md
							"
						>
							<div
								className="
									flex
									h-10
									w-10
									shrink-0
									items-center
									justify-center
									rounded-xl
									bg-[#F7D6BF]/40
									text-[#85161B]
								"
							>
								<Plus size={18} />
							</div>

							<div>
								<p className="text-sm font-semibold text-[#2E2E2E]">
									Add Product
								</p>

								<p className="mt-0.5 hidden text-xs text-[#2E2E2E]/45 sm:block">
									Create new listing
								</p>
							</div>
						</Link>

						<Link
							href="/admin/orders"
							className="
								group
								flex
								items-center
								gap-3
								rounded-2xl
								border
								border-[#E8DED7]
								bg-white
								p-4
								text-left
								transition-all
								hover:border-[#85161B]/30
								hover:shadow-md
							"
						>
							<div
								className="
									flex
									h-10
									w-10
									shrink-0
									items-center
									justify-center
									rounded-xl
									bg-[#F7D6BF]/40
									text-[#85161B]
								"
							>
								<ClipboardList size={18} />
							</div>

							<div>
								<p className="text-sm font-semibold text-[#2E2E2E]">
									View Orders
								</p>

								<p className="mt-0.5 hidden text-xs text-[#2E2E2E]/45 sm:block">
									Manage orders
								</p>
							</div>
						</Link>

						<Link
							href="/admin/inventory"
							className="
								group
								flex
								items-center
								gap-3
								rounded-2xl
								border
								border-[#E8DED7]
								bg-white
								p-4
								text-left
								transition-all
								hover:border-[#85161B]/30
								hover:shadow-md
							"
						>
							<div
								className="
									flex
									h-10
									w-10
									shrink-0
									items-center
									justify-center
									rounded-xl
									bg-[#F7D6BF]/40
									text-[#85161B]
								"
							>
								<Boxes size={18} />
							</div>

							<div>
								<p className="text-sm font-semibold text-[#2E2E2E]">
									Inventory
								</p>

								<p className="mt-0.5 hidden text-xs text-[#2E2E2E]/45 sm:block">
									Check stock
								</p>
							</div>
						</Link>

						<Link
							href="/admin/customers"
							className="
								group
								flex
								items-center
								gap-3
								rounded-2xl
								border
								border-[#E8DED7]
								bg-white
								p-4
								text-left
								transition-all
								hover:border-[#85161B]/30
								hover:shadow-md
							"
						>
							<div
								className="
									flex
									h-10
									w-10
									shrink-0
									items-center
									justify-center
									rounded-xl
									bg-[#F7D6BF]/40
									text-[#85161B]
								"
							>
								<UserPlus size={18} />
							</div>

							<div>
								<p className="text-sm font-semibold text-[#2E2E2E]">
									Customers
								</p>

								<p className="mt-0.5 hidden text-xs text-[#2E2E2E]/45 sm:block">
									View customers
								</p>
							</div>
						</Link>
					</div>
				</div>

				{/* =====================================================
				    ORDERS + INVENTORY
				===================================================== */}

				<div
					className="
						mt-8
						grid
						grid-cols-1
						gap-6
						xl:grid-cols-[1fr_340px]
					"
				>
					{/* RECENT ORDERS */}

					<div className="overflow-hidden rounded-2xl border border-[#E8DED7] bg-white">
						<div
							className="
								flex
								items-center
								justify-between
								border-b
								border-[#E8DED7]
								px-5
								py-5
							"
						>
							<div>
								<h2 className="font-semibold text-[#2E2E2E]">Recent Orders</h2>

								<p className="mt-1 text-xs text-[#2E2E2E]/45">
									Latest customer orders
								</p>
							</div>

							<Link
								href="/admin/orders"
								className="text-sm font-semibold text-[#85161B] hover:underline"
							>
								View all
							</Link>
						</div>

						{ordersLoading ? (
							<div className="flex items-center justify-center gap-3 px-5 py-14">
								<span className="h-5 w-5 animate-spin rounded-full border-2 border-[#85161B]/25 border-t-[#85161B]" />

								<p className="text-sm text-[#2E2E2E]/50">Loading orders...</p>
							</div>
						) : ordersError ? (
							<div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
								<AlertCircle size={22} className="text-red-500" />

								<p className="text-sm text-[#2E2E2E]/55">{ordersError}</p>
							</div>
						) : recentOrders.length === 0 ? (
							<div className="px-5 py-14 text-center text-sm text-[#2E2E2E]/45">
								No orders yet.
							</div>
						) : (
							<>
								{/* DESKTOP TABLE */}

								<div className="hidden overflow-x-auto md:block">
									<table className="w-full">
										<thead>
											<tr className="border-b border-[#E8DED7] text-left">
												<th className="px-5 py-3 text-xs font-medium text-[#2E2E2E]/45">
													Order
												</th>

												<th className="px-5 py-3 text-xs font-medium text-[#2E2E2E]/45">
													Customer
												</th>

												<th className="px-5 py-3 text-xs font-medium text-[#2E2E2E]/45">
													Product
												</th>

												<th className="px-5 py-3 text-xs font-medium text-[#2E2E2E]/45">
													Amount
												</th>

												<th className="px-5 py-3 text-xs font-medium text-[#2E2E2E]/45">
													Status
												</th>

												<th />
											</tr>
										</thead>

										<tbody>
											{recentOrders.map((order) => (
												<tr
													key={order.id}
													className="
															border-b
															border-[#E8DED7]/70
															last:border-0
															hover:bg-[#FBF9F7]
														"
												>
													<td className="px-5 py-4 text-sm font-semibold text-[#85161B]">
														<Link
															href={`/admin/orders/${order.id}`}
															className="hover:underline"
														>
															#{order.id}
														</Link>
													</td>

													<td className="px-5 py-4 text-sm text-[#2E2E2E]">
														{order.customer}
													</td>

													<td className="px-5 py-4 text-sm text-[#2E2E2E]/65">
														{order.product}
													</td>

													<td className="px-5 py-4 text-sm font-semibold text-[#2E2E2E]">
														₹{order.amount.toLocaleString("en-IN")}
													</td>

													<td className="px-5 py-4">
														<span
															className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[order.status]}`}
														>
															{order.status}
														</span>
													</td>

													<td className="px-5 py-4">
														<Link
															href={`/admin/orders/${order.id}`}
															className="text-[#2E2E2E]/35 hover:text-[#85161B]"
															aria-label={`More options for ${order.id}`}
														>
															<MoreHorizontal size={18} />
														</Link>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>

								{/* MOBILE ORDERS */}

								<div className="divide-y divide-[#E8DED7] md:hidden">
									{recentOrders.map((order) => (
										<Link
											key={order.id}
											href={`/admin/orders/${order.id}`}
											className="block p-4"
										>
											<div className="flex items-start justify-between gap-3">
												<div>
													<p className="text-sm font-semibold text-[#85161B]">
														#{order.id}
													</p>

													<p className="mt-1 text-sm font-medium text-[#2E2E2E]">
														{order.customer}
													</p>

													<p className="mt-0.5 text-xs text-[#2E2E2E]/50">
														{order.product}
													</p>
												</div>

												<span
													className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[order.status]}`}
												>
													{order.status}
												</span>
											</div>

											<p className="mt-3 text-sm font-bold text-[#2E2E2E]">
												₹{order.amount.toLocaleString("en-IN")}
											</p>
										</Link>
									))}
								</div>
							</>
						)}
					</div>

					{/* OUT OF STOCK */}

					<div className="rounded-2xl border border-[#E8DED7] bg-white">
						<div className="border-b border-[#E8DED7] px-5 py-5">
							<div className="flex items-center gap-2">
								<div
									className="
										flex
										h-8
										w-8
										items-center
										justify-center
										rounded-lg
										bg-amber-50
										text-amber-600
									"
								>
									<AlertTriangle size={16} />
								</div>

								<div>
									<h2 className="font-semibold text-[#2E2E2E]">Out of Stock</h2>

									<p className="text-xs text-[#2E2E2E]/45">
										Products currently unavailable
									</p>
								</div>
							</div>
						</div>

						{productsLoading ? (
							<div className="flex items-center justify-center gap-3 px-5 py-10">
								<span className="h-5 w-5 animate-spin rounded-full border-2 border-[#85161B]/25 border-t-[#85161B]" />

								<p className="text-sm text-[#2E2E2E]/50">Loading...</p>
							</div>
						) : productsError ? (
							<div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
								<AlertCircle size={20} className="text-red-500" />

								<p className="text-sm text-[#2E2E2E]/55">{productsError}</p>
							</div>
						) : outOfStock.length === 0 ? (
							<div className="px-5 py-10 text-center text-sm text-[#2E2E2E]/45">
								No products are currently out of stock.
							</div>
						) : (
							<div className="divide-y divide-[#E8DED7]">
								{outOfStock.map((product) => (
									<div
										key={product.id}
										className="
												flex
												items-center
												justify-between
												gap-4
												px-5
												py-4
											"
									>
										<div className="min-w-0">
											<p className="truncate text-sm font-medium text-[#2E2E2E]">
												{product.name}
											</p>

											<p className="mt-1 text-xs text-[#2E2E2E]/45">
												Currently unavailable
											</p>
										</div>

										<span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
											Out of Stock
										</span>
									</div>
								))}
							</div>
						)}

						<div className="p-5">
							<Link
								href="/admin/inventory"
								className="
									block
									w-full
									rounded-xl
									border
									border-[#85161B]/20
									py-2.5
									text-center
									text-sm
									font-semibold
									text-[#85161B]
									transition
									hover:bg-[#85161B]
									hover:text-white
								"
							>
								Manage Inventory
							</Link>
						</div>
					</div>
				</div>

				{/* =====================================================
				    FOOTER NOTE
				===================================================== */}

				<div className="mt-8 text-center">
					<p className="text-xs text-[#2E2E2E]/35">
						Printing House Admin Dashboard • Store overview
					</p>
				</div>
			</div>
		</main>
	);
}
