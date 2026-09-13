"use client";

import React, { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import {
	AlertCircle,
	AlertTriangle,
	ArrowLeft,
	CalendarDays,
	CreditCard,
	MessageCircle,
	Monitor,
	MapPin,
	Phone,
	Save,
	Store,
	Truck,
	User,
} from "lucide-react";

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */

const PRODUCT_IMAGE_URL = "https://api.printinghouseujjain.in/assets/products/";

const UPLOAD_IMAGE_URL = "https://api.printinghouseujjain.in/assets/uploads/";

const BRAND_PHONE = "8827882713";

const BRAND_EMAIL = "";

const BRAND_INSTAGRAM = "";

const BRAND_FACEBOOK = "";

const PRODUCT_REVIEW_URL = (orderId: string) =>
	`https://api.printinghouseujjain.in/orders/${encodeURIComponent(orderId)}`;

const GOOGLE_REVIEW_URL =
	"https://www.google.com/maps/search/?api=1&query=Printing+House+Ujjain%2C+Ujjain%2C+Madhya+Pradesh";

/* ─────────────────────────────────────────
   STATUS OPTIONS
───────────────────────────────────────── */

const STATUS_OPTIONS = [
	"pending",
	"accepted",
	"packed",
	"shipped",
	"delivered",
	"cancelled",
] as const;

type StatusOption = (typeof STATUS_OPTIONS)[number];

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */

type RawItem = {
	id?: string | number;
	name?: string;
	primary_photo_path?: string;
	quantity?: string | number;
	selling_price?: string | number;
	customization?: string;
	market_price?: string | number;
	reseller_price?: string | number;
	description?: string;
	customize_reqs?: string | string[];
	keywords?: string;
	delivery?: string | number;
	[key: string]: unknown;
};

type RawAddress = {
	name?: string;
	phone?: string;
	flat_house_building?: string;
	road_area_colony?: string;
	landmark?: string;
	city?: string;
	state?: string;
	pincode?: string | number;
	[key: string]: unknown;
};

type RawOrder = {
	id?: string | number;
	order_id?: string | number;

	user_id?: string | number;

	name?: string;
	user_name?: string;
	customer_name?: string;

	email?: string;
	phone?: string;

	user?: Record<string, unknown> | null;
	customer?: Record<string, unknown> | null;

	delivery_method?: string;
	type?: string;

	payment_status?: string;
	order_status?: string;

	address?: string | RawAddress | null;

	cart?: string | RawItem[] | null;

	total_price?: string | number;
	delivery_fee?: string | number;
	grand_total?: string | number;

	created_at?: string;

	[key: string]: unknown;
};

type AdminOrderResponse = {
	status?: number;
	message?: string;
	order?: RawOrder;
	orders?: RawOrder[];
	wishlist?: RawOrder[];
	result?: RawOrder[];
	data?: RawOrder | RawOrder[];
};

type DetailOrder = {
	id: string;
	status: string;
	rawStatus: string;
	date: string;
	createdAt?: string;

	method: "pickup" | "delivery";

	paymentStatus: string;

	items: RawItem[];

	address: RawAddress | null;

	customer: {
		name: string;
		email: string;
		phone: string;
		id: string;
	};

	total: number;
	deliveryFee: number;
	grandTotal: number;
};

type CurrentProduct = {
	id?: string | number;
	updated_at?: string;
	[key: string]: unknown;
};

type ProductCheck = {
	loading: boolean;
	stale: boolean;
	current?: CurrentProduct;
};

type RefundForm = {
	type: "full" | "partial";
	amount: string;
	reason: string;
};

/* ─────────────────────────────────────────
   NUMBER HELPERS
───────────────────────────────────────── */

function asNumber(value: unknown): number {
	const number = Number(value ?? 0);

	return Number.isFinite(number) ? number : 0;
}

/* ─────────────────────────────────────────
   JSON HELPER
───────────────────────────────────────── */

function parseJson<T>(value: unknown, fallback: T): T {
	if (value === null || value === undefined) {
		return fallback;
	}

	if (typeof value !== "string") {
		return (value as T) ?? fallback;
	}

	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
}

/* ─────────────────────────────────────────
   STATUS NORMALIZATION
───────────────────────────────────────── */

function normalizeStatus(value: unknown): string {
	const status = String(value ?? "pending")
		.toLowerCase()
		.replace(/[\s_-]+/g, "");

	if (status.includes("cancel")) {
		return "Cancelled";
	}

	if (status.includes("pack")) {
		return "Packed";
	}

	if (status.includes("deliver") || status.includes("complete")) {
		return "Delivered";
	}

	if (
		status.includes("ship") ||
		status.includes("dispatch") ||
		status.includes("outfordelivery")
	) {
		return "Shipped";
	}

	if (
		status.includes("process") ||
		status.includes("confirm") ||
		status.includes("accept")
	) {
		return "Processing";
	}

	return "Pending";
}

function rawStatus(value: unknown): string {
	return String(value ?? "pending")
		.toLowerCase()
		.replace(/[\s_-]+/g, "");
}

/* ─────────────────────────────────────────
   PRODUCT RESPONSE
───────────────────────────────────────── */

function productFromResponse(data: unknown): CurrentProduct | null {
	if (!data || typeof data !== "object") {
		return null;
	}

	const value = data as {
		result?: CurrentProduct;
		product?: CurrentProduct;
		data?: CurrentProduct;
	};

	if (value.result) {
		return value.result;
	}

	if (value.product) {
		return value.product;
	}

	if (value.data && typeof value.data === "object") {
		return value.data;
	}

	return data as CurrentProduct;
}

/* ─────────────────────────────────────────
   PRODUCT UPDATE CHECK
───────────────────────────────────────── */

function productWasUpdatedAfterOrder(
	product: CurrentProduct,
	orderCreatedAt?: string,
): boolean {
	if (!product.updated_at || !orderCreatedAt) {
		return false;
	}

	const productUpdated = new Date(
		product.updated_at.replace(" ", "T"),
	).getTime();

	const orderCreated = new Date(orderCreatedAt.replace(" ", "T")).getTime();

	return (
		Number.isFinite(productUpdated) &&
		Number.isFinite(orderCreated) &&
		productUpdated > orderCreated
	);
}

/* ─────────────────────────────────────────
   WHATSAPP URLS
───────────────────────────────────────── */

function whatsappUrls(phone: string | undefined, text: string) {
	const digits = String(phone ?? "").replace(/\D/g, "");

	if (!digits) {
		return {
			app: "",
			web: "",
		};
	}

	const normalizedPhone = digits.length === 10 ? `91${digits}` : digits;

	const encodedText = encodeURIComponent(text);

	return {
		app: `https://wa.me/${normalizedPhone}?text=${encodedText}`,

		web: `https://web.whatsapp.com/send/?phone=${normalizedPhone}&text=${encodedText}`,
	};
}

/* ─────────────────────────────────────────
   DATE / TIME
───────────────────────────────────────── */

function formatTime(value?: string) {
	if (!value) {
		return "—";
	}

	const date = new Date(value.replace(" ", "T"));

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return date.toLocaleTimeString("en-IN", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
	});
}

function formatDate(value?: string) {
	if (!value) {
		return "—";
	}

	const date = new Date(value.replace(" ", "T"));

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return date.toLocaleDateString("en-IN", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	});
}

/* ─────────────────────────────────────────
   PAYMENT
───────────────────────────────────────── */

function paymentLabel(status: string) {
	const normalized = status.toLowerCase();

	if (normalized.includes("paid")) {
		return "PAID";
	}

	if (normalized.includes("refund")) {
		return "REFUNDED";
	}

	if (normalized.includes("pending")) {
		return "PENDING";
	}

	return status.toUpperCase();
}

/* ─────────────────────────────────────────
   DELIVERY
───────────────────────────────────────── */

function deliveryLabel(order: DetailOrder) {
	return order.method === "pickup" ? "Store Pickup" : "Standard Delivery";
}

/* ─────────────────────────────────────────
   BRAND CONTACT
───────────────────────────────────────── */

function buildBrandContactLines() {
	return [
		`📞 Contact: +${BRAND_PHONE.slice(0, 2)} ${BRAND_PHONE.slice(2)}`,

		BRAND_EMAIL ? `📧 Email: ${BRAND_EMAIL}` : "",

		`🌐 Website: https://api.printinghouseujjain.in`,

		BRAND_INSTAGRAM ? `📸 Instagram: ${BRAND_INSTAGRAM}` : "",

		BRAND_FACEBOOK ? `📘 Facebook: ${BRAND_FACEBOOK}` : "",
	]
		.filter(Boolean)
		.join("\n");
}

/* ─────────────────────────────────────────
   WHATSAPP MESSAGE
───────────────────────────────────────── */

function buildWhatsAppMessage(
	order: DetailOrder,
	status: string,
	options?: {
		cancellationReason?: string;
		refundAmount?: number;
		refundReason?: string;
		refundType?: "full" | "partial";
	},
) {
	const orderDate = formatDate(order.createdAt);

	const orderTime = formatTime(order.createdAt);

	const amount = `₹${order.grandTotal.toLocaleString("en-IN")}`;

	const paymentStatus = paymentLabel(order.paymentStatus);

	const deliveryMode = deliveryLabel(order);

	const trackingLink = `https://api.printinghouseujjain.in/order-tracking?order_id=${encodeURIComponent(
		order.id,
	)}`;

	const contacts = buildBrandContactLines();

	const header = `🧾 *PRINTING HOUSE UJJAIN*`;

	const divider = "━━━━━━━━━━━━━━━━━━";

	const orderDetails = `*ORDER DETAILS*\n\nOrder ID: *#${order.id}*\nDate: ${orderDate}\nTime: ${orderTime}`;

	const paymentDetails = `*PAYMENT DETAILS*\n\nAmount: *${amount}*\nStatus: ${
		paymentStatus === "PAID" ? "✅" : paymentStatus === "REFUNDED" ? "💰" : "⏳"
	} ${paymentStatus}`;

	const deliveryDetails = `*DELIVERY DETAILS*\n\nMode: ${deliveryMode}`;

	switch (status) {
		case "accepted":
			return [
				header,
				`*ORDER ACCEPTED* 🎉`,
				divider,

				`Hi *${order.customer.name}*,\n\nGreat news! Your order has been accepted and is now being processed by our team. ❤️`,

				divider,
				orderDetails,
				divider,
				paymentDetails,
				divider,

				deliveryDetails + `\nStatus: 🔄 Order Processing`,

				divider,

				`🔎 *Track Your Order:*\n${trackingLink}`,

				divider,

				`Thank you for choosing *Printing House Ujjain*! ❤️\n\n🖨️ Quality Printing • Delivered With Care\n\n${contacts}`,
			].join("\n\n");

		case "packed":
			return [
				header,
				`*ORDER PACKED* 📦`,
				divider,

				`Hi *${order.customer.name}*,\n\nYour order has been successfully packed and is *ready to be shipped*. 🎁`,

				divider,
				orderDetails,
				divider,
				paymentDetails,
				divider,

				deliveryDetails + `\nStatus: 📦 Ready to Ship`,

				divider,

				`🔎 *Track Your Order:*\n${trackingLink}`,

				divider,

				`We'll notify you once your order has been shipped. 🚚\n\nThank you for choosing *Printing House Ujjain*! ❤️\n\n${contacts}`,
			].join("\n\n");

		case "shipped":
			return [
				header,
				`*ORDER SHIPPED* 🚚`,
				divider,

				`Hi *${order.customer.name}*,\n\nYour order is on its way! 🎉\n\nYour package has been handed over for delivery and should reach you soon.`,

				divider,
				orderDetails,
				divider,
				paymentDetails,
				divider,

				deliveryDetails + `\nStatus: 🚚 Shipped`,

				divider,

				`🔎 *Track Your Order:*\n${trackingLink}`,

				divider,

				`Thank you for shopping with *Printing House Ujjain*! ❤️\n\n${contacts}\n\n🖨️ Quality Printing • Delivered With Care`,
			].join("\n\n");

		case "delivered":
			return [
				header,
				`*ORDER DELIVERED* 🎉`,
				divider,

				`Hi *${order.customer.name}*,\n\nYour order has been successfully delivered! ❤️\n\nWe hope you loved your product as much as we loved creating it for you. 😊`,

				divider,
				orderDetails,
				divider,
				paymentDetails,
				divider,

				deliveryDetails + `\nStatus: ✅ Delivered`,

				divider,

				`⭐ *HOW DID WE DO?*\n\nYour feedback means a lot to us!\n\n🛍️ *Review your product:*\n${PRODUCT_REVIEW_URL(
					order.id,
				)}\n\n📍 *Review Printing House Ujjain on Google:*\n${GOOGLE_REVIEW_URL}`,

				divider,

				`Thank you for supporting *Printing House Ujjain*. ❤️\n\nEvery order helps us grow, and every review helps others discover us.\n\n${contacts}\n\n🖨️ Quality Printing • Delivered With Care`,
			].join("\n\n");

		case "cancelled":
			return [
				header,
				`*ORDER CANCELLED* ❌`,
				divider,

				`Hi *${order.customer.name}*,\n\nWe're sorry to inform you that your order has been cancelled.`,

				divider,
				orderDetails,
				divider,
				paymentDetails,
				divider,

				deliveryDetails +
					`\nStatus: ❌ Cancelled\n\n*Reason:*\n${
						options?.cancellationReason || "Order cancelled by the store."
					}`,

				divider,

				`If you have any questions regarding this cancellation, please contact us. We're happy to help.\n\n${contacts}\n\nWe apologize for the inconvenience. ❤️`,
			].join("\n\n");

		case "refunded": {
			const refundAmount = options?.refundAmount ?? order.grandTotal;

			const refundType =
				options?.refundType === "partial"
					? "a partial refund"
					: "a full refund";

			return [
				header,
				`*PAYMENT REFUNDED* 💰`,
				divider,

				`Hi *${order.customer.name}*,\n\nWe've processed *${refundType}* for your order.`,

				divider,
				orderDetails,
				divider,

				`*PAYMENT DETAILS*\n\nOriginal Amount: *${amount}*\nRefund Amount: *₹${refundAmount.toLocaleString(
					"en-IN",
				)}*\nStatus: 💰 REFUNDED\n\n*Refund Reason:*\n${
					options?.refundReason || "Payment refunded by the store."
				}`,

				divider,

				deliveryDetails + `\nOrder Status: ${normalizeStatus(order.rawStatus)}`,

				divider,

				`The refunded amount should reflect in your original payment method within *5–7 business days*, depending on your bank/payment provider.\n\nIf you have any questions, please contact us.\n\n${contacts}\n\nThank you for your patience. ❤️\n\n🖨️ Quality Printing • Delivered With Care`,
			].join("\n\n");
		}

		default:
			return [
				header,
				`*ORDER UPDATE* 📦`,
				divider,

				`Hi *${order.customer.name}*, your order #${order.id} has been updated.`,

				divider,
				orderDetails,
				divider,
				paymentDetails,
				divider,

				`🔎 *Track Your Order:*\n${trackingLink}`,

				divider,
				contacts,
			].join("\n\n");
	}
}

/* ─────────────────────────────────────────
   CUSTOMIZATION
───────────────────────────────────────── */

function parseCustomization(item: RawItem) {
	const customization = String(item.customization ?? "").trim();

	if (!customization || customization.toLowerCase() === "no customization.") {
		return [];
	}

	const parsedCustomization = parseJson<Record<string, unknown> | null>(
		customization,
		null,
	);

	if (!parsedCustomization || typeof parsedCustomization !== "object") {
		return [
			{
				label: "Details",
				value: customization,
				photos: [],
			},
		];
	}

	return Object.entries(parsedCustomization)
		.filter(
			([key, value]) =>
				![
					"id",
					"name",
					"primary_photo_path",
					"quantity",
					"selling_price",
					"customization",
				].includes(key) &&
				value !== null &&
				value !== undefined &&
				String(value).trim() !== "",
		)
		.map(([key, value]) => {
			const text = String(value);

			const separator = text.indexOf("=");

			const label =
				separator > -1
					? text.slice(0, separator).trim()
					: key
							.replace(/([A-Z])/g, " $1")
							.replace(/^./, (character) => character.toUpperCase());

			const displayValue =
				separator > -1 ? text.slice(separator + 1).trim() : text;

			const photos =
				displayValue.match(/[\w-]+\.(?:jpg|jpeg|png|webp|gif)/gi) ?? [];

			return {
				label,
				value: displayValue,
				photos: [...new Set(photos)],
			};
		});
}

/* ─────────────────────────────────────────
   NORMALIZE ORDER
───────────────────────────────────────── */

function normalizeOrder(raw: RawOrder): DetailOrder {
	const nestedCustomer = raw.user ?? raw.customer ?? {};

	const items = parseJson<RawItem[]>(raw.cart, []).filter(
		(item) => item && typeof item === "object",
	);

	const address = parseJson<RawAddress | null>(raw.address, null);

	const name = String(
		raw.name ??
			raw.user_name ??
			raw.customer_name ??
			nestedCustomer.name ??
			nestedCustomer.full_name ??
			address?.name ??
			"Guest",
	);

	return {
		id: String(raw.order_id ?? raw.id ?? ""),

		status: normalizeStatus(raw.order_status),

		rawStatus: rawStatus(raw.order_status),

		date: formatDate(raw.created_at),

		createdAt: raw.created_at,

		method:
			String(raw.delivery_method ?? raw.type ?? "").toLowerCase() === "pickup"
				? "pickup"
				: "delivery",

		paymentStatus: String(raw.payment_status ?? "—"),

		items,

		address,

		customer: {
			name,

			email: String(raw.email ?? nestedCustomer.email ?? "—"),

			phone: String(raw.phone ?? nestedCustomer.phone ?? address?.phone ?? "—"),

			id: String(raw.user_id ?? nestedCustomer.id ?? "Guest"),
		},

		total: asNumber(raw.total_price),

		deliveryFee: asNumber(raw.delivery_fee),

		grandTotal: asNumber(raw.grand_total) || asNumber(raw.total_price),
	};
}

/* ─────────────────────────────────────────
   EXTRACT ORDER
───────────────────────────────────────── */

function extractOrder(data: unknown, id: string): RawOrder | null {
	if (!data || typeof data !== "object") {
		return null;
	}

	const value = data as AdminOrderResponse;

	if (value.order) {
		return value.order;
	}

	const possibleLists: RawOrder[][] = [
		value.orders,
		value.wishlist,
		value.result,
	].filter((list): list is RawOrder[] => Array.isArray(list));

	for (const list of possibleLists) {
		const matching = list.find(
			(order) => String(order.order_id ?? order.id ?? "") === id,
		);

		if (matching) {
			return matching;
		}
	}

	if (
		value.data &&
		typeof value.data === "object" &&
		!Array.isArray(value.data)
	) {
		return value.data as RawOrder;
	}

	return null;
}

/* ─────────────────────────────────────────
   STATUS CLASSES
───────────────────────────────────────── */

function statusClasses(status: string) {
	const classes: Record<string, string> = {
		Delivered: "bg-[#EDF8F0] text-[#31824A]",

		Shipped: "bg-[#EEF5FF] text-[#3973B9]",

		Packed: "bg-[#EEF5FF] text-[#3973B9]",

		Processing: "bg-[#EEF5FF] text-[#3973B9]",

		Cancelled: "bg-red-50 text-red-700",

		Pending: "bg-[#FFF3E8] text-[#B56B27]",
	};

	return classes[status] ?? "bg-gray-100 text-gray-700";
}

/* ─────────────────────────────────────────
   STATUS LABEL
───────────────────────────────────────── */

function statusLabel(status: string) {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

/* ─────────────────────────────────────────
   PAGE
───────────────────────────────────────── */

export default function AdminOrderDetailsPage() {
	const params = useParams<{
		id: string;
	}>();

	const orderId = params?.id ? decodeURIComponent(params.id) : "";

	const [order, setOrder] = useState<DetailOrder | null>(null);

	const [status, setStatus] = useState<string>("pending");

	const [productChecks, setProductChecks] = useState<
		Record<string, ProductCheck>
	>({});

	const [paymentSaving, setPaymentSaving] = useState(false);

	const [notificationLink, setNotificationLink] = useState("");

	const [notificationWebLink, setNotificationWebLink] = useState("");

	const [loading, setLoading] = useState(true);

	const [saving, setSaving] = useState(false);

	const [error, setError] = useState("");

	const [message, setMessage] = useState("");

	/* Cancellation */
	const [cancelModalOpen, setCancelModalOpen] = useState(false);

	const [cancelReason, setCancelReason] = useState("");

	const [cancelFormError, setCancelFormError] = useState("");

	/* Refund */
	const [refundModalOpen, setRefundModalOpen] = useState(false);

	const [refundForm, setRefundForm] = useState<RefundForm>({
		type: "full",
		amount: "",
		reason: "",
	});

	const [refundFormError, setRefundFormError] = useState("");

	/* ─────────────────────────────────────
	   LOAD ORDER
	───────────────────────────────────── */

	useEffect(() => {
		if (!orderId) {
			setLoading(false);
			setError("Invalid order ID.");
			return;
		}

		let cancelled = false;

		const loadOrder = async () => {
			setLoading(true);
			setError("");

			try {
				const response = await fetch(
					`/api/admin/orders/${encodeURIComponent(orderId)}`,
					{
						method: "GET",
						cache: "no-store",
						credentials: "include",
					},
				);

				const data = await response.json().catch(() => ({}));

				if (!response.ok) {
					throw new Error(data?.message || "Unable to load order.");
				}

				const raw = extractOrder(data, orderId);

				if (!raw) {
					throw new Error("Order not found.");
				}

				const normalized = normalizeOrder(raw);

				if (cancelled) {
					return;
				}

				setOrder(normalized);

				setStatus(normalized.rawStatus || "pending");

				const productIds = [
					...new Set(
						normalized.items
							.map((item) => String(item.id ?? ""))
							.filter(Boolean),
					),
				];

				setProductChecks(
					Object.fromEntries(
						productIds.map((id) => [
							id,
							{
								loading: true,
								stale: false,
							},
						]),
					),
				);

				await Promise.all(
					productIds.map(async (productId) => {
						try {
							const productResponse = await fetch(
								`/api/admin/product/${encodeURIComponent(productId)}`,
								{
									method: "POST",
									cache: "no-store",
									credentials: "include",
								},
							);

							const productData = await productResponse
								.json()
								.catch(() => ({}));

							const current = productFromResponse(productData);

							if (!productResponse.ok || !current) {
								throw new Error("Unable to check product.");
							}

							if (cancelled) {
								return;
							}

							setProductChecks((previous) => ({
								...previous,
								[productId]: {
									loading: false,

									stale: productWasUpdatedAfterOrder(
										current,
										normalized.createdAt,
									),

									current,
								},
							}));
						} catch {
							if (cancelled) {
								return;
							}

							setProductChecks((previous) => ({
								...previous,
								[productId]: {
									loading: false,
									stale: false,
								},
							}));
						}
					}),
				);
			} catch (loadError) {
				if (cancelled) {
					return;
				}

				setError(
					loadError instanceof Error
						? loadError.message
						: "Unable to load order.",
				);
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		};

		void loadOrder();

		return () => {
			cancelled = true;
		};
	}, [orderId]);

	/* ─────────────────────────────────────
	   ITEM COUNT
	───────────────────────────────────── */

	const itemCount = useMemo(
		() =>
			order?.items.reduce(
				(sum, item) => sum + Math.max(1, Math.floor(asNumber(item.quantity))),
				0,
			) ?? 0,
		[order],
	);

	/* ─────────────────────────────────────
	   AVAILABLE STATUS OPTIONS
	   
	   IMPORTANT:
	   Pickup orders do NOT have a Shipped
	   status.
	───────────────────────────────────── */

	const availableStatusOptions = useMemo(() => {
		if (!order) {
			return STATUS_OPTIONS;
		}

		if (order.method === "pickup") {
			return STATUS_OPTIONS.filter((option) => option !== "shipped");
		}

		return STATUS_OPTIONS;
	}, [order]);

	/* ─────────────────────────────────────
	   STATUS UPDATE
	───────────────────────────────────── */

	const performStatusUpdate = async (cancellationReason?: string) => {
		if (!order) {
			return;
		}

		const previousStatus = order.rawStatus;

		setSaving(true);
		setMessage("");
		setNotificationLink("");
		setNotificationWebLink("");

		try {
			const response = await fetch("/api/update_order", {
				method: "POST",

				headers: {
					"Content-Type": "application/json",
				},

				credentials: "include",

				body: JSON.stringify({
					order_id: order.id,

					status,

					current_status: previousStatus,
				}),
			});

			const data = await response.json().catch(() => ({}));

			/*
			 * VERY IMPORTANT:
			 *
			 * Do not update the local
			 * order before checking
			 * response.ok.
			 */
			if (!response.ok) {
				throw new Error(data?.message || "Unable to update order status.");
			}

			/*
			 * API succeeded.
			 *
			 * Now update the UI.
			 */
			const nextOrder: DetailOrder = {
				...order,

				status: normalizeStatus(status),

				rawStatus: status,
			};

			setOrder(nextOrder);

			setMessage("Order status updated. Notify the customer on WhatsApp.");

			const phone = order.address?.phone || order.customer.phone;

			const messageText = buildWhatsAppMessage(order, status, {
				cancellationReason,
			});

			const links = whatsappUrls(phone, messageText);

			setNotificationLink(links.app);

			setNotificationWebLink(links.web);
		} catch (updateError) {
			/*
			 * API failed.
			 *
			 * Restore the dropdown
			 * to the actual server
			 * status.
			 *
			 * DO NOT call setOrder().
			 */
			setStatus(previousStatus);

			setMessage(
				updateError instanceof Error
					? updateError.message
					: "Unable to update order status.",
			);
		} finally {
			setSaving(false);
		}
	};

	/* ─────────────────────────────────────
	   STATUS UPDATE BUTTON
	───────────────────────────────────── */

	const handleStatusUpdateClick = () => {
		if (!order || saving || status === order.rawStatus) {
			return;
		}

		/*
		 * Pickup orders should never
		 * be shipped.
		 */
		if (order.method === "pickup" && status === "shipped") {
			setStatus(order.rawStatus);

			setMessage("Pickup orders cannot be shipped.");

			return;
		}

		if (status === "cancelled") {
			if (order.rawStatus !== "pending") {
				setMessage(
					"Cancellation is only available before the order is accepted.",
				);

				setStatus(order.rawStatus);

				return;
			}

			setCancelReason("");

			setCancelFormError("");

			setCancelModalOpen(true);

			return;
		}

		void performStatusUpdate();
	};

	/* ─────────────────────────────────────
	   CONFIRM CANCELLATION
	───────────────────────────────────── */

	const confirmCancellation = async () => {
		if (!cancelReason.trim()) {
			setCancelFormError("Please add a reason for the cancellation.");

			return;
		}

		setCancelModalOpen(false);

		await performStatusUpdate(cancelReason.trim());
	};

	/* ─────────────────────────────────────
	   REFUND MODAL
	───────────────────────────────────── */

	const openRefundModal = () => {
		if (
			!order ||
			paymentSaving ||
			order.paymentStatus.toLowerCase() === "refunded"
		) {
			return;
		}

		setRefundForm({
			type: "full",
			amount: order.grandTotal.toFixed(2),
			reason: "",
		});

		setRefundFormError("");

		setRefundModalOpen(true);
	};

	/* ─────────────────────────────────────
	   CONFIRM REFUND
	───────────────────────────────────── */

	const confirmRefund = async () => {
		if (!order) {
			return;
		}

		const trimmedReason = refundForm.reason.trim();

		if (!trimmedReason) {
			setRefundFormError("Please add a reason for the refund.");

			return;
		}

		const amountValue =
			refundForm.type === "full" ? order.grandTotal : Number(refundForm.amount);

		if (
			refundForm.type === "partial" &&
			(!Number.isFinite(amountValue) ||
				amountValue <= 0 ||
				amountValue > order.grandTotal)
		) {
			setRefundFormError(
				`Enter a valid amount up to ₹${order.grandTotal.toLocaleString(
					"en-IN",
				)}.`,
			);

			return;
		}

		setRefundModalOpen(false);

		setPaymentSaving(true);

		setMessage("");
		setNotificationLink("");
		setNotificationWebLink("");

		try {
			const response = await fetch("/api/update_payment", {
				method: "POST",

				headers: {
					"Content-Type": "application/json",
				},

				credentials: "include",

				body: JSON.stringify({
					order_id: order.id,

					status: "refunded",
				}),
			});

			const data = await response.json().catch(() => ({}));

			if (!response.ok) {
				throw new Error(data?.message || "Unable to refund payment.");
			}

			/*
			 * Only update UI after
			 * successful API response.
			 */
			const nextOrder: DetailOrder = {
				...order,
				paymentStatus: "refunded",
			};

			setOrder(nextOrder);

			setMessage(
				"Payment marked as refunded. Notify the customer on WhatsApp.",
			);

			const phone = order.address?.phone || order.customer.phone;

			const messageText = buildWhatsAppMessage(order, "refunded", {
				refundAmount: amountValue,

				refundReason: trimmedReason,

				refundType: refundForm.type,
			});

			const links = whatsappUrls(phone, messageText);

			setNotificationLink(links.app);

			setNotificationWebLink(links.web);
		} catch (refundError) {
			setMessage(
				refundError instanceof Error
					? refundError.message
					: "Unable to refund payment.",
			);
		} finally {
			setPaymentSaving(false);
		}
	};

	/* ─────────────────────────────────────
	   LOADING
	───────────────────────────────────── */

	if (loading) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-[#FBF9F7] text-sm text-[#2E2E2E]/60">
				Loading order...
			</main>
		);
	}

	/* ─────────────────────────────────────
	   ERROR
	───────────────────────────────────── */

	if (error || !order) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-[#FBF9F7] px-5">
				<div className="rounded-2xl border border-red-200 bg-white p-8 text-center">
					<AlertCircle className="mx-auto text-red-600" />

					<p className="mt-3 text-sm text-red-700">
						{error || "Order not found."}
					</p>

					<Link
						href="/admin/orders"
						className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#85161B]"
					>
						<ArrowLeft size={16} />
						Back to orders
					</Link>
				</div>
			</main>
		);
	}

	/* ─────────────────────────────────────
	   PAGE
	───────────────────────────────────── */

	return (
		<>
			<main className="min-h-screen bg-[#FBF9F7] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
				<div className="mx-auto max-w-7xl">
					{/* BACK */}
					<Link
						href="/admin/orders"
						className="inline-flex items-center gap-2 text-sm font-medium text-[#2E2E2E]/55 hover:text-[#85161B]"
					>
						<ArrowLeft size={16} />
						All orders
					</Link>

					{/* HEADER */}
					<div className="mt-6 flex flex-col justify-between gap-5 border-b border-[#E8DED7] pb-7 lg:flex-row lg:items-end">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#85161B]">
								Order details
							</p>

							<h1 className="mt-2 text-3xl font-bold text-[#2E2E2E]">
								Order #{order.id}
							</h1>

							<div className="mt-2 flex flex-wrap gap-4 text-sm text-[#2E2E2E]/55">
								<span className="inline-flex items-center gap-1.5">
									<CalendarDays size={15} />

									{order.date}
								</span>

								<span>
									{itemCount} item
									{itemCount === 1 ? "" : "s"}
								</span>

								<span className="capitalize">
									{order.method === "pickup" ? "Store pickup" : "Delivery"}
								</span>
							</div>
						</div>

						<div className="flex flex-wrap items-center gap-3">
							{/* CURRENT STATUS */}
							<span
								className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusClasses(
									order.status,
								)}`}
							>
								{order.status}
							</span>

							{/* STATUS SELECT */}
							<select
								value={status}
								onChange={(event) => setStatus(event.target.value)}
								disabled={saving}
								className="rounded-xl border border-[#E8DED7] bg-white px-3 py-2.5 text-sm text-[#2E2E2E] outline-none disabled:cursor-not-allowed disabled:opacity-60"
							>
								{availableStatusOptions.map((option) => (
									<option key={option} value={option}>
										{statusLabel(option)}
									</option>
								))}
							</select>

							{/* UPDATE BUTTON */}
							<button
								type="button"
								onClick={handleStatusUpdateClick}
								disabled={saving || status === order.rawStatus}
								className="inline-flex items-center gap-2 rounded-xl bg-[#85161B] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
							>
								<Save size={15} />

								{saving ? "Saving..." : "Update status"}
							</button>
						</div>
					</div>

					{/* MESSAGE */}
					{message && <p className="mt-4 text-sm text-[#85161B]">{message}</p>}

					{/* WHATSAPP BUTTONS */}
					{(notificationLink || notificationWebLink) && (
						<div className="mt-3 flex flex-wrap gap-2">
							{notificationLink && (
								<a
									href={notificationLink}
									target="_blank"
									rel="noreferrer"
									className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white"
								>
									<MessageCircle size={16} />
									WhatsApp App
								</a>
							)}

							{notificationWebLink && (
								<a
									href={notificationWebLink}
									target="_blank"
									rel="noreferrer"
									className="inline-flex items-center gap-2 rounded-xl border border-[#25D366] bg-white px-4 py-2.5 text-sm font-semibold text-[#168C46]"
								>
									<Monitor size={16} />
									WhatsApp Web
								</a>
							)}
						</div>
					)}

					{/* CONTENT */}
					<div className="mt-7 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
						<section className="space-y-5">
							{/* ITEMS */}
							<div className="rounded-2xl border border-[#E8DED7] bg-white p-5 sm:p-6">
								<div className="flex items-center justify-between">
									<h2 className="text-base font-semibold text-[#2E2E2E]">
										Items and customizations
									</h2>

									<span className="text-xs text-[#2E2E2E]/45">
										{order.items.length} product
										{order.items.length === 1 ? "" : "s"}
									</span>
								</div>

								<div className="mt-5 divide-y divide-[#F0E8E2]">
									{order.items.map((item, index) => {
										const check = productChecks[String(item.id ?? "")];

										const quantity = Math.max(1, asNumber(item.quantity));

										const customization = parseCustomization(item);

										return (
											<div
												key={`${item.id ?? index}-${index}`}
												className="py-5 first:pt-0 last:pb-0"
											>
												<div className="flex gap-4">
													{/* IMAGE */}
													<div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#F7F2EE]">
														{item.primary_photo_path ? (
															<img
																src={`${PRODUCT_IMAGE_URL}${item.primary_photo_path}`}
																alt=""
																className="h-full w-full object-cover"
															/>
														) : (
															<div className="flex h-full w-full items-center justify-center text-xs text-[#2E2E2E]/30">
																No image
															</div>
														)}
													</div>

													<div className="min-w-0 flex-1">
														<div className="flex flex-wrap justify-between gap-2">
															<div>
																<div className="flex flex-wrap items-center gap-2">
																	<h3 className="font-semibold text-[#2E2E2E]">
																		{item.name ?? "Untitled product"}
																	</h3>

																	{check?.stale && (
																		<span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
																			<AlertTriangle size={12} />
																			Outdated product
																		</span>
																	)}
																</div>

																<p className="mt-1 text-xs text-[#2E2E2E]/50">
																	Qty {item.quantity ?? 1} · ₹
																	{asNumber(item.selling_price).toLocaleString(
																		"en-IN",
																	)}
																</p>
															</div>

															<span className="text-sm font-semibold text-[#85161B]">
																₹
																{(
																	asNumber(item.selling_price) * quantity
																).toLocaleString("en-IN")}
															</span>
														</div>

														{/* CUSTOMIZATION */}
														{customization.length > 0 && (
															<div className="mt-4 rounded-xl bg-[#FBF9F7] p-3">
																<p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#85161B]">
																	Customization
																</p>

																<div className="mt-2 space-y-2">
																	{customization.map((custom) => (
																		<div key={custom.label} className="text-sm">
																			<span className="font-medium text-[#2E2E2E]">
																				{custom.label}:
																			</span>{" "}
																			<span className="text-[#2E2E2E]/65">
																				{custom.value}
																			</span>
																			{custom.photos.length > 0 && (
																				<div className="mt-2 flex flex-wrap gap-2">
																					{custom.photos.map((photo) => (
																						<a
																							key={photo}
																							href={`${UPLOAD_IMAGE_URL}${photo}`}
																							target="_blank"
																							rel="noreferrer"
																						>
																							<img
																								src={`${UPLOAD_IMAGE_URL}${photo}`}
																								alt={photo}
																								className="h-12 w-12 rounded-lg object-cover"
																							/>
																						</a>
																					))}
																				</div>
																			)}
																		</div>
																	))}
																</div>
															</div>
														)}
													</div>
												</div>
											</div>
										);
									})}
								</div>
							</div>

							{/* PAYMENT */}
							<div className="rounded-2xl border border-[#E8DED7] bg-white p-5 sm:p-6">
								<div className="flex items-center justify-between gap-3">
									<h2 className="text-base font-semibold text-[#2E2E2E]">
										Payment summary
									</h2>

									<button
										type="button"
										onClick={openRefundModal}
										disabled={
											paymentSaving ||
											order.paymentStatus.toLowerCase() === "refunded"
										}
										className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
									>
										{paymentSaving
											? "Updating..."
											: order.paymentStatus.toLowerCase() === "refunded"
												? "Refunded"
												: "Mark refunded"}
									</button>
								</div>

								<div className="mt-4 space-y-3 text-sm">
									<div className="flex justify-between text-[#2E2E2E]/60">
										<span>Products</span>

										<span>₹{order.total.toLocaleString("en-IN")}</span>
									</div>

									<div className="flex justify-between text-[#2E2E2E]/60">
										<span>Delivery fee</span>

										<span>₹{order.deliveryFee.toLocaleString("en-IN")}</span>
									</div>

									<div className="flex justify-between border-t border-[#F0E8E2] pt-3 text-base font-bold text-[#2E2E2E]">
										<span>Total</span>

										<span>₹{order.grandTotal.toLocaleString("en-IN")}</span>
									</div>

									<p className="inline-flex items-center gap-2 text-xs text-[#2E2E2E]/50">
										<CreditCard size={14} />
										Payment: {order.paymentStatus}
									</p>
								</div>
							</div>
						</section>

						{/* SIDEBAR */}
						<aside className="space-y-5">
							{/* CUSTOMER */}
							<div className="rounded-2xl border border-[#E8DED7] bg-white p-5 sm:p-6">
								<h2 className="flex items-center gap-2 text-base font-semibold text-[#2E2E2E]">
									<User size={18} className="text-[#85161B]" />
									Customer
								</h2>

								<div className="mt-4 space-y-2 text-sm">
									<p className="font-semibold text-[#2E2E2E]">
										{order.customer.name}
									</p>

									<p className="break-all text-[#2E2E2E]/60">
										{order.customer.email}
									</p>

									<p className="text-[#2E2E2E]/60">{order.customer.phone}</p>

									<p className="text-xs text-[#2E2E2E]/40">
										Account: {order.customer.id}
									</p>
								</div>
							</div>

							{/* DELIVERY / PICKUP */}
							<div
								className={`rounded-2xl border p-5 sm:p-6 ${
									order.method === "pickup"
										? "border-[#E7C9A2] bg-[#FFF8EF]"
										: "border-[#E8DED7] bg-white"
								}`}
							>
								<h2 className="flex items-center gap-2 text-base font-semibold text-[#2E2E2E]">
									{order.method === "pickup" ? (
										<Store size={18} className="text-[#85161B]" />
									) : (
										<Truck size={18} className="text-[#85161B]" />
									)}

									{order.method === "pickup"
										? "Store pickup"
										: "Delivery address"}
								</h2>

								{order.method === "pickup" ? (
									<p className="mt-3 text-sm leading-6 text-[#2E2E2E]/65">
										Prepare this order for collection at the store. The customer
										will pick it up instead of receiving a shipment.
									</p>
								) : order.address ? (
									<div className="mt-4 flex gap-3 text-sm leading-6 text-[#2E2E2E]/65">
										<MapPin
											size={17}
											className="mt-1 shrink-0 text-[#85161B]"
										/>

										<div>
											{order.address.name && (
												<p className="font-medium text-[#2E2E2E]">
													{order.address.name}
												</p>
											)}

											<p>
												{[
													order.address.flat_house_building,

													order.address.road_area_colony,

													order.address.landmark,

													order.address.city,

													order.address.state,

													order.address.pincode,
												]
													.filter(Boolean)
													.join(", ")}
											</p>

											{order.address.phone && (
												<p className="mt-2 inline-flex items-center gap-1.5">
													<Phone size={14} />

													{order.address.phone}
												</p>
											)}
										</div>
									</div>
								) : (
									<p className="mt-3 text-sm text-[#2E2E2E]/55">
										No address was provided.
									</p>
								)}
							</div>
						</aside>
					</div>
				</div>
			</main>

			{/* ═══════════════════════════════════════
			    CANCELLATION MODAL
			═══════════════════════════════════════ */}

			{cancelModalOpen && order && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-7">
						<h3 className="text-lg font-semibold text-[#2E2E2E]">
							Cancel order #{order.id}
						</h3>

						<p className="mt-1.5 text-sm leading-6 text-[#2E2E2E]/55">
							Let us know why this order is being cancelled. This is only used
							to write the WhatsApp message sent to the customer.
						</p>

						<label className="mt-5 block text-sm font-medium text-[#2E2E2E]">
							Reason
							<textarea
								value={cancelReason}
								onChange={(event) => {
									setCancelReason(event.target.value);

									setCancelFormError("");
								}}
								rows={3}
								placeholder="e.g. Out of stock, customer requested, unable to fulfill design"
								className="mt-1.5 w-full rounded-xl border border-[#E8DED7] px-3.5 py-2.5 text-sm outline-none focus:border-[#85161B]"
							/>
						</label>

						{cancelFormError && (
							<p className="mt-2 text-xs font-medium text-red-600">
								{cancelFormError}
							</p>
						)}

						<div className="mt-6 flex justify-end gap-3">
							<button
								type="button"
								onClick={() => setCancelModalOpen(false)}
								className="rounded-xl border border-[#E8DED7] px-4 py-2.5 text-sm font-semibold text-[#2E2E2E]/70"
							>
								Back
							</button>

							<button
								type="button"
								onClick={confirmCancellation}
								disabled={saving}
								className="rounded-xl bg-[#85161B] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
							>
								{saving ? "Cancelling..." : "Confirm cancellation"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ═══════════════════════════════════════
			    REFUND MODAL
			═══════════════════════════════════════ */}

			{refundModalOpen && order && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-7">
						<h3 className="text-lg font-semibold text-[#2E2E2E]">
							Refund order #{order.id}
						</h3>

						<p className="mt-1.5 text-sm leading-6 text-[#2E2E2E]/55">
							Order total is ₹{order.grandTotal.toLocaleString("en-IN")}. These
							details are only used to write the WhatsApp message.
						</p>

						<div className="mt-5 flex gap-3">
							<label
								className={`flex flex-1 cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition ${
									refundForm.type === "full"
										? "border-[#85161B] bg-[#FFF3F0] text-[#85161B]"
										: "border-[#E8DED7] text-[#2E2E2E]/65"
								}`}
							>
								<input
									type="radio"
									name="refund-type"
									checked={refundForm.type === "full"}
									onChange={() =>
										setRefundForm((previous) => ({
											...previous,

											type: "full",

											amount: order.grandTotal.toFixed(2),
										}))
									}
									className="accent-[#85161B]"
								/>
								Full refund
							</label>

							<label
								className={`flex flex-1 cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition ${
									refundForm.type === "partial"
										? "border-[#85161B] bg-[#FFF3F0] text-[#85161B]"
										: "border-[#E8DED7] text-[#2E2E2E]/65"
								}`}
							>
								<input
									type="radio"
									name="refund-type"
									checked={refundForm.type === "partial"}
									onChange={() =>
										setRefundForm((previous) => ({
											...previous,

											type: "partial",

											amount: "",
										}))
									}
									className="accent-[#85161B]"
								/>
								Partial refund
							</label>
						</div>

						{refundForm.type === "partial" && (
							<label className="mt-4 block text-sm font-medium text-[#2E2E2E]">
								Refund amount (₹)
								<input
									type="number"
									min={0}
									max={order.grandTotal}
									value={refundForm.amount}
									onChange={(event) => {
										setRefundForm((previous) => ({
											...previous,

											amount: event.target.value,
										}));

										setRefundFormError("");
									}}
									placeholder={`Up to ${order.grandTotal.toLocaleString(
										"en-IN",
									)}`}
									className="mt-1.5 w-full rounded-xl border border-[#E8DED7] px-3.5 py-2.5 text-sm outline-none focus:border-[#85161B]"
								/>
							</label>
						)}

						<label className="mt-4 block text-sm font-medium text-[#2E2E2E]">
							Reason
							<textarea
								value={refundForm.reason}
								onChange={(event) => {
									setRefundForm((previous) => ({
										...previous,

										reason: event.target.value,
									}));

									setRefundFormError("");
								}}
								rows={3}
								placeholder="e.g. Damaged product, printing error, order cancelled"
								className="mt-1.5 w-full rounded-xl border border-[#E8DED7] px-3.5 py-2.5 text-sm outline-none focus:border-[#85161B]"
							/>
						</label>

						{refundFormError && (
							<p className="mt-2 text-xs font-medium text-red-600">
								{refundFormError}
							</p>
						)}

						<div className="mt-6 flex justify-end gap-3">
							<button
								type="button"
								onClick={() => setRefundModalOpen(false)}
								className="rounded-xl border border-[#E8DED7] px-4 py-2.5 text-sm font-semibold text-[#2E2E2E]/70"
							>
								Back
							</button>

							<button
								type="button"
								onClick={confirmRefund}
								disabled={paymentSaving}
								className="rounded-xl bg-[#85161B] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
							>
								{paymentSaving ? "Processing..." : "Confirm refund"}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
