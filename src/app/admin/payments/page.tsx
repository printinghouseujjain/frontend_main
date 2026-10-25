"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, Wallet } from "lucide-react";
import {
	isFailedPayment,
	isHoldStatus,
	upiAwaitingVerification,
} from "@/lib/payment-status";

type PaymentMode = "all" | "credit" | "upi";
type SettleMethod = "credit" | "upi";
type PaymentFilter = "all" | "paid" | "unpaid";

type RawOrder = {
	id?: string | number;
	order_id?: string | number;
	order_status?: string;
	payment_status?: string;
	payment_method?: string;
	payment_menthod?: string;
	payment_settled?: string | boolean | number;
	payment_setteled?: string | boolean | number;
	grand_total?: string | number;
	total_price?: string | number;
	name?: string;
	user_name?: string;
	customer_name?: string;
	created_at?: string;
	address?: string | { name?: string };
};

type Settlement = "yes" | "no" | "failed";

type PaymentOrder = {
	id: string;
	customer: string;
	status: string;
	amount: number;
	settlement: Settlement;
	paymentMethod: SettleMethod | "";
	/* Raw payment method text from the backend, lowercased (e.g. "razorpay") */
	rawMethod: string;
	/* True when the order came back from the UPI/credit pending-approval list */
	pendingApproval: boolean;
	paymentStatus: string;
	date: string;
};

const STATUS_OPTIONS = [
	"pending",
	"accepted",
	"packed",
	"shipped",
	"delivered",
	"cancelled",
] as const;

function asNumber(value: unknown) {
	const number = Number(value ?? 0);
	return Number.isFinite(number) ? number : 0;
}

function settlementOf(raw: RawOrder): Settlement {
	const value = raw.payment_settled ?? raw.payment_setteled;

	if (typeof value === "boolean") {
		return value ? "yes" : "no";
	}

	const text = String(value ?? "no")
		.trim()
		.toLowerCase();

	if (text === "failed" || text === "fail") {
		return "failed";
	}

	if (text === "yes" || text === "true" || text === "1" || text === "settled") {
		return "yes";
	}

	return "no";
}

function customerName(raw: RawOrder) {
	let addressName = "";

	if (typeof raw.address === "string") {
		try {
			const parsed = JSON.parse(raw.address) as { name?: string };
			addressName = parsed.name ?? "";
		} catch {
			addressName = "";
		}
	} else if (raw.address && typeof raw.address === "object") {
		addressName = raw.address.name ?? "";
	}

	return (
		raw.name || raw.user_name || raw.customer_name || addressName || "Customer"
	);
}

function paymentStateLabel(order: PaymentOrder) {
	const method = order.paymentMethod || "";

	if (order.settlement === "yes") {
		return method === "upi" ? "Payment verified" : "Payment settled";
	}

	if (
		isHoldStatus(order.paymentStatus) ||
		upiAwaitingVerification(method, order.settlement, order.paymentStatus)
	) {
		return "Under verification";
	}

	if (order.settlement === "failed" || isFailedPayment(order.paymentStatus)) {
		return method === "upi" ? "Not received" : "Payment failed";
	}

	return "Payment not settled";
}

function paymentStatusLabel(status: string) {
	if (!status) return "";
	if (isHoldStatus(status)) return "On hold";
	if (isFailedPayment(status)) return "Not received";
	return status;
}

function rawPaymentMethodOf(raw: RawOrder): string {
	return String(raw.payment_method ?? raw.payment_menthod ?? "")
		.trim()
		.toLowerCase();
}

function paymentMethodOf(raw: RawOrder): SettleMethod | "" {
	const text = rawPaymentMethodOf(raw);

	return text === "upi" || text === "credit" ? text : "";
}

function normalize(raw: RawOrder): PaymentOrder {
	return {
		id: String(raw.order_id ?? raw.id ?? ""),
		customer: customerName(raw),
		status: String(raw.order_status ?? "pending").toLowerCase(),
		amount: asNumber(raw.grand_total) || asNumber(raw.total_price),
		settlement: settlementOf(raw),
		paymentMethod: paymentMethodOf(raw),
		rawMethod: rawPaymentMethodOf(raw),
		pendingApproval: false,
		paymentStatus: String(raw.payment_status ?? "")
			.trim()
			.toLowerCase(),
		date: raw.created_at ?? "",
	};
}

/*
 * This page is only for UPI and credit payments, so Razorpay orders
 * (and anything else) are left out.
 *
 * An order is kept when:
 * - its payment method is UPI or credit, or
 * - it came back from the UPI/credit pending-approval request (which by
 *   definition only contains UPI/credit orders), in case the backend
 *   leaves its payment method field empty.
 *
 * An order explicitly marked Razorpay is always excluded.
 */
function isCreditOrUpiOrder(order: PaymentOrder) {
	if (order.rawMethod.includes("razorpay")) {
		return false;
	}

	return (
		order.paymentMethod === "upi" ||
		order.paymentMethod === "credit" ||
		order.pendingApproval
	);
}

function extractOrders(data: unknown): PaymentOrder[] {
	if (!data || typeof data !== "object") {
		return [];
	}

	const value = data as { orders?: unknown; order?: unknown; result?: unknown };
	const list = Array.isArray(value.orders)
		? value.orders
		: Array.isArray(value.result)
			? value.result
			: value.order
				? [value.order]
				: [];

	return list
		.filter(
			(item): item is RawOrder => Boolean(item) && typeof item === "object",
		)
		.map(normalize)
		.filter((order) => order.id);
}

export default function AdminPaymentsPage() {
	const [mode, setMode] = useState<PaymentMode>("all");
	const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
	const [orders, setOrders] = useState<PaymentOrder[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");
	const [statuses, setStatuses] = useState<Record<string, string>>({});
	const [savingId, setSavingId] = useState("");
	const [settleOrder, setSettleOrder] = useState<PaymentOrder | null>(null);
	const [amount, setAmount] = useState("");
	const [utr, setUtr] = useState("");
	const [senderName, setSenderName] = useState("");
	const [receivedAt, setReceivedAt] = useState("");
	const [notes, setNotes] = useState("");
	const [formError, setFormError] = useState("");
	const [settling, setSettling] = useState(false);
	const [pendingAccept, setPendingAccept] = useState<PaymentOrder | null>(null);
	const [cancelOrder, setCancelOrder] = useState<PaymentOrder | null>(null);
	const [cancelReason, setCancelReason] = useState("");
	const [quickOrderId, setQuickOrderId] = useState("");
	const [quickMethod, setQuickMethod] = useState<SettleMethod>("upi");
	const [quickAmount, setQuickAmount] = useState("");
	const [quickUtr, setQuickUtr] = useState("");
	const [quickName, setQuickName] = useState("");
	const [quickTime, setQuickTime] = useState("");
	const [quickNotes, setQuickNotes] = useState("");
	const [quickError, setQuickError] = useState("");
	const [quickSaving, setQuickSaving] = useState(false);
	const [rejectOrder, setRejectOrder] = useState<PaymentOrder | null>(null);
	const [rejectNotes, setRejectNotes] = useState("");
	const [rejecting, setRejecting] = useState(false);

	const loadOrders = useCallback(async () => {
		setLoading(true);
		setError("");

		try {
			const loadList = async (mode?: "pending") => {
				let response: Response;

				if (mode) {
					// Filtered list: mode is sent as form data in a POST body
					const formData = new FormData();
					formData.append("mode", mode);
					formData.append("command_type", "admin");

					response = await fetch("/api/admin/orders", {
						method: "POST",
						credentials: "include",
						cache: "no-store",
						body: formData,
					});
				} else {
					// Normal list: unchanged, no mode
					response = await fetch("/api/admin/orders?command_type=admin", {
						method: "GET",
						credentials: "include",
						cache: "no-store",
					});
				}

				const data = await response.json().catch(() => ({}));

				if (!response.ok) {
					throw new Error(data?.message || "Unable to load orders.");
				}

				return extractOrders(data);
			};

			const [allOrders, pendingOrders] = await Promise.all([
				loadList(), // normal list, unchanged (GET, no mode)
				loadList("pending"), // UPI + credit approval-pending orders (POST, form data)
			]);

			const merged = new Map<string, PaymentOrder>();

			const addOrders = (list: PaymentOrder[]) => {
				for (const order of list) {
					const current = merged.get(order.id);

					if (!current) {
						merged.set(order.id, order);
						continue;
					}

					const settlement =
						current.settlement === "yes" || current.settlement === "failed"
							? current.settlement
							: order.settlement;

					merged.set(order.id, {
						...current,
						paymentMethod: current.paymentMethod || order.paymentMethod,
						rawMethod: current.rawMethod || order.rawMethod,
						paymentStatus: current.paymentStatus || order.paymentStatus,
						settlement,
					});
				}
			};

			addOrders(allOrders);
			addOrders(pendingOrders);

			/*
			 * Orders from the pending-approval request are UPI/credit orders.
			 * Flag them, then drop everything that isn't UPI or credit
			 * (i.e. Razorpay orders).
			 */
			const pendingIds = new Set(pendingOrders.map((order) => order.id));

			const next = [...merged.values()]
				.map((order) => ({
					...order,
					pendingApproval: pendingIds.has(order.id),
				}))
				.filter(isCreditOrUpiOrder);

			setOrders(next);
			setStatuses(
				Object.fromEntries(next.map((order) => [order.id, order.status])),
			);
		} catch (loadError) {
			setError(
				loadError instanceof Error
					? loadError.message
					: "Unable to load orders.",
			);
			setOrders([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadOrders();
	}, [loadOrders]);

	const visibleOrders = useMemo(() => {
		return orders.filter((order) => {
			if (mode === "credit" && order.paymentMethod !== "credit") {
				return false;
			}

			if (mode === "upi" && order.paymentMethod !== "upi") {
				return false;
			}

			const paid = order.paymentStatus === "paid";

			if (paymentFilter === "paid") return paid;
			if (paymentFilter === "unpaid") return !paid;

			return true;
		});
	}, [orders, mode, paymentFilter]);

	const updateStatus = async (order: PaymentOrder, reason?: string) => {
		const nextStatus = statuses[order.id] ?? order.status;

		setSavingId(order.id);
		setMessage("");
		setError("");

		try {
			const response = await fetch("/api/update_order", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					command_type: "admin",
					order_id: order.id,
					status: nextStatus,
					current_status: order.status,
					...(nextStatus === "cancelled" && reason ? { reason } : {}),
				}),
			});

			const data = await response.json().catch(() => ({}));

			if (!response.ok) {
				throw new Error(data?.message || "Unable to update order status.");
			}

			setOrders((current) =>
				current.map((item) =>
					item.id === order.id ? { ...item, status: nextStatus } : item,
				),
			);
			setMessage(`Order #${order.id} updated to ${nextStatus}.`);
		} catch (updateError) {
			setStatuses((current) => ({ ...current, [order.id]: order.status }));
			setError(
				updateError instanceof Error
					? updateError.message
					: "Unable to update order status.",
			);
		} finally {
			setSavingId("");
		}
	};

	const requestStatusUpdate = (order: PaymentOrder) => {
		const nextStatus = statuses[order.id] ?? order.status;

		if (nextStatus === order.status || savingId) {
			return;
		}

		if (nextStatus === "cancelled") {
			setCancelReason("");
			setFormError("");
			setCancelOrder(order);
			return;
		}

		if (nextStatus === "accepted" && order.settlement !== "yes") {
			setPendingAccept(order);
			return;
		}

		void updateStatus(order);
	};

	const openSettle = (order: PaymentOrder) => {
		setSettleOrder(order);
		setAmount(order.amount > 0 ? String(order.amount) : "");
		setUtr("");
		setSenderName(order.customer === "Customer" ? "" : order.customer);
		setReceivedAt("");
		setNotes("");
		setFormError("");
	};

	const submitQuickAccept = async () => {
		const orderId = quickOrderId.trim();
		const received = Number(quickAmount);

		if (!orderId) {
			setQuickError("Enter an order ID.");
			return;
		}

		if (!Number.isFinite(received) || received <= 0) {
			setQuickError("Enter the amount received. It must be greater than 0.");
			return;
		}

		setQuickSaving(true);
		setQuickError("");
		setMessage("");
		setError("");

		try {
			const response = await fetch("/api/accept_payment", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					command_type: "admin",
					payment_method: quickMethod,
					order_id: orderId,
					amount: received,
					utr: quickUtr.trim(),
					name: quickName.trim(),
					time: quickTime.trim(),
					notes: quickNotes.trim(),
				}),
			});

			const data = await response.json().catch(() => ({}));

			if (!response.ok) {
				throw new Error(data?.message || "Unable to settle this payment.");
			}

			setQuickOrderId("");
			setQuickAmount("");
			setQuickUtr("");
			setQuickName("");
			setQuickTime("");
			setQuickNotes("");
			setMessage(`Payment for order #${orderId} marked as received.`);
			await loadOrders();
		} catch (acceptError) {
			setQuickError(
				acceptError instanceof Error
					? acceptError.message
					: "Unable to settle this payment.",
			);
		} finally {
			setQuickSaving(false);
		}
	};

	const submitReject = async () => {
		if (!rejectOrder) {
			return;
		}

		setRejecting(true);
		setFormError("");

		try {
			const response = await fetch("/api/reject_payment", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					command_type: "admin",
					order_id: rejectOrder.id,
					notes: rejectNotes.trim(),
				}),
			});

			const data = await response.json().catch(() => ({}));

			if (!response.ok) {
				throw new Error(data?.message || "Unable to reject this payment.");
			}

			setRejectOrder(null);
			setRejectNotes("");
			setMessage(
				`UPI payment for order #${rejectOrder.id} marked as not received.`,
			);
			await loadOrders();
		} catch (rejectError) {
			setFormError(
				rejectError instanceof Error
					? rejectError.message
					: "Unable to reject this payment.",
			);
		} finally {
			setRejecting(false);
		}
	};

	const submitSettle = async () => {
		if (!settleOrder) {
			return;
		}

		const received = Number(amount);

		if (!Number.isFinite(received) || received <= 0) {
			setFormError("Enter the amount received. It must be greater than 0.");
			return;
		}

		const paymentMethod =
			settleOrder.paymentMethod ||
			(mode === "credit" || mode === "upi" ? mode : "");

		if (paymentMethod !== "upi" && paymentMethod !== "credit") {
			setFormError("Only UPI and credit payments can be marked as received.");
			return;
		}

		setSettling(true);
		setFormError("");

		try {
			const response = await fetch("/api/accept_payment", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					command_type: "admin",
					payment_method: paymentMethod,
					order_id: settleOrder.id,
					amount: received,
					utr: utr.trim(),
					name: senderName.trim(),
					time: receivedAt.trim(),
					notes: notes.trim(),
				}),
			});

			const data = await response.json().catch(() => ({}));

			if (!response.ok) {
				throw new Error(data?.message || "Unable to settle this payment.");
			}

			setSettleOrder(null);
			setMessage(`Payment for order #${settleOrder.id} marked as received.`);
			await loadOrders();
		} catch (settleError) {
			setFormError(
				settleError instanceof Error
					? settleError.message
					: "Unable to settle this payment.",
			);
		} finally {
			setSettling(false);
		}
	};

	return (
		<main className="min-h-screen bg-[#FBF9F7] px-4 py-6 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-6xl">
				<div className="mb-6 flex items-start gap-4">
					<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#85161B] text-white">
						<Wallet size={22} />
					</div>
					<div>
						<h1 className="text-2xl font-bold text-[#2E2E2E] sm:text-3xl">
							Credit & UPI payments
						</h1>
						<p className="mt-1 text-sm text-[#2E2E2E]/55">
							UPI payments are for the full amount and stay under verification
							until you mark them as received. Credit payments stay unsettled
							until the amount is collected.
						</p>
					</div>
				</div>

				<section className="mb-5 rounded-2xl border border-[#E8DED7] bg-white p-4 sm:p-5">
					<h2 className="text-xl font-semibold text-[#2E2E2E]">
						Mark received by order ID
					</h2>
					<p className="mt-1 text-xs text-[#2E2E2E]/55">
						Verify a UPI payment or mark a credit payment as received without
						searching the list.
					</p>
					<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						<label className="text-sm font-medium">
							Order ID
							<input
								value={quickOrderId}
								onChange={(event) => setQuickOrderId(event.target.value)}
								className="mt-1.5 w-full rounded-xl border border-[#E8DED7] px-3 py-2.5 text-sm outline-none focus:border-[#85161B]"
							/>
						</label>
						<label className="text-sm font-medium">
							Payment method
							<select
								value={quickMethod}
								onChange={(event) =>
									setQuickMethod(event.target.value as SettleMethod)
								}
								className="mt-1.5 w-full rounded-xl border border-[#E8DED7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#85161B]"
							>
								<option value="upi">UPI</option>
								<option value="credit">Credit</option>
							</select>
						</label>
						<label className="text-sm font-medium">
							Amount received
							<input
								type="number"
								min={0}
								step="0.01"
								value={quickAmount}
								onChange={(event) => setQuickAmount(event.target.value)}
								className="mt-1.5 w-full rounded-xl border border-[#E8DED7] px-3 py-2.5 text-sm outline-none focus:border-[#85161B]"
							/>
						</label>
						<label className="text-sm font-medium">
							UTR (optional)
							<input
								value={quickUtr}
								onChange={(event) => setQuickUtr(event.target.value)}
								className="mt-1.5 w-full rounded-xl border border-[#E8DED7] px-3 py-2.5 text-sm outline-none focus:border-[#85161B]"
							/>
						</label>
						<label className="text-sm font-medium">
							Sender name (optional)
							<input
								value={quickName}
								onChange={(event) => setQuickName(event.target.value)}
								className="mt-1.5 w-full rounded-xl border border-[#E8DED7] px-3 py-2.5 text-sm outline-none focus:border-[#85161B]"
							/>
						</label>
						<label className="text-sm font-medium">
							Received at (optional)
							<input
								type="datetime-local"
								value={quickTime}
								onChange={(event) => setQuickTime(event.target.value)}
								className="mt-1.5 w-full rounded-xl border border-[#E8DED7] px-3 py-2.5 text-sm outline-none focus:border-[#85161B]"
							/>
						</label>
						<label className="text-sm font-medium sm:col-span-2">
							Notes (optional)
							<input
								value={quickNotes}
								onChange={(event) => setQuickNotes(event.target.value)}
								className="mt-1.5 w-full rounded-xl border border-[#E8DED7] px-3 py-2.5 text-sm outline-none focus:border-[#85161B]"
							/>
						</label>
					</div>
					{quickError && (
						<p className="mt-3 text-xs font-medium text-red-600">
							{quickError}
						</p>
					)}
					<button
						type="button"
						disabled={quickSaving}
						onClick={() => void submitQuickAccept()}
						className="mt-4 rounded-xl bg-[#85161B] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
					>
						{quickSaving ? "Saving..." : "Mark received"}
					</button>
				</section>

				<div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex gap-2">
						{(["all", "credit", "upi"] as const).map((item) => (
							<button
								key={item}
								type="button"
								onClick={() => setMode(item)}
								className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${
									mode === item
										? "bg-[#85161B] text-white"
										: "border border-[#E8DED7] bg-white text-[#2E2E2E]/70"
								}`}
							>
								{item}
							</button>
						))}
					</div>

					<label className="text-sm font-medium text-[#2E2E2E]">
						<span className="mr-2">Payment</span>
						<select
							value={paymentFilter}
							onChange={(event) =>
								setPaymentFilter(event.target.value as PaymentFilter)
							}
							className="rounded-xl border border-[#E8DED7] bg-white px-3 py-2 text-sm outline-none focus:border-[#85161B]"
						>
							<option value="all">All payments</option>
							<option value="paid">Paid</option>
							<option value="unpaid">Unpaid</option>
						</select>
					</label>
				</div>

				{message && (
					<p className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
						{message}
					</p>
				)}

				{error && (
					<p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
						{error}
					</p>
				)}

				{loading ? (
					<div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-[#E8DED7] bg-white">
						<Loader2 className="animate-spin text-[#85161B]" />
					</div>
				) : visibleOrders.length === 0 ? (
					<div className="rounded-2xl border border-dashed border-[#E8DED7] bg-white px-6 py-16 text-center text-sm text-[#2E2E2E]/50">
						No payments match this tab and filter.
					</div>
				) : (
					<div className="space-y-3">
						{visibleOrders.map((order) => (
							<article
								key={order.id}
								className="rounded-2xl border border-[#E8DED7] bg-white p-4 sm:p-5"
							>
								<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
									<div className="min-w-0">
										<div className="flex flex-wrap items-center gap-2">
											<Link
												href={`/admin/orders/${encodeURIComponent(order.id)}`}
												className="text-sm font-semibold text-[#85161B] hover:underline"
											>
												#{order.id}
											</Link>
											{order.paymentMethod && (
												<span className="rounded-full bg-[#F8F3F0] px-2.5 py-1 text-xs font-semibold uppercase text-[#85161B]">
													{order.paymentMethod}
												</span>
											)}
											{order.paymentStatus && (
												<span className="rounded-full bg-[#F8F3F0] px-2.5 py-1 text-xs font-semibold capitalize text-[#2E2E2E]/70">
													{paymentStatusLabel(order.paymentStatus)}
												</span>
											)}
											<span
												className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
													order.settlement === "yes"
														? "bg-green-50 text-green-700"
														: order.settlement === "failed" &&
															  !isHoldStatus(order.paymentStatus)
															? "bg-red-50 text-red-700"
															: "bg-amber-50 text-amber-800"
												}`}
											>
												{paymentStateLabel(order)}
											</span>
										</div>
										<p className="mt-1 text-sm text-[#2E2E2E]">
											{order.customer}
										</p>
										<p className="mt-1 text-sm text-[#2E2E2E]/55">
											₹{order.amount.toLocaleString("en-IN")}
											{order.date ? ` · ${order.date}` : ""}
										</p>
									</div>

									<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
										<select
											value={statuses[order.id] ?? order.status}
											onChange={(event) =>
												setStatuses((current) => ({
													...current,
													[order.id]: event.target.value,
												}))
											}
											className="rounded-xl border border-[#E8DED7] bg-white px-3 py-2.5 text-sm"
										>
											{STATUS_OPTIONS.map((option) => (
												<option key={option} value={option}>
													{option.charAt(0).toUpperCase() + option.slice(1)}
												</option>
											))}
											{order.status &&
												!STATUS_OPTIONS.includes(
													order.status as (typeof STATUS_OPTIONS)[number],
												) && (
													<option value={order.status}>
														{isHoldStatus(order.status)
															? "On hold"
															: isFailedPayment(order.status)
																? "Not received"
																: order.status}
													</option>
												)}
										</select>

										<button
											type="button"
											disabled={
												savingId === order.id ||
												(statuses[order.id] ?? order.status) === order.status
											}
											onClick={() => requestStatusUpdate(order)}
											className="rounded-xl bg-[#85161B] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
										>
											{savingId === order.id ? "Saving..." : "Update status"}
										</button>

										{(order.paymentMethod === "upi" ||
											order.paymentMethod === "credit" ||
											mode === "upi" ||
											mode === "credit") && (
											<button
												type="button"
												disabled={order.settlement === "yes" || settling}
												onClick={() => openSettle(order)}
												className="rounded-xl border border-[#85161B] px-4 py-2.5 text-sm font-semibold text-[#85161B] disabled:opacity-50"
											>
												{order.settlement === "yes"
													? "Received"
													: "Mark received"}
											</button>
										)}

										{(order.paymentMethod === "upi" ||
											(mode === "upi" && !order.paymentMethod)) &&
											order.settlement !== "failed" &&
											order.settlement !== "yes" && (
												<button
													type="button"
													disabled={rejecting}
													onClick={() => {
														setRejectNotes("");
														setFormError("");
														setRejectOrder(order);
													}}
													className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50"
												>
													Fail payment
												</button>
											)}
									</div>
								</div>
							</article>
						))}
					</div>
				)}
			</div>

			{pendingAccept && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
						<div className="flex items-start gap-3">
							<AlertTriangle className="mt-0.5 shrink-0 text-amber-600" />
							<div>
								<h2 className="text-lg font-semibold text-[#2E2E2E]">
									{(pendingAccept.paymentMethod || mode) === "credit"
										? "Payment is not settled"
										: "Payment is not verified"}
								</h2>
								<p className="mt-2 text-sm leading-6 text-[#2E2E2E]/70">
									{(pendingAccept.paymentMethod || mode) === "credit"
										? `Accepting order #${pendingAccept.id} will confirm a credit request of ₹${pendingAccept.amount.toLocaleString("en-IN")} even though this payment has not been received.`
										: `The customer paid the full UPI amount of ₹${pendingAccept.amount.toLocaleString("en-IN")} for order #${pendingAccept.id}. It is still under verification and has not been marked as received.`}
								</p>
							</div>
						</div>
						<div className="mt-6 flex justify-end gap-3">
							<button
								type="button"
								onClick={() => {
									setStatuses((current) => ({
										...current,
										[pendingAccept.id]: pendingAccept.status,
									}));
									setPendingAccept(null);
								}}
								className="rounded-xl border border-[#E8DED7] px-4 py-2.5 text-sm font-semibold"
							>
								Back
							</button>
							<button
								type="button"
								onClick={() => {
									const order = pendingAccept;
									setPendingAccept(null);
									void updateStatus(order);
								}}
								className="rounded-xl bg-[#85161B] px-4 py-2.5 text-sm font-semibold text-white"
							>
								Accept anyway
							</button>
						</div>
					</div>
				</div>
			)}

			{cancelOrder && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
						<h2 className="text-lg font-semibold">
							Cancel order #{cancelOrder.id}
						</h2>
						<textarea
							value={cancelReason}
							onChange={(event) => setCancelReason(event.target.value)}
							rows={3}
							placeholder="Reason for cancellation"
							className="mt-4 w-full rounded-xl border border-[#E8DED7] px-3 py-2.5 text-sm outline-none focus:border-[#85161B]"
						/>
						{formError && (
							<p className="mt-2 text-xs font-medium text-red-600">
								{formError}
							</p>
						)}
						<div className="mt-5 flex justify-end gap-3">
							<button
								type="button"
								onClick={() => {
									setStatuses((current) => ({
										...current,
										[cancelOrder.id]: cancelOrder.status,
									}));
									setCancelOrder(null);
								}}
								className="rounded-xl border border-[#E8DED7] px-4 py-2.5 text-sm font-semibold"
							>
								Back
							</button>
							<button
								type="button"
								onClick={() => {
									if (!cancelReason.trim()) {
										setFormError("Please add a reason for the cancellation.");
										return;
									}

									const order = cancelOrder;
									const reason = cancelReason.trim();
									setCancelOrder(null);
									void updateStatus(order, reason);
								}}
								className="rounded-xl bg-[#85161B] px-4 py-2.5 text-sm font-semibold text-white"
							>
								Confirm cancellation
							</button>
						</div>
					</div>
				</div>
			)}

			{rejectOrder && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
						<h2 className="text-lg font-semibold">
							Fail UPI payment #{rejectOrder.id}
						</h2>
						<p className="mt-1.5 text-sm text-[#2E2E2E]/55">
							The customer can then repay this order with UPI or Razorpay.
						</p>
						<label className="mt-4 block text-sm font-medium">
							Notes (optional)
							<textarea
								value={rejectNotes}
								onChange={(event) => setRejectNotes(event.target.value)}
								rows={3}
								className="mt-1.5 w-full rounded-xl border border-[#E8DED7] px-3 py-2.5 text-sm outline-none focus:border-[#85161B]"
							/>
						</label>
						{formError && (
							<p className="mt-2 text-xs font-medium text-red-600">
								{formError}
							</p>
						)}
						<div className="mt-5 flex justify-end gap-3">
							<button
								type="button"
								onClick={() => setRejectOrder(null)}
								className="rounded-xl border border-[#E8DED7] px-4 py-2.5 text-sm font-semibold"
							>
								Back
							</button>
							<button
								type="button"
								disabled={rejecting}
								onClick={() => void submitReject()}
								className="rounded-xl bg-[#85161B] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
							>
								{rejecting ? "Saving..." : "Mark as failed"}
							</button>
						</div>
					</div>
				</div>
			)}

			{settleOrder && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
						<h2 className="flex items-center gap-2 text-lg font-semibold">
							<CheckCircle2 size={18} className="text-[#85161B]" />
							Mark payment received
						</h2>
						<p className="mt-1.5 text-sm text-[#2E2E2E]/55">
							Order #{settleOrder.id} · Original total ₹
							{settleOrder.amount.toLocaleString("en-IN")}
						</p>

						<label className="mt-4 block text-sm font-medium">
							Amount received
							<input
								type="number"
								min={0}
								step="0.01"
								value={amount}
								onChange={(event) => setAmount(event.target.value)}
								className="mt-1.5 w-full rounded-xl border border-[#E8DED7] px-3 py-2.5 text-sm outline-none focus:border-[#85161B]"
							/>
						</label>

						<label className="mt-3 block text-sm font-medium">
							UTR / UPI reference (optional)
							<input
								value={utr}
								onChange={(event) => setUtr(event.target.value)}
								className="mt-1.5 w-full rounded-xl border border-[#E8DED7] px-3 py-2.5 text-sm outline-none focus:border-[#85161B]"
							/>
						</label>

						<label className="mt-3 block text-sm font-medium">
							Sender name (optional)
							<input
								value={senderName}
								onChange={(event) => setSenderName(event.target.value)}
								className="mt-1.5 w-full rounded-xl border border-[#E8DED7] px-3 py-2.5 text-sm outline-none focus:border-[#85161B]"
							/>
						</label>

						<label className="mt-3 block text-sm font-medium">
							Received at (optional)
							<input
								type="datetime-local"
								value={receivedAt}
								onChange={(event) => setReceivedAt(event.target.value)}
								className="mt-1.5 w-full rounded-xl border border-[#E8DED7] px-3 py-2.5 text-sm outline-none focus:border-[#85161B]"
							/>
						</label>

						<label className="mt-3 block text-sm font-medium">
							Notes (optional)
							<textarea
								value={notes}
								onChange={(event) => setNotes(event.target.value)}
								rows={2}
								className="mt-1.5 w-full rounded-xl border border-[#E8DED7] px-3 py-2.5 text-sm outline-none focus:border-[#85161B]"
							/>
						</label>

						{formError && (
							<p className="mt-2 text-xs font-medium text-red-600">
								{formError}
							</p>
						)}

						<div className="mt-5 flex justify-end gap-3">
							<button
								type="button"
								onClick={() => setSettleOrder(null)}
								className="rounded-xl border border-[#E8DED7] px-4 py-2.5 text-sm font-semibold"
							>
								Back
							</button>
							<button
								type="button"
								disabled={settling}
								onClick={() => void submitSettle()}
								className="rounded-xl bg-[#85161B] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
							>
								{settling ? "Saving..." : "Confirm received"}
							</button>
						</div>
					</div>
				</div>
			)}
		</main>
	);
}
