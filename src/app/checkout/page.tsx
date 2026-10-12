"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { QRCodeSVG } from "qrcode.react";
import {
	AlertTriangle,
	ArrowLeft,
	ArrowRight,
	CheckCircle2,
	LockKeyhole,
	MapPin,
	ShoppingBag,
	Truck,
	CreditCard,
	AlertCircle,
	Plus,
	Store,
	Gift,
	Smartphone,
	Wallet,
	X,
} from "lucide-react";

/* =========================================================
   IMAGE BASE URL
========================================================= */

const PRODUCT_IMAGE_URL = "https://api.printinghouseujjain.in/assets/products/";

/* =========================================================
   RAZORPAY TYPES
========================================================= */

declare global {
	interface Window {
		Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
	}
}

type RazorpayResponse = {
	razorpay_order_id: string;
	razorpay_payment_id: string;
	razorpay_signature: string;
};

type RazorpayOptions = {
	key: string;
	order_id: string;
	name?: string;
	description?: string;

	prefill?: {
		name?: string;
		contact?: string;
	};

	handler: (response: RazorpayResponse) => void;

	modal?: {
		ondismiss?: () => void;
	};

	theme?: {
		color?: string;
	};
};

type RazorpayInstance = {
	open: () => void;
	on: (event: string, callback: (response: unknown) => void) => void;
};

/* =========================================================
   PAYMENT METHOD
========================================================= */

/*
 * Sent to /api/checkout as `payment_method`.
 */
type PaymentMethod = "razorpay" | "upi" | "credit";

/*
 * Details needed to show the UPI payment screen.
 */
type UpiSession = {
	/* upi://pay?... deep link — used for the QR and the "Open UPI app" button */
	uri: string;

	/* Payee UPI ID, shown as text when available */
	upiId: string;

	/* Order to verify once the customer says they've paid */
	orderId: string;
};

/* =========================================================
   CREDIT TYPES
========================================================= */

/*
 * The customer's credit account.
 *
 * limit     -> total credit limit
 * available -> credit that can still be used
 * used      -> credit already used (limit - available)
 */
type CreditInfo = {
	limit: number;
	available: number;
	used: number;
};

/* =========================================================
   CART TYPES
========================================================= */

type CartItem = {
	id: string;
	name: string;
	selling_price: number;
	quantity: number;
	image?: string;
	delivery: number;
};

type RawCartItem = {
	id?: string | number;
	name?: string;

	selling_price?: number | string;
	market_price?: number | string;
	reseller_price?: number | string;

	quantity?: number | string;

	primary_photo_path?: string;
	other_photos_paths?: string;

	delivery?: number | string;

	description?: string;
};

type CartResponse = {
	status?: number;
	message?: string;

	products_count?: number;

	cart?: RawCartItem[];

	total_price?: number | string;
	delivery_fee?: number | string;
	wrap_fees?: number | string;
	grand_total?: number | string;

	/*
	 * Example:
	 *
	 * {
	 *   razorpay: true,
	 *   upi: true,
	 *   credit: {
	 *     enabled: true,
	 *     total_limit: 2000,
	 *     available_limit: 2000
	 *   }
	 * }
	 */
	payment_methods?: {
		razorpay?: boolean;
		upi?: boolean;
		credit?:
			| boolean
			| {
					enabled?: boolean;
					total_limit?: number | string;
					available_limit?: number | string;
			  };
	};
};

/* =========================================================
   CHECKOUT RESPONSE
========================================================= */

/*
 * `result` differs by payment method:
 *
 * razorpay -> { key, order_id }
 * upi      -> contains the UPI payment details (a upi:// link or a UPI ID)
 * credit   -> contains the order id
 */
type CheckoutResponse = {
	status?: number;
	message?: string;
	result?: Record<string, unknown>;
};

/* =========================================================
   ADDRESS TYPES
========================================================= */

/*
 * IMPORTANT:
 *
 * `name` is the receiver's full name and the single name field used at checkout.
 */

type RawAddress = {
	id?: string | number;
	user_id?: string | number;

	name?: string;
	phone?: string;

	flat_house_building?: string;
	road_area_colony?: string;
	landmark?: string;

	city?: string;
	state?: string;
	pincode?: number | string;

	primary?: boolean;
};

type Address = {
	id: string;

	name: string;
	phone: string;

	flatHouseBuilding: string;
	roadAreaColony: string;
	landmark: string;

	city: string;
	state: string;
	pincode: string;

	isDefault: boolean;
};

/* =========================================================
   AUTH USER RESPONSE
========================================================= */

type AuthUserResponse = {
	status?: number;
	message?: string;
	login_status?: boolean;

	name?: string;
	phone?: string;

	addresses?: RawAddress[] | RawAddress | null;
};

/* =========================================================
   NORMALIZE CART ITEM
========================================================= */

function normalizeCartItem(raw: RawCartItem): CartItem {
	const id = String(raw.id ?? "");

	const name = raw.name ?? "Untitled product";

	const sellingPrice = Number(raw.selling_price ?? 0);

	const quantity = Number(raw.quantity ?? 1);

	const delivery = Number(raw.delivery ?? 0);

	return {
		id,
		name,

		selling_price: Number.isFinite(sellingPrice) ? sellingPrice : 0,

		quantity:
			Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1,

		image: raw.primary_photo_path
			? `${PRODUCT_IMAGE_URL}${raw.primary_photo_path}`
			: undefined,

		delivery: Number.isFinite(delivery) ? delivery : 0,
	};
}

/* =========================================================
   NORMALIZE ADDRESS
========================================================= */

function normalizeAddress(raw: RawAddress, index: number): Address {
	return {
		id: String(raw.id ?? `addr-${index}`),

		name: raw.name ?? "",

		phone: raw.phone ?? "",

		flatHouseBuilding: raw.flat_house_building ?? "",

		roadAreaColony: raw.road_area_colony ?? "",

		landmark: raw.landmark ?? "",

		city: raw.city ?? "",

		state: raw.state ?? "",

		pincode: raw.pincode !== undefined ? String(raw.pincode) : "",

		isDefault: Boolean(raw.primary),
	};
}

/* =========================================================
   NORMALIZE ADDRESSES SAFELY
========================================================= */

function normalizeAddresses(
	addresses: AuthUserResponse["addresses"],
): RawAddress[] {
	if (Array.isArray(addresses)) {
		return addresses;
	}

	if (addresses && typeof addresses === "object") {
		return [addresses];
	}

	return [];
}

/* =========================================================
   CREDIT HELPERS

   The cart response carries the credit account:

   payment_methods.credit = {
     enabled: true,
     total_limit: 2000,
     available_limit: 2000
   }

   used = total_limit - available_limit
========================================================= */

function parseCreditMethod(value: unknown): {
	enabled: boolean;
	info: CreditInfo | null;
} {
	if (value === true) {
		return { enabled: true, info: null };
	}

	if (!value || typeof value !== "object") {
		return { enabled: false, info: null };
	}

	const credit = value as Record<string, unknown>;

	if (credit.enabled === false) {
		return { enabled: false, info: null };
	}

	const limit = Number(credit.total_limit);

	const available = Number(credit.available_limit);

	if (!Number.isFinite(limit) || !Number.isFinite(available)) {
		return { enabled: true, info: null };
	}

	const safeLimit = Math.max(0, limit);

	const safeAvailable = Math.max(0, available);

	return {
		enabled: true,
		info: {
			limit: safeLimit,
			available: safeAvailable,
			used: Math.max(0, safeLimit - safeAvailable),
		},
	};
}

/* =========================================================
   UPI HELPERS

   The checkout response for UPI isn't strictly typed, so the
   UPI details are located defensively:

   1. any string starting with "upi://" anywhere in `result`
      (searched up to 2 levels deep) is used as the payment link;
   2. otherwise a UPI ID under upi_id / upiId / vpa / upi is
      turned into a payment link for the current amount.
========================================================= */

function findUpiUri(value: unknown, depth = 0): string | null {
	if (typeof value === "string") {
		const trimmed = value.trim();

		return /^upi:\/\//i.test(trimmed) ? trimmed : null;
	}

	if (depth > 2 || !value || typeof value !== "object") {
		return null;
	}

	for (const child of Object.values(value as Record<string, unknown>)) {
		const found = findUpiUri(child, depth + 1);

		if (found) {
			return found;
		}
	}

	return null;
}

function getUpiIdFromUri(uri: string): string {
	const match = uri.match(/[?&]pa=([^&]+)/i);

	if (!match) {
		return "";
	}

	try {
		return decodeURIComponent(match[1]);
	} catch {
		return match[1];
	}
}

function extractUpiDetails(
	result: Record<string, unknown>,
	amount: number,
	orderId: string,
): { uri: string; upiId: string } | null {
	const uri = findUpiUri(result);

	if (uri) {
		return { uri, upiId: getUpiIdFromUri(uri) };
	}

	for (const key of ["upi_id", "upiId", "vpa", "UPI"]) {
		const candidate = result[key];

		if (typeof candidate === "string" && candidate.includes("@")) {
			const upiId = candidate.trim();

			const link =
				`upi://pay?pa=${encodeURIComponent(upiId).replace(/%40/g, "@")}` +
				`&pn=${encodeURIComponent("Printing House")}` +
				`&am=${amount.toFixed(2)}` +
				`&cu=INR` +
				`&tn=${encodeURIComponent(`Order ${orderId}`)}`;

			return { uri: link, upiId };
		}
	}

	return null;
}

/* =========================================================
   CHECKOUT PAGE
========================================================= */

export default function CheckoutPage() {
	return (
		<>
			<Script
				src="https://checkout.razorpay.com/v1/checkout.js"
				strategy="afterInteractive"
			/>

			<CheckoutView />
		</>
	);
}

/* =========================================================
   CHECKOUT VIEW
========================================================= */

function CheckoutView() {
	/* =======================================================
	   CART STATE
	======================================================= */

	const [items, setItems] = useState<CartItem[]>([]);

	const [itemCount, setItemCount] = useState(0);

	const [subtotal, setSubtotal] = useState(0);

	const [deliveryFee, setDeliveryFee] = useState(0);

	const [cartDeliveryFee, setCartDeliveryFee] = useState(0);

	const [grandTotal, setGrandTotal] = useState(0);

	const [loadingCart, setLoadingCart] = useState(true);

	const [cartError, setCartError] = useState("");

	/* =======================================================
	   AUTH + ADDRESS STATE
	======================================================= */

	const [checkingAuth, setCheckingAuth] = useState(true);

	const [isLoggedIn, setIsLoggedIn] = useState(false);

	const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);

	const [selectedAddressId, setSelectedAddressId] = useState<string>("new");

	/* =======================================================
	   CREDIT ACCOUNT
	======================================================= */

	const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);

	/*
	 * Which payment methods the server allows for this cart.
	 * Everything stays enabled until the cart response says otherwise.
	 */
	const [enabledMethods, setEnabledMethods] = useState({
		razorpay: true,
		upi: true,
		credit: true,
	});

	/* =======================================================
	   DELIVERY METHOD
	======================================================= */

	const [deliveryMethod, setDeliveryMethod] = useState<"standard" | "pickup">(
		"standard",
	);

	/* =======================================================
	   GIFT WRAP
	======================================================= */

	const [wrap, setWrap] = useState(false);

	/* =======================================================
	   FORM STATE
	======================================================= */

	const [formData, setFormData] = useState({
		/*
		 * CUSTOMER / ACCOUNT DETAILS
		 *
		 * IMPORTANT:
		 * `name` is the complete customer name.
		 */
		name: "",

		phone: "",

		flatHouseBuilding: "",

		roadAreaColony: "",

		landmark: "",

		city: "",

		state: "",

		pincode: "",
	});

	/* =======================================================
	   PAYMENT STATE
	======================================================= */

	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("razorpay");

	const [isProcessingPayment, setIsProcessingPayment] = useState(false);

	const [paymentError, setPaymentError] = useState("");

	const [paymentSuccess, setPaymentSuccess] = useState(false);

	/* UPI */

	const [upiSession, setUpiSession] = useState<UpiSession | null>(null);

	const [verifyingUpi, setVerifyingUpi] = useState(false);

	/* Warning shown before closing the UPI payment */

	const [confirmCloseUpiOpen, setConfirmCloseUpiOpen] = useState(false);

	/* CREDIT */

	const [confirmCreditOpen, setConfirmCreditOpen] = useState(false);

	/* =======================================================
	   FETCH CART
	======================================================= */

	const fetchCart = async () => {
		setLoadingCart(true);

		setCartError("");

		try {
			const response = await fetch("/api/cart", {
				method: "GET",
				credentials: "include",
				cache: "no-store",
			});

			const data: CartResponse = await response.json().catch(() => ({}));

			console.log("CART RESPONSE:", data);

			if (!response.ok) {
				throw new Error(data?.message || "Unable to load your cart.");
			}

			const rawItems = data.cart ?? [];

			const normalizedItems = rawItems.map(normalizeCartItem);

			setItems(normalizedItems);

			/* ITEM COUNT */

			const calculatedItemCount = normalizedItems.reduce(
				(sum, item) => sum + item.quantity,
				0,
			);

			const backendItemCount = Number(
				data.products_count ?? calculatedItemCount,
			);

			setItemCount(
				Number.isFinite(backendItemCount)
					? backendItemCount
					: calculatedItemCount,
			);

			/* SUBTOTAL */

			const calculatedSubtotal = normalizedItems.reduce(
				(sum, item) => sum + item.selling_price * item.quantity,
				0,
			);

			const backendSubtotal = Number(data.total_price ?? calculatedSubtotal);

			const safeSubtotal = Number.isFinite(backendSubtotal)
				? backendSubtotal
				: calculatedSubtotal;

			setSubtotal(safeSubtotal);

			/* DELIVERY */

			const backendDeliveryFee = Number(data.delivery_fee ?? 0);

			const safeDeliveryFee = Number.isFinite(backendDeliveryFee)
				? backendDeliveryFee
				: 0;

			setCartDeliveryFee(safeDeliveryFee);

			setDeliveryFee(safeDeliveryFee);

			/* GRAND TOTAL */

			const calculatedGrandTotal = safeSubtotal + safeDeliveryFee;

			const backendGrandTotal = Number(
				data.grand_total ?? calculatedGrandTotal,
			);

			const safeGrandTotal = Number.isFinite(backendGrandTotal)
				? backendGrandTotal
				: calculatedGrandTotal;

			setGrandTotal(safeGrandTotal);

			/* PAYMENT METHODS + CREDIT LIMIT */

			if (data.payment_methods) {
				const credit = parseCreditMethod(data.payment_methods.credit);

				setEnabledMethods({
					razorpay: data.payment_methods.razorpay !== false,
					upi: data.payment_methods.upi !== false,
					credit: credit.enabled,
				});

				setCreditInfo(credit.info);
			}
		} catch (error) {
			console.error("Fetch checkout cart failed:", error);

			setCartError(
				error instanceof Error ? error.message : "Unable to load your cart.",
			);
		} finally {
			setLoadingCart(false);
		}
	};

	/* =======================================================
	   APPLY SAVED ADDRESS
	======================================================= */

	const applyAddressToForm = (addr: Address) => {
		setFormData((previous) => ({
			...previous,

			name: addr.name || previous.name,

			phone: addr.phone || previous.phone,

			flatHouseBuilding: addr.flatHouseBuilding,

			roadAreaColony: addr.roadAreaColony,

			landmark: addr.landmark,

			city: addr.city,

			state: addr.state,

			pincode: addr.pincode,
		}));
	};

	/* =======================================================
	   LOAD ACCOUNT
	======================================================= */

	const loadAccount = async () => {
		setCheckingAuth(true);

		try {
			const response = await fetch("/api/auth/user", {
				method: "GET",
				credentials: "include",
				cache: "no-store",
			});

			const data: AuthUserResponse = await response.json().catch(() => ({}));

			console.log("AUTH USER RESPONSE:", data);

			const loggedIn = Boolean(data.login_status);

			setIsLoggedIn(loggedIn);

			if (!loggedIn) {
				return;
			}

			/* =================================================
			   ACCOUNT DETAILS
			================================================= */

			/*
			 * IMPORTANT:
			 *
			 * Do NOT split the name.
			 *
			 * Keep the complete customer name
			 * as one value.
			 */

			setFormData((previous) => ({
				...previous,

				name: data.name || previous.name,

				phone: data.phone || previous.phone,
			}));

			/* =================================================
			   SAVED ADDRESSES
			================================================= */

			const rawAddresses = normalizeAddresses(data.addresses);

			console.log("NORMALIZED RAW ADDRESSES:", rawAddresses);

			const normalized = rawAddresses.map((raw, index) =>
				normalizeAddress(raw, index),
			);

			console.log("NORMALIZED ADDRESSES:", normalized);

			setSavedAddresses(normalized);

			if (normalized.length > 0) {
				const defaultAddress =
					normalized.find((addr) => addr.isDefault) ?? normalized[0];

				setSelectedAddressId(defaultAddress.id);

				applyAddressToForm(defaultAddress);
			} else {
				setSelectedAddressId("new");
			}
		} catch (error) {
			console.error("Load account failed:", error);

			setIsLoggedIn(false);

			setSavedAddresses([]);
		} finally {
			setCheckingAuth(false);
		}
	};

	useEffect(() => {
		fetchCart();
		loadAccount();

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	/* =======================================================
	   UPDATE TOTAL
	======================================================= */

	useEffect(() => {
		if (deliveryMethod === "pickup") {
			setDeliveryFee(0);

			setGrandTotal(subtotal);
		} else {
			setDeliveryFee(cartDeliveryFee);

			setGrandTotal(subtotal + cartDeliveryFee);
		}
	}, [deliveryMethod, subtotal, cartDeliveryFee]);

	/* =======================================================
	   CREDIT IS FOR LOGGED-IN CUSTOMERS ONLY
	======================================================= */

	useEffect(() => {
		if ((!isLoggedIn || !enabledMethods.credit) && paymentMethod === "credit") {
			setPaymentMethod("razorpay");
		}
	}, [isLoggedIn, enabledMethods.credit, paymentMethod]);

	/* =======================================================
	   HANDLE INPUT
	======================================================= */

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;

		setFormData((previous) => ({
			...previous,
			[name]: value,
		}));
	};

	/* =======================================================
	   HANDLE DELIVERY METHOD
	======================================================= */

	const handleDeliveryMethodChange = (method: "standard" | "pickup") => {
		setDeliveryMethod(method);

		setPaymentError("");

		if (method === "pickup") {
			setDeliveryFee(0);

			setGrandTotal(subtotal);
		} else {
			setDeliveryFee(cartDeliveryFee);

			setGrandTotal(subtotal + cartDeliveryFee);
		}
	};

	/* =======================================================
	   HANDLE ADDRESS SELECTION
	======================================================= */

	const handleSelectAddress = (id: string) => {
		setSelectedAddressId(id);

		/*
		 * ADD NEW ADDRESS
		 */

		if (id === "new") {
			setFormData((previous) => ({
				...previous,

				flatHouseBuilding: "",

				roadAreaColony: "",

				landmark: "",

				city: "",

				state: "",

				pincode: "",
			}));

			return;
		}

		/*
		 * SAVED ADDRESS
		 */

		const address = savedAddresses.find((addr) => addr.id === id);

		if (address) {
			applyAddressToForm(address);
		}
	};

	/* =======================================================
	   VALIDATE FORM
	======================================================= */

	const validateForm = () => {
		/*
		 * RECEIVER FULL NAME
		 */

		if (!formData.name.trim()) {
			return "Please enter the receiver's full name.";
		}

		/*
		 * PHONE
		 */

		if (!formData.phone.trim()) {
			return "Please enter your phone number.";
		}

		/*
		 * PICKUP
		 */

		if (deliveryMethod === "pickup") {
			return null;
		}

		/*
		 * STANDARD DELIVERY
		 */

		if (!formData.flatHouseBuilding.trim()) {
			return "Please enter your flat / house / building.";
		}

		if (!formData.roadAreaColony.trim()) {
			return "Please enter your road / area / colony.";
		}

		if (!formData.city.trim()) {
			return "Please enter your city.";
		}

		if (!formData.state.trim()) {
			return "Please enter your state.";
		}

		if (!formData.pincode.trim()) {
			return "Please enter your PIN code.";
		}

		return null;
	};

	/* =======================================================
	   VERIFY PAYMENT (shared by every payment method)
	======================================================= */

	const verifyPayment = async (payload: Record<string, unknown>) => {
		const verifyResponse = await fetch("/api/verify_payment", {
			method: "POST",

			headers: {
				"Content-Type": "application/json",
			},

			credentials: "include",

			body: JSON.stringify({
				...payload,
				repay: "no",
			}),
		});

		const verifyData: {
			status?: number;
			message?: string;
		} = await verifyResponse.json().catch(() => ({}));

		console.log("VERIFY PAYMENT RESPONSE:", verifyData);

		if (!verifyResponse.ok) {
			throw new Error(verifyData.message || "Payment verification failed.");
		}

		if (verifyData.status !== 200 || verifyData.message !== "Success.") {
			throw new Error(verifyData.message || "Payment could not be verified.");
		}
	};

	/* =======================================================
	   ORDER COMPLETED
	======================================================= */

	const completeOrder = () => {
		setPaymentSuccess(true);

		setPaymentError("");

		setUpiSession(null);

		setConfirmCloseUpiOpen(false);

		/* The cart is now empty — refresh the header cart count. */
		try {
			window.dispatchEvent(new Event("cart:updated"));
		} catch (error) {
			console.error("Failed to dispatch cart:updated:", error);
		}
	};

	/* =======================================================
	   OPEN RAZORPAY
	======================================================= */

	const openRazorpay = (apiKey: string, orderId: string) => {
		if (!window.Razorpay) {
			throw new Error(
				"Razorpay Checkout has not loaded yet. Please refresh the page and try again.",
			);
		}

		const fullName = formData.name.trim();

		const options: RazorpayOptions = {
			key: apiKey,

			order_id: orderId,

			name: "Printing House",

			description: "Personalized Gifts & Custom Printing",

			prefill: {
				/* Single receiver full name. */
				name: fullName,

				contact: formData.phone.trim(),
			},

			theme: {
				color: "#85161B",
			},

			/* ===========================================
				   SUCCESS
				=========================================== */

			handler: async (response: RazorpayResponse) => {
				console.log("RAZORPAY SUCCESS:", response);

				try {
					await verifyPayment({
						payment_method: "razorpay",

						razorpay_order_id: response.razorpay_order_id,

						razorpay_signature: response.razorpay_signature,

						razorpay_payment_id: response.razorpay_payment_id,
					});

					completeOrder();
				} catch (error) {
					console.error("Payment verification failed:", error);

					setPaymentError(
						error instanceof Error
							? error.message
							: "Payment verification failed.",
					);
				} finally {
					setIsProcessingPayment(false);
				}
			},

			/* ===========================================
				   DISMISS
				=========================================== */

			modal: {
				ondismiss: () => {
					console.log("Razorpay checkout closed.");

					setIsProcessingPayment(false);
				},
			},
		};

		const razorpay = new window.Razorpay(options);

		/* ===========================================
		   PAYMENT FAILED
		=========================================== */

		razorpay.on("payment.failed", (response: unknown) => {
			console.error("RAZORPAY PAYMENT FAILED:", response);

			setPaymentError("Payment failed. Please try again.");

			setIsProcessingPayment(false);
		});

		razorpay.open();
	};

	/* =======================================================
	   CREATE ORDER + CONTINUE ACCORDING TO PAYMENT METHOD
	======================================================= */

	const startCheckout = async () => {
		setIsProcessingPayment(true);

		try {
			/*
			 * Send the customer's complete
			 * name directly.
			 */

			const checkoutPayload: Record<string, unknown> = {
				name: formData.name.trim(),

				phone: formData.phone.trim(),

				delivery_method: deliveryMethod,

				payment_method: paymentMethod,

				wrap: wrap ? "yes" : "no",
			};

			/* =================================================
			   STANDARD DELIVERY
			================================================= */

			if (deliveryMethod === "standard") {
				checkoutPayload.flat_house_building = formData.flatHouseBuilding.trim();

				checkoutPayload.road_area_colony = formData.roadAreaColony.trim();

				if (formData.landmark.trim()) {
					checkoutPayload.landmark = formData.landmark.trim();
				}

				checkoutPayload.city = formData.city.trim();

				checkoutPayload.state = formData.state.trim();

				checkoutPayload.pincode = formData.pincode.trim();

				/*
				 * Saved address ID
				 */

				checkoutPayload.savedAddressId =
					isLoggedIn && selectedAddressId !== "new" ? selectedAddressId : null;
			}

			console.log("CHECKOUT PAYLOAD:", checkoutPayload);

			/* =================================================
			   CREATE ORDER
			================================================= */

			const response = await fetch("/api/checkout", {
				method: "POST",

				headers: {
					"Content-Type": "application/json",
				},

				credentials: "include",

				body: JSON.stringify(checkoutPayload),
			});

			const data: CheckoutResponse = await response
				.json()
				.catch(() => ({}) as CheckoutResponse);

			console.log("CHECKOUT RESPONSE:", data);

			if (!response.ok) {
				throw new Error(data?.message || "Unable to create the order.");
			}

			const result = data.result ?? {};

			const orderId = String(result.order_id ?? result.id ?? "");

			/* =================================================
			   RAZORPAY
			================================================= */

			if (paymentMethod === "razorpay") {
				const apiKey = typeof result.key === "string" ? result.key : "";

				if (!apiKey) {
					throw new Error("Razorpay API key was not returned by the server.");
				}

				if (!orderId) {
					throw new Error("Razorpay order ID was not returned by the server.");
				}

				console.log("RAZORPAY ORDER CREATED:", {
					apiKey,
					orderId,
				});

				/*
				 * Stays in the "processing" state until the
				 * Razorpay modal succeeds, fails or is dismissed.
				 */
				openRazorpay(apiKey, orderId);

				return;
			}

			/* =================================================
			   UPI — show QR, wait for the customer to confirm
			================================================= */

			if (paymentMethod === "upi") {
				if (!orderId) {
					throw new Error("The server did not return an order ID.");
				}

				const upi = extractUpiDetails(result, grandTotal, orderId);

				if (!upi) {
					throw new Error(
						"The server did not return UPI payment details. Please try again.",
					);
				}

				setUpiSession({
					uri: upi.uri,
					upiId: upi.upiId,
					orderId,
				});

				setIsProcessingPayment(false);

				return;
			}

			/* =================================================
			   CREDIT — confirm the order with verify_payment
			================================================= */

			if (!orderId) {
				throw new Error("The server did not return an order ID.");
			}

			await verifyPayment({
				payment_method: "credit",
				razorpay_order_id: orderId,
			});

			completeOrder();

			setIsProcessingPayment(false);
		} catch (error) {
			console.error("Checkout failed:", error);

			setPaymentError(
				error instanceof Error ? error.message : "Unable to start payment.",
			);

			setIsProcessingPayment(false);
		}
	};

	/* =======================================================
	   HANDLE SUBMIT
	======================================================= */

	const handlePayment = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		setPaymentError("");

		setPaymentSuccess(false);

		/* EMPTY CART */

		if (items.length === 0) {
			setPaymentError("Your cart is empty.");

			return;
		}

		/* VALIDATION */

		const validationError = validateForm();

		if (validationError) {
			setPaymentError(validationError);

			return;
		}

		/* CREDIT — ask for one last confirmation first */

		if (paymentMethod === "credit") {
			/*
			 * The order can't be placed on credit if it is
			 * more than the available credit.
			 */

			if (creditInfo && grandTotal > creditInfo.available) {
				setPaymentError(
					`This order (₹${grandTotal.toFixed(
						2,
					)}) is more than your available credit (₹${creditInfo.available.toFixed(
						2,
					)}). Please choose another payment method.`,
				);

				return;
			}

			setConfirmCreditOpen(true);

			return;
		}

		void startCheckout();
	};

	/* =======================================================
	   CREDIT CONFIRMATION
	======================================================= */

	const confirmCreditOrder = () => {
		setConfirmCreditOpen(false);

		void startCheckout();
	};

	/* =======================================================
		UPI — CUSTOMER SAYS THEY'VE PAID
	======================================================= */

	const handleUpiPaid = async () => {
		if (!upiSession || verifyingUpi) {
			return;
		}

		setVerifyingUpi(true);

		setPaymentError("");

		try {
			await verifyPayment({
				payment_method: "upi",
				razorpay_order_id: upiSession.orderId,
			});

			completeOrder();
		} catch (error) {
			console.error("UPI verification failed:", error);

			setPaymentError(
				error instanceof Error ? error.message : "Payment verification failed.",
			);
		} finally {
			setVerifyingUpi(false);
		}
	};

	/* =======================================================
	   UPI — CLOSE THE WHOLE PAYMENT

	   The X button and the "Close payment" button first ask for
	   confirmation. Confirming ends the UPI session completely and
	   returns the customer to checkout so they can start again.
	======================================================= */

	const requestCloseUpi = () => {
		if (verifyingUpi) {
			return;
		}

		setConfirmCloseUpiOpen(true);
	};

	const closeUpiPayment = () => {
		setConfirmCloseUpiOpen(false);

		setUpiSession(null);

		setPaymentError("");

		setIsProcessingPayment(false);

		setVerifyingUpi(false);

		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	/* =======================================================
	   LOADING
	======================================================= */

	if (loadingCart) {
		return (
			<main className="min-h-screen bg-[#FBF9F7]">
				<div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-4xl items-center justify-center px-5 py-12">
					<div className="flex flex-col items-center gap-3">
						<span className="h-8 w-8 animate-spin rounded-full border-2 border-[#85161B]/25 border-t-[#85161B]" />

						<p className="text-sm text-[#2E2E2E]/50">Loading your cart...</p>
					</div>
				</div>
			</main>
		);
	}

	/* =======================================================
	   CART ERROR
	======================================================= */

	if (cartError) {
		return (
			<main className="min-h-screen bg-[#FBF9F7]">
				<div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-4xl items-center justify-center px-5 py-12">
					<div className="w-full rounded-3xl border border-red-200 bg-white px-6 py-14 text-center shadow-[0_12px_45px_rgba(80,40,20,0.06)] sm:px-12">
						<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
							<AlertCircle
								size={32}
								className="text-red-500"
								strokeWidth={1.7}
							/>
						</div>

						<h1 className="mt-6 text-2xl font-bold text-[#2E2E2E]">
							Unable to load checkout
						</h1>

						<p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#2E2E2E]/55">
							{cartError}
						</p>

						<button
							type="button"
							onClick={fetchCart}
							className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#85161B] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#721318]"
						>
							Try Again
						</button>
					</div>
				</div>
			</main>
		);
	}

	/* =======================================================
	   PAYMENT SUCCESS
	======================================================= */

	if (paymentSuccess) {
		return (
			<main className="min-h-screen bg-[#FBF9F7]">
				<div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-3xl items-center justify-center px-5 py-12">
					<div className="w-full rounded-3xl border border-[#E8DED7] bg-white px-6 py-14 text-center shadow-[0_12px_45px_rgba(80,40,20,0.06)] sm:px-12">
						<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
							<CheckCircle2
								size={42}
								className="text-green-600"
								strokeWidth={1.7}
							/>
						</div>

						<p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-green-600">
							Order placed successfully
						</p>

						<h1 className="mt-2 text-3xl font-bold text-[#2E2E2E] sm:text-4xl">
							Thank you for your order!
						</h1>

						<p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#2E2E2E]/55">
							Your order has been placed successfully and is being processed.
						</p>

						<Link
							href="/shop"
							className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#85161B] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#721318]"
						>
							Continue Shopping
							<ArrowRight size={17} />
						</Link>
					</div>
				</div>
			</main>
		);
	}

	/* =======================================================
	   UPI PAYMENT SCREEN
	======================================================= */

	if (upiSession) {
		return (
			<main
				className="min-h-screen bg-[#FBF9F7] pt-[112px]
					sm:pt-[120px]"
			>
				<div className="mx-auto max-w-lg px-5 py-10">
					<div className="relative rounded-3xl border border-[#E8DED7] bg-white px-6 py-10 text-center shadow-[0_12px_45px_rgba(80,40,20,0.06)] sm:px-10">
						{/* CLOSE (X) */}

						<button
							type="button"
							onClick={requestCloseUpi}
							disabled={verifyingUpi}
							aria-label="Close payment"
							title="Close payment"
							className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-[#2E2E2E]/45 transition hover:bg-[#FBF9F7] hover:text-[#85161B] disabled:cursor-not-allowed disabled:opacity-40"
						>
							<X size={19} />
						</button>

						<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F7D6BF]/40">
							<Smartphone size={26} className="text-[#85161B]" />
						</div>

						<p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#85161B]">
							Pay via UPI
						</p>

						<h1 className="mt-2 text-3xl font-bold text-[#2E2E2E]">
							₹{grandTotal.toFixed(2)}
						</h1>

						<p className="mt-2 text-sm text-[#2E2E2E]/55">
							Scan the QR code with any UPI app, or open your UPI app directly.
						</p>

						{/* QR */}

						<div className="mx-auto mt-6 w-fit rounded-2xl border border-[#E8DED7] bg-white p-4">
							<QRCodeSVG value={upiSession.uri} size={220} level="M" />
						</div>

						{upiSession.upiId && (
							<p className="mt-4 text-xs text-[#2E2E2E]/50">
								UPI ID:{" "}
								<span className="select-all font-semibold text-[#2E2E2E]">
									{upiSession.upiId}
								</span>
							</p>
						)}

						<p className="mt-1 text-xs text-[#2E2E2E]/40">
							Order #{upiSession.orderId}
						</p>

						{paymentError && (
							<div
								role="alert"
								className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700"
							>
								{paymentError}
							</div>
						)}

						{/* ACTIONS */}

						<div className="mt-6 space-y-3">
							<a
								href={upiSession.uri}
								className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#85161B] bg-white py-3.5 text-sm font-semibold text-[#85161B] transition hover:bg-[#85161B]/5"
							>
								<Smartphone size={17} />
								Open UPI app
							</a>

							<button
								type="button"
								onClick={handleUpiPaid}
								disabled={verifyingUpi}
								className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#85161B] py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#721318] hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
							>
								{verifyingUpi ? (
									<>
										<span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
										Verifying payment...
									</>
								) : (
									<>
										<CheckCircle2 size={17} />I have paid
									</>
								)}
							</button>

							<button
								type="button"
								onClick={requestCloseUpi}
								disabled={verifyingUpi}
								className="flex w-full items-center justify-center gap-2 py-2 text-sm font-medium text-[#2E2E2E]/55 transition hover:text-[#85161B] disabled:opacity-50"
							>
								<X size={15} />
								Close payment
							</button>
						</div>

						<p className="mt-5 text-[11px] leading-5 text-[#2E2E2E]/40">
							After completing the payment in your UPI app, come back here and
							tap &quot;I have paid&quot; so we can confirm it.
						</p>
					</div>
				</div>

				{/* =================================================
				    CLOSE PAYMENT WARNING
				================================================= */}

				{confirmCloseUpiOpen && (
					<div
						role="dialog"
						aria-modal="true"
						aria-labelledby="close-upi-title"
						className="fixed inset-0 z-[200] flex items-center justify-center px-5"
					>
						<button
							type="button"
							aria-label="Keep payment open"
							onClick={() => setConfirmCloseUpiOpen(false)}
							className="absolute inset-0 cursor-default bg-black/40"
						/>

						<div className="relative w-full max-w-md rounded-2xl border border-[#E8DED7] bg-white p-6 shadow-2xl">
							<div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
								<AlertTriangle size={22} className="text-amber-600" />
							</div>

							<h2
								id="close-upi-title"
								className="mt-4 text-xl font-bold text-[#2E2E2E]"
							>
								Close this payment?
							</h2>

							<p className="mt-2 text-sm leading-6 text-[#2E2E2E]/60">
								This will end the UPI payment for order{" "}
								<span className="font-semibold text-[#2E2E2E]">
									#{upiSession.orderId}
								</span>{" "}
								and take you back to checkout, where you can start a new
								payment.
							</p>

							<div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
								<AlertTriangle
									size={16}
									className="mt-0.5 shrink-0 text-amber-600"
								/>

								<p className="text-xs leading-5 text-amber-800">
									If you have already paid in your UPI app, don&apos;t close
									this. Tap &quot;I have paid&quot; instead so we can confirm
									your payment.
								</p>
							</div>

							<div className="mt-6 grid grid-cols-2 gap-3">
								<button
									type="button"
									onClick={() => setConfirmCloseUpiOpen(false)}
									className="rounded-xl border border-[#DED6D0] bg-white py-3 text-sm font-semibold text-[#2E2E2E]/70 transition hover:bg-[#FBF9F7]"
								>
									Keep payment open
								</button>

								<button
									type="button"
									onClick={closeUpiPayment}
									className="rounded-xl bg-[#85161B] py-3 text-sm font-semibold text-white transition hover:bg-[#721318]"
								>
									Close payment
								</button>
							</div>
						</div>
					</div>
				)}
			</main>
		);
	}

	/* =======================================================
	   EMPTY CART
	======================================================= */

	if (items.length === 0) {
		return (
			<main className="min-h-screen bg-[#FBF9F7]">
				<div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-4xl items-center justify-center px-5 py-12">
					<div className="w-full rounded-3xl border border-[#E8DED7] bg-white px-6 py-14 text-center shadow-[0_12px_45px_rgba(80,40,20,0.06)] sm:px-12">
						<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#F7D6BF]/40">
							<ShoppingBag
								size={32}
								className="text-[#85161B]"
								strokeWidth={1.7}
							/>
						</div>

						<p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-[#85161B]">
							Checkout
						</p>

						<h1 className="mt-2 text-3xl font-bold text-[#2E2E2E] sm:text-4xl">
							Your cart is empty.
						</h1>

						<p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#2E2E2E]/55">
							Add something special to your cart before proceeding to checkout.
						</p>

						<Link
							href="/shop"
							className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#85161B] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#721318]"
						>
							Continue Shopping
							<ArrowRight size={17} />
						</Link>
					</div>
				</div>
			</main>
		);
	}

	/* =======================================================
	   UI CONDITIONS
	======================================================= */

	const showAddressForm =
		deliveryMethod === "standard" &&
		(!isLoggedIn ||
			checkingAuth ||
			savedAddresses.length === 0 ||
			selectedAddressId === "new");

	/*
	 * Logged-in users have their account
	 * details locked.
	 *
	 * Guest users get editable customer
	 * details.
	 */
	const lockContactFields = isLoggedIn && !checkingAuth;

	/*
	 * CREDIT
	 *
	 * How much of the credit limit has been used, and
	 * whether this order fits in the available credit.
	 */
	const creditUsedPercent =
		creditInfo && creditInfo.limit > 0
			? Math.min(100, Math.max(0, (creditInfo.used / creditInfo.limit) * 100))
			: 0;

	const exceedsCredit = Boolean(creditInfo && grandTotal > creditInfo.available);

	const creditAfterOrder = creditInfo
		? Math.max(0, creditInfo.available - grandTotal)
		: 0;

	/*
	 * PAYMENT OPTIONS
	 *
	 * Credit is only offered to logged-in customers.
	 */
	const paymentOptions: {
		id: PaymentMethod;
		title: string;
		description: string;
		icon: React.ComponentType<{ size?: number; className?: string }>;
	}[] = [
		...(enabledMethods.razorpay
			? [
					{
						id: "razorpay" as PaymentMethod,
						title: "Razorpay",
						description: "Cards, UPI, net banking and more",
						icon: CreditCard,
					},
				]
			: []),
		...(enabledMethods.upi
			? [
					{
						id: "upi" as PaymentMethod,
						title: "UPI QR code",
						description: "Scan a QR code or open your UPI app",
						icon: Smartphone,
					},
				]
			: []),
		...(isLoggedIn && enabledMethods.credit
			? [
					{
						id: "credit" as PaymentMethod,
						title: "Pay on credit",
						description: "Place the order on your credit account",
						icon: Wallet,
					},
				]
			: []),
	];

	const payButtonLabel =
		paymentMethod === "credit"
			? "Place order on credit"
			: paymentMethod === "upi"
				? `Pay ₹${grandTotal.toFixed(2)} via UPI`
				: `Pay ₹${grandTotal.toFixed(2)}`;

	const paymentSectionHint =
		paymentMethod === "razorpay"
			? "You will be redirected to Razorpay's secure checkout."
			: paymentMethod === "upi"
				? "You'll get a QR code to pay with any UPI app."
				: "You'll be asked to confirm before the order is placed.";

	/* =======================================================
	   MAIN CHECKOUT
	======================================================= */

	return (
		<main
			className="min-h-screen bg-[#FBF9F7] pt-[112px]
					sm:pt-[120px]"
		>
			{/* HEADER */}

			<section className="border-b border-[#E8DED7] bg-white">
				<div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
					<Link
						href="/cart"
						className="inline-flex items-center gap-2 text-sm font-medium text-[#2E2E2E]/55 transition-colors hover:text-[#85161B]"
					>
						<ArrowLeft size={16} />
						Back to Cart
					</Link>

					<div className="mt-6">
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#85161B]">
							Almost there
						</p>

						<h1 className="mt-1 text-3xl font-bold tracking-tight text-[#2E2E2E] sm:text-4xl">
							Checkout
						</h1>

						<p className="mt-2 text-sm text-[#2E2E2E]/50">
							Complete your delivery details and make your payment securely.
						</p>
					</div>
				</div>
			</section>

			{/* PAYMENT ERROR */}

			{paymentError && (
				<div className="mx-auto mt-5 max-w-7xl px-5 sm:px-6 lg:px-8">
					<div
						role="alert"
						className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
					>
						{paymentError}
					</div>
				</div>
			)}

			{/* CONTENT */}

			<section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8 lg:py-10">
				<form
					onSubmit={handlePayment}
					className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px] lg:gap-8"
				>
					{/* LEFT COLUMN */}

					<div className="space-y-6">
						{/* =================================================
						    DELIVERY METHOD
						================================================= */}

						<section className="overflow-hidden rounded-2xl border border-[#E8DED7] bg-white">
							<div className="border-b border-[#E8DED7] px-5 py-4 sm:px-6">
								<div className="flex items-center gap-3">
									<div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F7D6BF]/40">
										<Truck size={17} className="text-[#85161B]" />
									</div>

									<div>
										<h2 className="font-semibold text-[#2E2E2E]">
											Delivery Method
										</h2>

										<p className="mt-0.5 text-xs text-[#2E2E2E]/45">
											Choose how you would like to receive your order.
										</p>
									</div>
								</div>
							</div>

							<div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 sm:p-6">
								{/* STANDARD */}

								<button
									type="button"
									onClick={() => handleDeliveryMethodChange("standard")}
									className={`
										flex
										items-center
										gap-3
										rounded-xl
										border
										p-4
										text-left
										transition
										${
											deliveryMethod === "standard"
												? "border-[#85161B] bg-[#FFF9F6]"
												: "border-[#DED6D0] bg-[#FCFBFA] hover:border-[#85161B]/40"
										}
									`}
								>
									<div
										className={`
											flex
											h-5
											w-5
											shrink-0
											items-center
											justify-center
											rounded-full
											border-2
											${deliveryMethod === "standard" ? "border-[#85161B]" : "border-[#DED6D0]"}
										`}
									>
										{deliveryMethod === "standard" && (
											<div className="h-2.5 w-2.5 rounded-full bg-[#85161B]" />
										)}
									</div>

									<div className="flex-1">
										<p className="text-sm font-semibold text-[#2E2E2E]">
											Standard Delivery
										</p>

										<p className="mt-1 text-xs text-[#2E2E2E]/50">
											Delivered to your address
										</p>
									</div>

									<span className="text-sm font-semibold text-[#85161B]">
										₹{cartDeliveryFee.toFixed(2)}
									</span>
								</button>

								{/* PICKUP */}

								<button
									type="button"
									onClick={() => handleDeliveryMethodChange("pickup")}
									className={`
										flex
										items-center
										gap-3
										rounded-xl
										border
										p-4
										text-left
										transition
										${
											deliveryMethod === "pickup"
												? "border-[#85161B] bg-[#FFF9F6]"
												: "border-[#DED6D0] bg-[#FCFBFA] hover:border-[#85161B]/40"
										}
									`}
								>
									<div
										className={`
											flex
											h-5
											w-5
											shrink-0
											items-center
											justify-center
											rounded-full
											border-2
											${deliveryMethod === "pickup" ? "border-[#85161B]" : "border-[#DED6D0]"}
										`}
									>
										{deliveryMethod === "pickup" && (
											<div className="h-2.5 w-2.5 rounded-full bg-[#85161B]" />
										)}
									</div>

									<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F7D6BF]/40">
										<Store size={18} className="text-[#85161B]" />
									</div>

									<div className="flex-1">
										<p className="text-sm font-semibold text-[#2E2E2E]">
											Pickup from Store
										</p>

										<p className="mt-1 text-xs text-[#2E2E2E]/50">
											Collect your order from our store
										</p>
									</div>

									<span className="text-sm font-semibold text-green-600">
										Free
									</span>
								</button>
							</div>
						</section>

						{/* =================================================
						    DELIVERY INFORMATION
						================================================= */}

						{deliveryMethod === "standard" && (
							<section className="overflow-hidden rounded-2xl border border-[#E8DED7] bg-white">
								<div className="border-b border-[#E8DED7] px-5 py-4 sm:px-6">
									<div className="flex items-center gap-3">
										<div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F7D6BF]/40">
											<MapPin size={17} className="text-[#85161B]" />
										</div>

										<div>
											<h2 className="font-semibold text-[#2E2E2E]">
												Delivery Information
											</h2>

											<p className="mt-0.5 text-xs text-[#2E2E2E]/45">
												{isLoggedIn
													? "Choose a saved address or add a new one."
													: "Where should we deliver your order?"}
											</p>
										</div>
									</div>
								</div>

								<div className="p-5 sm:p-6">
									{/* =====================================
									    CUSTOMER DETAILS
									===================================== */}

									{!lockContactFields && (
										<div className="mb-6">
											<p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-[#2E2E2E]/45">
												Your Details
											</p>

											<div className="grid grid-cols-1 gap-5">
												<FormInput
													label="Phone number"
													name="phone"
													type="tel"
													value={formData.phone}
													onChange={handleChange}
													placeholder="10-digit mobile number"
													required
												/>
											</div>
										</div>
									)}

									{/* =====================================
									    CUSTOMER / ACCOUNT DETAILS
									===================================== */}

									{lockContactFields && (
										<div className="mb-6 flex items-center justify-between rounded-xl border border-[#E8DED7] bg-[#FCFBFA] px-4 py-3">
											<div>
												<p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#2E2E2E]/40">
													Account
												</p>

												<p className="mt-1 text-sm font-semibold text-[#2E2E2E]">
													{formData.name || "Account"}
												</p>

												<p className="mt-0.5 text-xs text-[#2E2E2E]/50">
													{formData.phone}
												</p>
											</div>
										</div>
									)}

									{/* =====================================
									    SAVED ADDRESSES
									===================================== */}

									{isLoggedIn &&
										(checkingAuth || savedAddresses.length > 0) && (
											<div className="mb-6 space-y-3">
												{checkingAuth ? (
													<div className="flex items-center gap-2 py-2 text-sm text-[#2E2E2E]/50">
														<span className="h-4 w-4 animate-spin rounded-full border-2 border-[#85161B]/25 border-t-[#85161B]" />
														Loading saved addresses...
													</div>
												) : (
													<>
														<p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#2E2E2E]/45">
															Saved Addresses
														</p>

														<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
															{savedAddresses.map((addr) => {
																const isSelected =
																	selectedAddressId === addr.id;

																return (
																	<button
																		key={addr.id}
																		type="button"
																		onClick={() => handleSelectAddress(addr.id)}
																		className={`
																				flex
																				items-start
																				gap-3
																				rounded-xl
																				border
																				p-4
																				text-left
																				transition
																				${
																					isSelected
																						? "border-[#85161B] bg-[#FFF9F6]"
																						: "border-[#DED6D0] bg-[#FCFBFA] hover:border-[#85161B]/40"
																				}
																			`}
																	>
																		{/* RADIO */}

																		<div
																			className={`
																					mt-0.5
																					flex
																					h-5
																					w-5
																					shrink-0
																					items-center
																					justify-center
																					rounded-full
																					border-2
																					${isSelected ? "border-[#85161B]" : "border-[#DED6D0]"}
																				`}
																		>
																			{isSelected && (
																				<div className="h-2.5 w-2.5 rounded-full bg-[#85161B]" />
																			)}
																		</div>

																		<div className="min-w-0 flex-1">
																			{/* RECEIVER NAME */}

																			<div className="flex flex-wrap items-center gap-2">
																				<p className="text-sm font-semibold text-[#2E2E2E]">
																					{addr.name || "Receiver"}
																				</p>

																				{addr.isDefault && (
																					<span className="rounded-full bg-[#F7D6BF]/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#85161B]">
																						Default
																					</span>
																				)}
																			</div>

																			{/* ADDRESS */}

																			<p className="mt-1 text-xs leading-5 text-[#2E2E2E]/55">
																				{addr.flatHouseBuilding}

																				{addr.roadAreaColony
																					? `, ${addr.roadAreaColony}`
																					: ""}

																				{addr.landmark &&
																				addr.landmark !== addr.flatHouseBuilding
																					? `, ${addr.landmark}`
																					: ""}

																				{addr.city ? `, ${addr.city}` : ""}

																				{addr.state ? `, ${addr.state}` : ""}

																				{addr.pincode
																					? ` - ${addr.pincode}`
																					: ""}
																			</p>

																			{/* PHONE */}

																			{addr.phone && (
																				<p className="mt-1 text-xs text-[#2E2E2E]/45">
																					{addr.phone}
																				</p>
																			)}
																		</div>
																	</button>
																);
															})}

															{/* ADD NEW */}

															<button
																type="button"
																onClick={() => handleSelectAddress("new")}
																className={`
																	flex
																	min-h-[120px]
																	items-center
																	justify-center
																	gap-2
																	rounded-xl
																	border
																	border-dashed
																	p-4
																	text-sm
																	font-semibold
																	transition
																	${
																		selectedAddressId === "new"
																			? "border-[#85161B] bg-[#FFF9F6] text-[#85161B]"
																			: "border-[#DED6D0] text-[#2E2E2E]/55 hover:border-[#85161B]/40 hover:text-[#85161B]"
																	}
																`}
															>
																<Plus size={16} />
																Add a new address
															</button>
														</div>
													</>
												)}
											</div>
										)}

									{/* =====================================
									    NEW ADDRESS FORM
									===================================== */}

									{showAddressForm && (
										<div className="space-y-5">
											{/* RECEIVER DETAILS */}

											<div>
												<p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-[#2E2E2E]/45">
													Receiver Details
												</p>

												<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
													<div className="sm:col-span-2">
														<FormInput
															label="Receiver's Full Name"
															name="name"
															value={formData.name}
															onChange={handleChange}
															placeholder="Enter receiver's full name"
															required
														/>
													</div>

													<div className="sm:col-span-2">
														<FormInput
															label="Phone number"
															name="phone"
															type="tel"
															value={formData.phone}
															onChange={handleChange}
															placeholder="10-digit mobile number"
															required
														/>
													</div>
												</div>
											</div>

											{/* ADDRESS DETAILS */}

											<div className="border-t border-[#E8DED7] pt-5">
												<p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-[#2E2E2E]/45">
													Address Details
												</p>

												<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
													<div className="sm:col-span-2">
														<FormInput
															label="Flat / House / Building"
															name="flatHouseBuilding"
															value={formData.flatHouseBuilding}
															onChange={handleChange}
															placeholder="Flat no., house name, building"
															required
														/>
													</div>

													<div className="sm:col-span-2">
														<FormInput
															label="Road / Area / Colony"
															name="roadAreaColony"
															value={formData.roadAreaColony}
															onChange={handleChange}
															placeholder="Road name, area, colony"
															required
														/>
													</div>

													<div className="sm:col-span-2">
														<FormInput
															label="Landmark"
															name="landmark"
															value={formData.landmark}
															onChange={handleChange}
															placeholder="Nearby landmark (optional)"
														/>
													</div>

													<FormInput
														label="City"
														name="city"
														value={formData.city}
														onChange={handleChange}
														placeholder="Ujjain"
														required
													/>

													<FormInput
														label="State"
														name="state"
														value={formData.state}
														onChange={handleChange}
														placeholder="Madhya Pradesh"
														required
													/>

													<FormInput
														label="PIN code"
														name="pincode"
														value={formData.pincode}
														onChange={handleChange}
														placeholder="456001"
														required
													/>
												</div>
											</div>
										</div>
									)}
								</div>
							</section>
						)}

						{/* =================================================
						    PICKUP INFORMATION
						================================================= */}

						{deliveryMethod === "pickup" && (
							<section className="overflow-hidden rounded-2xl border border-[#E8DED7] bg-white">
								<div className="border-b border-[#E8DED7] px-5 py-4 sm:px-6">
									<div className="flex items-center gap-3">
										<div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F7D6BF]/40">
											<Store size={17} className="text-[#85161B]" />
										</div>

										<div>
											<h2 className="font-semibold text-[#2E2E2E]">
												Pickup from Store
											</h2>

											<p className="mt-0.5 text-xs text-[#2E2E2E]/45">
												No delivery address is required.
											</p>
										</div>
									</div>
								</div>

								<div className="p-5 sm:p-6">
									<div className="rounded-xl border border-[#85161B] bg-[#FFF9F6] p-5">
										<div className="flex items-start gap-4">
											<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F7D6BF]/50">
												<Store size={20} className="text-[#85161B]" />
											</div>

											<div>
												<p className="text-sm font-semibold text-[#2E2E2E]">
													Store Pickup
												</p>

												<p className="mt-1 text-xs leading-6 text-[#2E2E2E]/55">
													Your order will be prepared for pickup from our store.
													You don't need to provide a delivery address.
												</p>

												<div className="mt-3 inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
													No delivery fee
												</div>
											</div>
										</div>
									</div>

									{/*
									 * CONTACT DETAILS
									 *
									 * Email is not collected here —
									 * pickup orders only need a name and phone
									 * number to identify the customer in-store.
									 */}

									<div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
										{/* FULL NAME */}

										<div className="sm:col-span-2">
											<FormInput
												label="Receiver's Full Name"
												name="name"
												value={formData.name}
												onChange={handleChange}
												placeholder="Enter receiver's full name"
												required
											/>
										</div>

										{/* PHONE */}

										<div className="sm:col-span-2">
											<FormInput
												label="Phone number"
												name="phone"
												type="tel"
												value={formData.phone}
												onChange={handleChange}
												placeholder="10-digit mobile number"
												required
											/>
										</div>
									</div>
								</div>
							</section>
						)}

						{/* =================================================
						    GIFT WRAP
						================================================= */}

						<section className="overflow-hidden rounded-2xl border border-[#E8DED7] bg-white">
							<div className="p-5 sm:p-6">
								<label
									htmlFor="wrap"
									className={`
										flex
										cursor-pointer
										items-center
										gap-4
										rounded-xl
										border
										p-4
										transition
										${
											wrap
												? "border-[#85161B] bg-[#FFF9F6]"
												: "border-[#DED6D0] bg-[#FCFBFA] hover:border-[#85161B]/40"
										}
									`}
								>
									<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F7D6BF]/50">
										<Gift size={19} className="text-[#85161B]" />
									</div>

									<div className="flex-1">
										<p className="text-sm font-semibold text-[#2E2E2E]">
											Gift wrap this order
										</p>

										<p className="mt-1 text-xs text-[#2E2E2E]/50">
											Have your order beautifully wrapped before it reaches you.
										</p>
									</div>

									<input
										id="wrap"
										type="checkbox"
										checked={wrap}
										onChange={(event) => setWrap(event.target.checked)}
										className="h-5 w-5 shrink-0 cursor-pointer rounded accent-[#85161B]"
									/>
								</label>
							</div>
						</section>

						{/* =================================================
						    PAYMENT
						================================================= */}

						<section className="overflow-hidden rounded-2xl border border-[#E8DED7] bg-white">
							<div className="border-b border-[#E8DED7] px-5 py-4 sm:px-6">
								<div className="flex items-center gap-3">
									<div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F7D6BF]/40">
										<CreditCard size={17} className="text-[#85161B]" />
									</div>

									<div>
										<h2 className="font-semibold text-[#2E2E2E]">Payment</h2>

										<p className="mt-0.5 text-xs text-[#2E2E2E]/45">
											{paymentSectionHint}
										</p>
									</div>
								</div>
							</div>

							<div className="grid grid-cols-1 gap-3 p-5 sm:p-6">
								{paymentOptions.map((option) => {
									const Icon = option.icon;

									const selected = paymentMethod === option.id;

									return (
										<button
											key={option.id}
											type="button"
											onClick={() => {
												setPaymentMethod(option.id);

												setPaymentError("");
											}}
											className={`
												flex
												items-center
												gap-3
												rounded-xl
												border
												p-4
												text-left
												transition
												${
													selected
														? "border-[#85161B] bg-[#FFF9F6]"
														: "border-[#DED6D0] bg-[#FCFBFA] hover:border-[#85161B]/40"
												}
											`}
										>
											<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F7D6BF]/50">
												<Icon size={19} className="text-[#85161B]" />
											</div>

											<div className="flex-1">
												<p className="text-sm font-semibold text-[#2E2E2E]">
													{option.title}
												</p>

												<p className="mt-1 text-xs text-[#2E2E2E]/50">
													{option.description}
												</p>
											</div>

											{selected && (
												<CheckCircle2
													size={19}
													className="shrink-0 text-[#85161B]"
												/>
											)}
										</button>
									);
								})}
							</div>

							{/* =============================================
							    CREDIT LIMIT + AVAILABLE CREDIT
							============================================= */}

							{paymentMethod === "credit" && isLoggedIn && (
								<div className="border-t border-[#E8DED7] bg-[#FCFBFA] p-5 sm:p-6">
									<div className="flex items-center gap-2">
										<Wallet size={16} className="text-[#85161B]" />

										<h3 className="text-sm font-semibold text-[#2E2E2E]">
											Your credit account
										</h3>
									</div>

									{checkingAuth ? (
										<div className="mt-4 flex items-center gap-2 text-sm text-[#2E2E2E]/50">
											<span className="h-4 w-4 animate-spin rounded-full border-2 border-[#85161B]/25 border-t-[#85161B]" />
											Loading credit details...
										</div>
									) : creditInfo ? (
										<>
											<div className="mt-4 grid grid-cols-2 gap-3">
												<div className="rounded-xl border border-[#E8DED7] bg-white p-4">
													<p className="text-[11px] font-semibold text-[#2E2E2E]/45">
														Credit limit
													</p>

													<p className="mt-1.5 text-lg font-bold text-[#2E2E2E]">
														₹{creditInfo.limit.toFixed(2)}
													</p>
												</div>

												<div
													className={`rounded-xl border bg-white p-4 ${
														exceedsCredit
															? "border-red-200"
															: "border-[#E8DED7]"
													}`}
												>
													<p className="text-[11px] font-semibold text-[#2E2E2E]/45">
														Available credit
													</p>

													<p
														className={`mt-1.5 text-lg font-bold ${
															exceedsCredit ? "text-red-600" : "text-green-600"
														}`}
													>
														₹{creditInfo.available.toFixed(2)}
													</p>
												</div>
											</div>

											{/* USAGE BAR */}

											<div className="mt-4">
												<div
													className="h-2 w-full overflow-hidden rounded-full bg-[#E8DED7]"
													role="progressbar"
													aria-label="Credit used"
													aria-valuemin={0}
													aria-valuemax={100}
													aria-valuenow={Math.round(creditUsedPercent)}
												>
													<div
														className={`h-full rounded-full transition-all ${
															creditUsedPercent >= 90
																? "bg-red-500"
																: "bg-[#85161B]"
														}`}
														style={{ width: `${creditUsedPercent}%` }}
													/>
												</div>

												<p className="mt-2 text-xs text-[#2E2E2E]/50">
													₹{creditInfo.used.toFixed(2)} of ₹
													{creditInfo.limit.toFixed(2)} used
												</p>
											</div>

											{/* THIS ORDER */}

											{exceedsCredit ? (
												<div
													role="alert"
													className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
												>
													<AlertTriangle
														size={16}
														className="mt-0.5 shrink-0 text-red-600"
													/>

													<p className="text-xs leading-5 text-red-700">
														This order (₹{grandTotal.toFixed(2)}) is more than
														your available credit. Choose another payment
														method to continue.
													</p>
												</div>
											) : (
												<div className="mt-4 flex items-center justify-between rounded-xl border border-[#E8DED7] bg-white px-4 py-3 text-xs">
													<span className="text-[#2E2E2E]/55">
														Available after this order
													</span>

													<span className="font-semibold text-[#2E2E2E]">
														₹{creditAfterOrder.toFixed(2)}
													</span>
												</div>
											)}
										</>
									) : (
										<p className="mt-3 text-xs leading-5 text-[#2E2E2E]/50">
											We couldn&apos;t load your credit details right now.
										</p>
									)}
								</div>
							)}
						</section>
					</div>

					{/* =================================================
					    ORDER SUMMARY
					================================================= */}

					<aside className="lg:sticky lg:top-24 lg:self-start">
						<div className="overflow-hidden rounded-2xl border border-[#E8DED7] bg-white shadow-[0_10px_35px_rgba(80,40,20,0.05)]">
							{/* HEADER */}

							<div className="border-b border-[#E8DED7] px-5 py-4 sm:px-6">
								<div className="flex items-center justify-between">
									<h2 className="font-semibold text-[#2E2E2E]">
										Order Summary
									</h2>

									<span className="text-xs text-[#2E2E2E]/45">
										{itemCount} {itemCount === 1 ? "item" : "items"}
									</span>
								</div>
							</div>

							{/* PRODUCTS */}

							<div className="divide-y divide-[#E8DED7]">
								{items.map((item) => {
									const quantity = item.quantity;

									const itemTotal = item.selling_price * quantity;

									return (
										<div key={item.id} className="flex gap-3 p-4">
											<div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#F7F3F0]">
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

												<span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#85161B] px-1 text-[10px] font-bold text-white">
													{quantity}
												</span>
											</div>

											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-medium text-[#2E2E2E]">
													{item.name}
												</p>

												<p className="mt-1 text-xs text-[#2E2E2E]/45">
													₹{item.selling_price.toFixed(2)} each
												</p>
											</div>

											<p className="shrink-0 text-sm font-semibold text-[#2E2E2E]">
												₹{itemTotal.toFixed(2)}
											</p>
										</div>
									);
								})}
							</div>

							{/* TOTALS */}

							<div className="border-t border-[#E8DED7] p-5 sm:p-6">
								<div className="space-y-3 text-sm">
									<div className="flex justify-between text-[#2E2E2E]/60">
										<span>Subtotal</span>

										<span>₹{subtotal.toFixed(2)}</span>
									</div>

									<div className="flex justify-between text-[#2E2E2E]/60">
										<span>Delivery</span>

										{deliveryMethod === "pickup" ? (
											<span className="font-medium text-green-600">Free</span>
										) : (
											<span>₹{deliveryFee.toFixed(2)}</span>
										)}
									</div>

									{wrap && (
										<div className="flex justify-between text-[#2E2E2E]/60">
											<span>Gift wrap</span>

											<span>Included</span>
										</div>
									)}

									<div className="border-t border-[#E8DED7] pt-4">
										<div className="flex items-end justify-between">
											<div>
												<p className="font-semibold text-[#2E2E2E]">
													Grand Total
												</p>

												<p className="mt-1 text-[11px] text-[#2E2E2E]/40">
													{paymentMethod === "razorpay"
														? "Secure payment via Razorpay"
														: paymentMethod === "upi"
															? "Pay with any UPI app"
															: "Placed on your credit account"}
												</p>
											</div>

											<p className="text-2xl font-bold text-[#85161B]">
												₹{grandTotal.toFixed(2)}
											</p>
										</div>
									</div>
								</div>

								{/* PAY BUTTON */}

								<button
									type="submit"
									disabled={isProcessingPayment}
									className="
										group
										mt-6
										flex
										w-full
										items-center
										justify-center
										gap-2
										rounded-xl
										bg-[#85161B]
										py-3.5
										text-sm
										font-semibold
										text-white
										transition-all
										hover:bg-[#721318]
										hover:shadow-lg
										active:scale-[0.99]
										disabled:cursor-not-allowed
										disabled:opacity-60
									"
								>
									{isProcessingPayment ? (
										<>
											<span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
											Processing...
										</>
									) : (
										<>
											{payButtonLabel}
											<ArrowRight
												size={17}
												className="transition-transform group-hover:translate-x-1"
											/>
										</>
									)}
								</button>

								{/* SECURITY */}

								<div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-[#2E2E2E]/40">
									<LockKeyhole size={13} />

									<span>Secure & encrypted payment</span>
								</div>
							</div>
						</div>
					</aside>
				</form>
			</section>

			{/* =================================================
			    CREDIT CONFIRMATION
			================================================= */}

			{confirmCreditOpen && (
				<div
					role="dialog"
					aria-modal="true"
					aria-labelledby="credit-confirm-title"
					className="fixed inset-0 z-[200] flex items-center justify-center px-5"
				>
					<button
						type="button"
						aria-label="Close"
						onClick={() => setConfirmCreditOpen(false)}
						className="absolute inset-0 cursor-default bg-black/40"
					/>

					<div className="relative w-full max-w-md rounded-2xl border border-[#E8DED7] bg-white p-6 shadow-2xl">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F7D6BF]/40">
							<Wallet size={22} className="text-[#85161B]" />
						</div>

						<h2
							id="credit-confirm-title"
							className="mt-4 text-xl font-bold text-[#2E2E2E]"
						>
							Place this order on credit?
						</h2>

						<p className="mt-2 text-sm leading-6 text-[#2E2E2E]/60">
							You&apos;re about to place an order of{" "}
							<span className="font-semibold text-[#2E2E2E]">
								₹{grandTotal.toFixed(2)}
							</span>{" "}
							on credit instead of paying now. Do you want to continue?
						</p>

						{creditInfo && (
							<div className="mt-4 space-y-2 rounded-xl border border-[#E8DED7] bg-[#FCFBFA] px-4 py-3 text-xs">
								<div className="flex items-center justify-between">
									<span className="text-[#2E2E2E]/55">Credit limit</span>

									<span className="font-semibold text-[#2E2E2E]">
										₹{creditInfo.limit.toFixed(2)}
									</span>
								</div>

								<div className="flex items-center justify-between">
									<span className="text-[#2E2E2E]/55">Available credit</span>

									<span className="font-semibold text-[#2E2E2E]">
										₹{creditInfo.available.toFixed(2)}
									</span>
								</div>

								<div className="flex items-center justify-between border-t border-[#E8DED7] pt-2">
									<span className="text-[#2E2E2E]/55">
										Available after this order
									</span>

									<span className="font-semibold text-[#85161B]">
										₹{creditAfterOrder.toFixed(2)}
									</span>
								</div>
							</div>
						)}

						<div className="mt-6 grid grid-cols-2 gap-3">
							<button
								type="button"
								onClick={() => setConfirmCreditOpen(false)}
								className="rounded-xl border border-[#DED6D0] bg-white py-3 text-sm font-semibold text-[#2E2E2E]/70 transition hover:bg-[#FBF9F7]"
							>
								Cancel
							</button>

							<button
								type="button"
								onClick={confirmCreditOrder}
								disabled={isProcessingPayment}
								className="rounded-xl bg-[#85161B] py-3 text-sm font-semibold text-white transition hover:bg-[#721318] disabled:opacity-60"
							>
								Yes, place order
							</button>
						</div>
					</div>
				</div>
			)}
		</main>
	);
}

/* =========================================================
   FORM INPUT
========================================================= */

function FormInput({
	label,
	name,
	value,
	onChange,
	placeholder,
	type = "text",
	required = false,
	disabled = false,
}: {
	label: string;
	name: string;
	value: string;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	placeholder?: string;
	type?: string;
	required?: boolean;
	disabled?: boolean;
}) {
	return (
		<div>
			<label
				htmlFor={name}
				className="mb-2 block text-xs font-semibold text-[#2E2E2E]"
			>
				{label}

				{required && <span className="ml-1 text-[#85161B]">*</span>}
			</label>

			<input
				id={name}
				name={name}
				type={type}
				value={value}
				onChange={onChange}
				placeholder={placeholder}
				required={required}
				disabled={disabled}
				className="
					w-full
					rounded-xl
					border
					border-[#DED6D0]
					bg-[#FCFBFA]
					px-3.5
					py-3
					text-sm
					text-[#2E2E2E]
					outline-none
					transition
					placeholder:text-[#2E2E2E]/30
					focus:border-[#85161B]
					focus:ring-2
					focus:ring-[#85161B]/10
					disabled:cursor-not-allowed
					disabled:opacity-60
				"
			/>
		</div>
	);
}