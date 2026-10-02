"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
	Package,
	ArrowRight,
	CheckCircle2,
	Truck,
	Box,
	AlertCircle,
	Search,
	Loader2,
	LogIn,
} from "lucide-react";

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

type OrderStatusType = "processing" | "shipping" | "delivered" | "cancelled";

type Order = {
	id: string;
	date: string;
	status: OrderStatus;
	statusType: OrderStatusType;
	deliveryMethod: string;
};

type RawOrder = {
	id?: string | number;
	order_id?: string | number;
	order_status?: string;
	delivery_method?: string;
	created_at?: string;
};

type OrdersResponse = {
	status?: number;
	message?: string;
	detailed?: boolean;
	orders?: RawOrder;
};

/* ─────────────────────────────────────────
   AUTH INIT
───────────────────────────────────────── */

type AuthInitResponse = {
	login_status?: boolean;
	logged_in?: boolean;
	loggedIn?: boolean;
	isLoggedIn?: boolean;
};

/*
 * /api/auth/init tells us whether the visitor is signed in.
 * If its response format differs, adjust this one function.
 */
function isLoggedInResponse(data: AuthInitResponse | null): boolean {
	return Boolean(
		data?.login_status ??
			data?.logged_in ??
			data?.loggedIn ??
			data?.isLoggedIn,
	);
}

/* ─────────────────────────────────────────
   STATUS NORMALIZATION
───────────────────────────────────────── */

function normalizeStatus(rawStatus: string | undefined): {
	status: OrderStatus;
	statusType: OrderStatusType;
} {
	const key = (rawStatus ?? "").toLowerCase().replace(/[\s_-]+/g, "");

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

	return {
		status: "Order placed",
		statusType: "processing",
	};
}

/* ─────────────────────────────────────────
   DATE
───────────────────────────────────────── */

function formatOrderDate(dateValue: string | undefined) {
	if (!dateValue) {
		return "—";
	}

	const parsed = new Date(dateValue.replace(" ", "T"));

	if (Number.isNaN(parsed.getTime())) {
		return dateValue;
	}

	return parsed.toLocaleDateString("en-IN", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

/* ─────────────────────────────────────────
   NORMALIZE ORDER
───────────────────────────────────────── */

function normalizeOrder(raw: RawOrder): Order {
	const { status, statusType } = normalizeStatus(raw.order_status);

	return {
		id: String(raw.order_id ?? raw.id ?? ""),

		date: formatOrderDate(raw.created_at),

		status,
		statusType,

		deliveryMethod: raw.delivery_method ?? "",
	};
}

/* ─────────────────────────────────────────
   PAGE
───────────────────────────────────────── */

export default function OrderTrackingPage() {
	const searchParams = useSearchParams();

	/*
	 * Read order_id from the URL.
	 *
	 * Example:
	 * /order-tracking?order_id=order_TYLc3Rf7jEhv7M
	 */
	const queryOrderId = searchParams.get("order_id")?.trim() ?? "";

	const [orderId, setOrderId] = useState("");

	const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);

	const [trackingLoading, setTrackingLoading] = useState(false);

	const [trackingError, setTrackingError] = useState("");

	const [hasTracked, setHasTracked] = useState(false);

	/* Whether the visitor is signed in (from /api/auth/init) */

	const [authChecked, setAuthChecked] = useState(false);

	const [isLoggedIn, setIsLoggedIn] = useState(false);

	/* ─────────────────────────────────────
	   CHECK LOGIN STATUS
	───────────────────────────────────── */

	useEffect(() => {
		let cancelled = false;

		const checkAuth = async () => {
			try {
				const response = await fetch("/api/auth/init", {
					method: "GET",
					credentials: "include",
					cache: "no-store",
				});

				const data = (await response
					.json()
					.catch(() => null)) as AuthInitResponse | null;

				console.log("AUTH INIT RESPONSE:", data);

				if (!cancelled) {
					setIsLoggedIn(response.ok && isLoggedInResponse(data));
				}
			} catch (error) {
				console.error("Auth init failed:", error);

				if (!cancelled) {
					setIsLoggedIn(false);
				}
			} finally {
				if (!cancelled) {
					setAuthChecked(true);
				}
			}
		};

		checkAuth();

		return () => {
			cancelled = true;
		};
	}, []);

	/* ─────────────────────────────────────
	   TRACK ORDER
	───────────────────────────────────── */

	const trackOrder = useCallback(async (idToTrack: string) => {
		const id = idToTrack.trim();

		if (!id) {
			setTrackingError("Please enter your order ID.");

			setTrackingOrder(null);
			setHasTracked(false);

			return;
		}

		setTrackingLoading(true);
		setTrackingError("");
		setTrackingOrder(null);
		setHasTracked(true);

		try {
			/* Send order ID as multipart FormData */
			const formData = new FormData();

			formData.append("order_id", id);

			const response = await fetch("/api/orders", {
				method: "POST",
				body: formData,
				credentials: "include",
				cache: "no-store",
			});

			const data = (await response
				.json()
				.catch(() => null)) as OrdersResponse | null;

			console.log("TRACK ORDER RESPONSE:", data);

			if (!response.ok) {
				throw new Error(
					data?.message ?? "Order not found. Please check your order ID.",
				);
			}

			if (!data?.orders) {
				throw new Error("Order not found. Please check your order ID.");
			}

			const normalized = normalizeOrder(data.orders);

			if (!normalized.id) {
				throw new Error("Order not found. Please check your order ID.");
			}

			setTrackingOrder(normalized);
		} catch (error) {
			console.error("Track order failed:", error);

			setTrackingError(
				error instanceof Error ? error.message : "Unable to find this order.",
			);
		} finally {
			setTrackingLoading(false);
		}
	}, []);

	/* ─────────────────────────────────────
	   QUERY PARAMETER
	───────────────────────────────────── */

	useEffect(() => {
		/*
		 * If the URL contains ?order_id=order_123, put it into the
		 * input and automatically track it.
		 */

		setOrderId(queryOrderId);

		if (queryOrderId) {
			trackOrder(queryOrderId);
		}
	}, [queryOrderId, trackOrder]);

	/* ─────────────────────────────────────
	   FORM SUBMIT
	───────────────────────────────────── */

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		trackOrder(orderId);
	};

	/* ─────────────────────────────────────
	   RENDER
	───────────────────────────────────── */

	return (
		<main
			className="
				min-h-[calc(100vh-90px)]
				bg-[#FBF9F7]
				pt-[112px]
				sm:pt-[120px]
			"
		>
			<section className="mx-auto max-w-4xl px-5 py-10 sm:px-6 lg:px-8 lg:py-16">
				{/* ─────────────────────────────
				    HEADER
				───────────────────────────── */}

				<div className="mx-auto max-w-2xl text-center">
					<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F7D6BF]/50 text-[#85161B]">
						<Package size={28} strokeWidth={1.8} />
					</div>

					<p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-[#85161B]">
						Order tracking
					</p>

					<h1 className="mt-2 text-3xl font-bold tracking-tight text-[#2E2E2E] sm:text-4xl">
						Track your order
					</h1>

					<p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#2E2E2E]/55 sm:text-base">
						Enter your order ID to check the latest status of your order.
					</p>
				</div>

				{/* ─────────────────────────────
				    TRACKING FORM
				───────────────────────────── */}

				<div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-[#E9DED7] bg-white p-5 shadow-[0_12px_45px_rgba(80,40,20,0.06)] sm:p-7">
					<form onSubmit={handleSubmit}>
						<label
							htmlFor="order-id"
							className="mb-2 block text-sm font-semibold text-[#2E2E2E]"
						>
							Order ID
						</label>

						<div className="flex flex-col gap-3 sm:flex-row">
							<div className="relative flex-1">
								<Search
									size={18}
									className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#2E2E2E]/35"
								/>

								<input
									id="order-id"
									type="text"
									value={orderId}
									onChange={(event) => {
										setOrderId(event.target.value);

										/*
										 * Clear the previous result/error when the
										 * user starts typing a new ID.
										 */
										if (trackingError) {
											setTrackingError("");
										}

										if (trackingOrder) {
											setTrackingOrder(null);
										}
									}}
									placeholder="e.g. order_example"
									autoComplete="off"
									className="
										h-12
										w-full
										rounded-xl
										border
										border-[#DED6D0]
										bg-[#FCFAF8]
										pl-11
										pr-4
										text-sm
										text-[#2E2E2E]
										outline-none
										transition
										placeholder:text-[#2E2E2E]/30
										focus:border-[#85161B]/40
										focus:bg-white
										focus:ring-4
										focus:ring-[#85161B]/5
									"
								/>
							</div>

							<button
								type="submit"
								disabled={trackingLoading}
								className="
									inline-flex
									h-12
									items-center
									justify-center
									gap-2
									rounded-xl
									bg-[#85161B]
									px-6
									text-sm
									font-semibold
									text-white
									transition
									hover:bg-[#721318]
									disabled:cursor-not-allowed
									disabled:opacity-60
								"
							>
								{trackingLoading ? (
									<>
										<Loader2 size={17} className="animate-spin" />
										Tracking...
									</>
								) : (
									<>
										Track Order
										<ArrowRight size={16} />
									</>
								)}
							</button>
						</div>

						<p className="mt-3 text-xs text-[#2E2E2E]/40">
							Your order ID can be found in your order confirmation.
						</p>
					</form>
				</div>

				{/* ─────────────────────────────
				    ERROR
				───────────────────────────── */}

				{trackingError && (
					<div className="mx-auto mt-5 flex max-w-2xl items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
						<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-red-500">
							<AlertCircle size={18} />
						</div>

						<div>
							<p className="text-sm font-semibold text-red-700">
								Unable to find order
							</p>

							<p className="mt-1 text-xs leading-5 text-red-600/80">
								{trackingError}
							</p>
						</div>
					</div>
				)}

				{/* ─────────────────────────────
				    RESULT
				───────────────────────────── */}

				{trackingOrder && (
					<div className="mt-8">
						<div className="mb-4 flex items-center justify-between gap-4">
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#85161B]">
									Order found
								</p>

								<h2 className="mt-1 text-xl font-bold text-[#2E2E2E]">
									Order status
								</h2>
							</div>

							<div className="hidden max-w-[250px] break-all rounded-full bg-[#F8F3F0] px-3 py-2 text-xs font-medium text-[#2E2E2E]/55 sm:block">
								{trackingOrder.id}
							</div>
						</div>

						<GuestOrderCard order={trackingOrder} />
					</div>
				)}

				{/* ─────────────────────────────
				    DEFAULT INFORMATION
				───────────────────────────── */}

				{!trackingOrder && !trackingError && !hasTracked && (
					<div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-[#E9DED7] bg-white px-6 py-7 text-center">
						<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F8F3F0] text-[#85161B]">
							<Package size={21} />
						</div>

						<p className="mt-4 text-sm font-semibold text-[#2E2E2E]">
							Enter your order ID to get started
						</p>

						<p className="mx-auto mt-1 max-w-sm text-xs leading-6 text-[#2E2E2E]/45">
							You don&apos;t need to sign in to track an order.
						</p>
					</div>
				)}

				{/* ─────────────────────────────
				    LOGIN OPTION

				    Only shown after /api/auth/init has
				    answered and the visitor is NOT signed in.
				───────────────────────────── */}

				{authChecked && !isLoggedIn && (
					<div className="mx-auto mt-8 flex max-w-2xl flex-col items-center justify-center gap-3 rounded-2xl border border-[#E9DED7] bg-white px-5 py-5 text-center sm:flex-row sm:text-left">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F8F3F0] text-[#85161B]">
							<LogIn size={18} />
						</div>

						<div className="flex-1">
							<p className="text-sm font-semibold text-[#2E2E2E]">
								Have an account?
							</p>

							<p className="mt-0.5 text-xs text-[#2E2E2E]/45">
								Sign in to view your complete order history.
							</p>
						</div>

						<Link
							href="/login"
							className="
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
								transition
								hover:border-[#85161B]/20
								hover:bg-[#F8F3F0]
								hover:text-[#85161B]
							"
						>
							Sign in
							<ArrowRight size={14} />
						</Link>
					</div>
				)}
			</section>
		</main>
	);
}

/* ─────────────────────────────────────────
   GUEST ORDER CARD
───────────────────────────────────────── */

function GuestOrderCard({ order }: { order: Order }) {
	const isDelivered = order.status === "Delivered";

	const isCancelled = order.status === "Cancelled";

	return (
		<article className="overflow-hidden rounded-3xl border border-[#E9DED7] bg-white shadow-[0_12px_45px_rgba(80,40,20,0.06)]">
			{/* ORDER HEADER */}

			<div className="border-b border-[#EEE6E1] px-5 py-5 sm:px-6">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="text-xs text-[#2E2E2E]/45">
							Order placed on {order.date}
						</p>

						<p className="mt-1 break-all text-sm font-semibold text-[#2E2E2E]">
							#{order.id}
						</p>

						{order.deliveryMethod && (
							<p className="mt-1 text-xs capitalize text-[#2E2E2E]/45">
								Delivery method: {order.deliveryMethod}
							</p>
						)}
					</div>

					<StatusBadge status={order.status} type={order.statusType} />
				</div>
			</div>

			{/* CURRENT STATUS */}

			<div className="px-5 py-6 sm:px-6">
				<div className="rounded-2xl bg-[#F8F3F0] p-5">
					<div className="flex items-start gap-4">
						<div
							className={`
								flex
								h-11
								w-11
								shrink-0
								items-center
								justify-center
								rounded-full
								${
									isCancelled
										? "bg-red-100 text-red-600"
										: isDelivered
											? "bg-[#EDF8F0] text-[#31824A]"
											: "bg-[#F7D6BF] text-[#85161B]"
								}
							`}
						>
							{isCancelled ? (
								<AlertCircle size={21} />
							) : isDelivered ? (
								<CheckCircle2 size={21} />
							) : (
								<Package size={21} />
							)}
						</div>

						<div>
							<p className="text-xs font-semibold uppercase tracking-wide text-[#85161B]">
								Current status
							</p>

							<h3 className="mt-1 text-lg font-bold text-[#2E2E2E]">
								{order.status}
							</h3>

							<p className="mt-1 text-sm leading-6 text-[#2E2E2E]/55">
								{getStatusMessage(order.status)}
							</p>
						</div>
					</div>
				</div>

				{/* PROGRESS */}

				{!isCancelled && <StatusProgress status={order.status} />}

				{/* ORDER INFORMATION */}

				<div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
					<div className="rounded-xl border border-[#E9DED7] bg-white p-4">
						<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#2E2E2E]/40">
							Order ID
						</p>

						<p className="mt-1 break-all text-sm font-semibold text-[#2E2E2E]">
							{order.id}
						</p>
					</div>

					<div className="rounded-xl border border-[#E9DED7] bg-white p-4">
						<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#2E2E2E]/40">
							Order date
						</p>

						<p className="mt-1 text-sm font-semibold text-[#2E2E2E]">
							{order.date}
						</p>
					</div>

					{order.deliveryMethod && (
						<div className="rounded-xl border border-[#E9DED7] bg-white p-4">
							<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#2E2E2E]/40">
								Delivery method
							</p>

							<p className="mt-1 text-sm font-semibold capitalize text-[#2E2E2E]">
								{order.deliveryMethod}
							</p>
						</div>
					)}

					<div className="rounded-xl border border-[#E9DED7] bg-white p-4">
						<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#2E2E2E]/40">
							Status
						</p>

						<p className="mt-1 text-sm font-semibold text-[#85161B]">
							{order.status}
						</p>
					</div>
				</div>
			</div>
		</article>
	);
}

/* ─────────────────────────────────────────
   STATUS MESSAGE
───────────────────────────────────────── */

function getStatusMessage(status: OrderStatus) {
	switch (status) {
		case "Order placed":
			return "We've received your order and it is waiting to be processed.";

		case "Order accepted":
			return "Your order has been accepted and is being prepared.";

		case "Packed":
			return "Your order has been packed and is getting ready for dispatch.";

		case "Shipped":
			return "Your order has been shipped and is on its way.";

		case "Delivered":
			return "Your order has been successfully delivered.";

		case "Cancelled":
			return "This order has been cancelled.";

		default:
			return "Your order is being processed.";
	}
}

/* ─────────────────────────────────────────
   STATUS PROGRESS
───────────────────────────────────────── */

function StatusProgress({ status }: { status: OrderStatus }) {
	const steps = [
		{
			label: "Order placed",
			icon: Package,
		},
		{
			label: "Accepted",
			icon: CheckCircle2,
		},
		{
			label: "Packed",
			icon: Box,
		},
		{
			label: "Shipped",
			icon: Truck,
		},
		{
			label: "Delivered",
			icon: CheckCircle2,
		},
	];

	const currentStep = (() => {
		switch (status) {
			case "Order placed":
				return 1;

			case "Order accepted":
				return 2;

			case "Packed":
				return 3;

			case "Shipped":
				return 4;

			case "Delivered":
				return 5;

			default:
				return 1;
		}
	})();

	return (
		<div className="mt-7 rounded-2xl border border-[#E9DED7] bg-white p-5 sm:p-6">
			<p className="mb-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#2E2E2E]/45">
				Order progress
			</p>

			<div className="overflow-x-auto">
				<div className="flex min-w-[560px] items-start">
					{steps.map((step, index) => {
						const stepNumber = index + 1;

						const completed = stepNumber <= currentStep;

						const Icon = step.icon;

						return (
							<React.Fragment key={step.label}>
								<div className="flex flex-1 flex-col items-center">
									<div
										className={`
												flex
												h-9
												w-9
												items-center
												justify-center
												rounded-full
												transition
												${completed ? "bg-[#85161B] text-white" : "bg-[#F3ECE7] text-[#2E2E2E]/30"}
											`}
									>
										<Icon size={15} />
									</div>

									<p
										className={`
												mt-2
												text-center
												text-[10px]
												font-semibold
												${completed ? "text-[#85161B]" : "text-[#2E2E2E]/35"}
											`}
									>
										{step.label}
									</p>
								</div>

								{index < steps.length - 1 && (
									<div
										className={`
												mt-4
												h-0.5
												flex-1
												${stepNumber < currentStep ? "bg-[#85161B]" : "bg-[#E9DED7]"}
											`}
									/>
								)}
							</React.Fragment>
						);
					})}
				</div>
			</div>
		</div>
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
		delivered: "bg-[#EDF8F0] text-[#31824A]",

		shipping: "bg-[#EEF5FF] text-[#3973B9]",

		processing: "bg-[#FFF3E8] text-[#B56B27]",

		cancelled: "bg-red-50 text-red-600",
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