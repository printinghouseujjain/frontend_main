"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	ArrowLeft,
	ArrowRight,
	Minus,
	Plus,
	ShoppingBag,
	Trash2,
	ShieldCheck,
	Truck,
	AlertCircle,
	AlertTriangle,
	PackageX,
} from "lucide-react";

/* ============================================================================
   CONSTANTS
============================================================================ */

const BACKEND_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.printinghouseujjain.in";

const PRODUCT_IMAGE_BASE_URL = `${BACKEND_URL}/assets/products/`;

const UPLOAD_IMAGE_BASE_URL = `${BACKEND_URL}/assets/uploads/`;

/* Backend messages that mean "this product no longer exists" */
const NOT_FOUND_PATTERN =
	/not\s*found|does\s*not\s*exist|doesn'?t\s*exist|deleted|no\s*such|invalid\s*product/i;

/* ============================================================================
   TYPES
============================================================================ */

type Customization = Record<string, string>;

type SelectedVariants = Record<string, string>;

/*
 * ok        - product exists and matches what is in the cart
 * outdated  - product was changed by the store after it was added
 * missing   - product was deleted / cannot be found
 * unknown   - could not be checked (network or server error)
 */
type ProductStatus = "ok" | "outdated" | "missing" | "unknown";

type UploadedCustomizationImage = {
	key: string;
	filename: string;
	url: string;
};

type CartItem = {
	cartItemId: string;
	productId?: string;

	title: string;
	description: string;

	price: number;
	marketPrice: number;
	resellerPrice: number;

	quantity: number;

	image?: string;

	delivery: number;

	customization: Customization;

	customizationImages: UploadedCustomizationImage[];

	/*
	 * The product's chosen variant options, e.g.
	 *
	 * { "3 In 1 Set": "Black Colour with Golden Pen And Metal Keychain" }
	 */
	selectedVariants: SelectedVariants;

	/* Normalised customize_reqs, used to detect product changes */
	customizeReqsSig: string;

	inStock: string;
};

type RawCartItem = {
	id?: string | number;
	product_id?: string | number;
	cart_item_id?: string | number;

	name?: string;
	description?: string;

	varients?: string | unknown[];

	primary_photo_path?: string;

	other_photos_paths?: string | string[];

	market_price?: string | number;
	selling_price?: string | number;
	reseller_price?: string | number;

	category_ids?: string | number[];
	occasion_ids?: string | number[];

	in_stock?: string;
	sold?: string | number;

	customize_reqs?: string | unknown[];

	keywords?: string;

	created_at?: string;

	delivery?: string | number;

	quantity?: string | number;

	customization?: string | Record<string, string>;

	/*
	 * Backend sends the variants selected for this cart row as a
	 * JSON-encoded object string, e.g.
	 *
	 * "{\"3 In 1 Set\":\"Black Colour with Golden Pen And Metal Keychain\"}"
	 */
	selected_variants?: string | Record<string, string>;
};

type CartResponse = {
	status?: number;
	message?: string;

	products_count?: number | string;

	cart?: RawCartItem[];

	total_price?: number | string;
	delivery_fee?: number | string;
	grand_total?: number | string;
};

/* ============================================================================
   HELPERS
============================================================================ */

/**
 * Safely convert any backend value into a number.
 */
function toNumber(value: unknown, fallback = 0): number {
	const number = Number(value);

	return Number.isFinite(number) ? number : fallback;
}

/**
 * Safely parse JSON so a bad string can never crash the page.
 */
function safeJsonParse<T>(value: unknown, fallback: T): T {
	if (value === null || value === undefined) {
		return fallback;
	}

	if (typeof value !== "string") {
		return value as T;
	}

	const trimmed = value.trim();

	if (!trimmed) {
		return fallback;
	}

	try {
		return JSON.parse(trimmed) as T;
	} catch {
		return fallback;
	}
}

/* Stable string for comparing customize_reqs between cart row and product */
function reqsSignature(value: unknown): string {
	if (value === null || value === undefined) {
		return "";
	}

	const parsed = safeJsonParse<unknown>(value, value);

	try {
		return JSON.stringify(parsed);
	} catch {
		return String(value);
	}
}

/* ============================================================================
   PARSE CUSTOMIZATION
============================================================================ */

function parseCustomization(
	value?: string | Record<string, string>,
): Customization {
	if (!value) {
		return {};
	}

	if (typeof value === "object") {
		return value;
	}

	const trimmed = value.trim();

	/* Backend sends "No customization." which is not JSON */
	if (!trimmed || trimmed.toLowerCase() === "no customization.") {
		return {};
	}

	const parsed = safeJsonParse<Record<string, unknown> | null>(trimmed, null);

	if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
		const result: Customization = {};

		Object.entries(parsed).forEach(([key, itemValue]) => {
			if (itemValue !== null && itemValue !== undefined) {
				result[key] = String(itemValue);
			}
		});

		return result;
	}

	return {};
}

/* ============================================================================
   PARSE SELECTED VARIANTS
============================================================================ */

function parseSelectedVariants(
	value?: string | Record<string, string>,
): SelectedVariants {
	if (!value) {
		return {};
	}

	if (typeof value === "object") {
		const result: SelectedVariants = {};

		Object.entries(value).forEach(([key, itemValue]) => {
			if (itemValue !== null && itemValue !== undefined) {
				result[key] = String(itemValue);
			}
		});

		return result;
	}

	const trimmed = value.trim();

	if (!trimmed) {
		return {};
	}

	const parsed = safeJsonParse<Record<string, unknown> | null>(trimmed, null);

	if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
		const result: SelectedVariants = {};

		Object.entries(parsed).forEach(([key, itemValue]) => {
			if (itemValue !== null && itemValue !== undefined) {
				result[key] = String(itemValue);
			}
		});

		return result;
	}

	return {};
}

/* ============================================================================
   CLEAN CUSTOMIZATION VALUE

   "Name To be Printed on Front Side = Nalla"  ->  "Nalla"
   "Upload Up to 4 Photos = [\"a.jpg\",\"b.png\"]"  ->  "a.jpg, b.png"
============================================================================ */

function cleanCustomizationValue(value: string): string {
	if (!value) {
		return "";
	}

	const trimmed = value.trim();

	const arrayMatch = trimmed.match(/\[[\s\S]*\]/);

	if (arrayMatch) {
		const parsed = safeJsonParse<unknown[] | null>(arrayMatch[0], null);

		if (Array.isArray(parsed)) {
			return parsed
				.filter((item): item is string => typeof item === "string")
				.join(", ");
		}
	}

	if (trimmed.includes("=")) {
		return trimmed.split("=").slice(1).join("=").trim();
	}

	return trimmed;
}

/* ============================================================================
   CHECK IMAGE FILENAME
============================================================================ */

function looksLikeImageFilename(value: string): boolean {
	if (!value) {
		return false;
	}

	const filename = value
		.trim()
		.replace(/^["']|["']$/g, "")
		.replace(/^\[|\]$/g, "");

	return /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(filename);
}

/* ============================================================================
   EXTRACT CUSTOMIZATION IMAGES
============================================================================ */

function extractCustomizationImages(
	customization: Customization,
): UploadedCustomizationImage[] {
	const images: UploadedCustomizationImage[] = [];

	Object.entries(customization).forEach(([key, rawValue]) => {
		if (!rawValue) {
			return;
		}

		const value = rawValue.trim();

		const cleanedValue = cleanCustomizationValue(value);

		/* "Upload Up to 4 Photos = [\"a.jpg\",\"b.jpg\"]" */

		const arrayMatch = value.match(/\[[\s\S]*\]/);

		if (arrayMatch) {
			const parsed = safeJsonParse<unknown[] | null>(arrayMatch[0], null);

			if (Array.isArray(parsed)) {
				parsed.forEach((filename, index) => {
					if (typeof filename !== "string") {
						return;
					}

					const cleanFilename = filename.trim().replace(/^["']|["']$/g, "");

					if (!cleanFilename || !looksLikeImageFilename(cleanFilename)) {
						return;
					}

					images.push({
						key: `${key}-${index}`,
						filename: cleanFilename,
						url: `${UPLOAD_IMAGE_BASE_URL}${encodeURIComponent(cleanFilename)}`,
					});
				});

				return;
			}
		}

		/* Single image filename */

		if (looksLikeImageFilename(cleanedValue)) {
			images.push({
				key,
				filename: cleanedValue,
				url: `${UPLOAD_IMAGE_BASE_URL}${encodeURIComponent(cleanedValue)}`,
			});
		}
	});

	/* Remove duplicates */
	return images.filter(
		(image, index, array) =>
			array.findIndex((current) => current.filename === image.filename) ===
			index,
	);
}

/* ============================================================================
   GET PRODUCT IMAGE
============================================================================ */

function getProductImage(photoPath?: string): string | undefined {
	if (!photoPath) {
		return undefined;
	}

	if (photoPath.startsWith("http://") || photoPath.startsWith("https://")) {
		return photoPath;
	}

	const cleanPath = photoPath.replace(/^\/+/, "");

	return `${PRODUCT_IMAGE_BASE_URL}${cleanPath}`;
}

/* ============================================================================
   NORMALIZE CART ITEM

   cart_item_id is the UNIQUE cart row. The product id may be duplicated,
   so cart_item_id is used for React keys and for cart updates.
============================================================================ */

function normalizeCartItem(raw: RawCartItem): CartItem | null {
	if (raw.cart_item_id === undefined || raw.cart_item_id === null) {
		console.error("Cart item is missing cart_item_id:", raw);

		return null;
	}

	const cartItemId = String(raw.cart_item_id);

	const quantity = Math.max(1, Math.floor(toNumber(raw.quantity, 1)));

	const customization = parseCustomization(raw.customization);

	const customizationImages = extractCustomizationImages(customization);

	const selectedVariants = parseSelectedVariants(raw.selected_variants);

	return {
		cartItemId,

		productId:
			raw.id !== undefined && raw.id !== null
				? String(raw.id)
				: raw.product_id !== undefined && raw.product_id !== null
					? String(raw.product_id)
					: undefined,

		title: raw.name ?? "Untitled product",

		description: raw.description ?? "",

		price: toNumber(raw.selling_price, 0),

		marketPrice: toNumber(raw.market_price, 0),

		resellerPrice: toNumber(raw.reseller_price, 0),

		quantity,

		image: getProductImage(raw.primary_photo_path),

		delivery: toNumber(raw.delivery, 0),

		customization,

		customizationImages,

		selectedVariants,

		customizeReqsSig: reqsSignature(raw.customize_reqs),

		inStock: raw.in_stock ?? "available",
	};
}

/* ============================================================================
   CHECK PRODUCT STATUS

   Looks the product up again and reports whether it was deleted,
   changed since it was added to the cart, or is unchanged.
============================================================================ */

async function checkProductStatus(item: CartItem): Promise<ProductStatus> {
	if (!item.productId) {
		return "unknown";
	}

	try {
		const formData = new FormData();

		formData.append("product_id", item.productId);

		const response = await fetch(
			`/api/product/${encodeURIComponent(item.productId)}`,
			{
				method: "POST",
				credentials: "include",
				cache: "no-store",
				body: formData,
			},
		);

		const data = (await response.json().catch(() => null)) as Record<
			string,
			unknown
		> | null;

		const message = typeof data?.message === "string" ? data.message : "";

		const logicalStatus =
			typeof data?.status === "number" ? data.status : response.status;

		/* DELETED / NOT FOUND */

		if (
			response.status === 404 ||
			logicalStatus === 404 ||
			NOT_FOUND_PATTERN.test(message)
		) {
			return "missing";
		}

		/* Server problem: do not claim anything about the product */

		if (!response.ok || logicalStatus >= 400) {
			return "unknown";
		}

		const current = (data?.result ??
			data?.product ??
			data?.data ??
			data) as Record<string, unknown> | null;

		/* OK response but no product data inside */

		if (
			!current ||
			typeof current !== "object" ||
			(current.id === undefined && current.name === undefined)
		) {
			return "missing";
		}

		/* OUTDATED: compare what is in the cart with the live product */

		const currentName =
			typeof current.name === "string" ? current.name.trim() : "";

		if (currentName && currentName !== item.title.trim()) {
			return "outdated";
		}

		if (current.selling_price !== undefined) {
			const currentPrice = toNumber(current.selling_price, item.price);

			if (Math.abs(currentPrice - item.price) > 0.001) {
				return "outdated";
			}
		}

		if (
			current.customize_reqs !== undefined &&
			reqsSignature(current.customize_reqs) !== item.customizeReqsSig
		) {
			return "outdated";
		}

		return "ok";
	} catch (error) {
		console.error("Product check failed:", error);

		return "unknown";
	}
}

/* ============================================================================
   FORMAT CUSTOMIZATION KEY
============================================================================ */

function formatCustomizationKey(key: string): string {
	return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

/* ============================================================================
   CART PAGE
============================================================================ */

export default function CartPage() {
	return <CartView />;
}

/* ============================================================================
   CART VIEW
============================================================================ */

function CartView() {
	const router = useRouter();

	const [items, setItems] = useState<CartItem[]>([]);

	const [loading, setLoading] = useState(true);

	const [error, setError] = useState("");

	const [serverSubtotal, setServerSubtotal] = useState(0);

	const [updatingItemIds, setUpdatingItemIds] = useState<Set<string>>(
		new Set(),
	);

	const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>(
		{},
	);

	/* productId -> status */
	const [productStatuses, setProductStatuses] = useState<
		Record<string, ProductStatus>
	>({});

	const itemsRef = useRef<CartItem[]>(items);

	itemsRef.current = items;

	/* ==========================================================================
	   PRODUCT STATUS CHECK

	   Re-runs only when a product, its price, name or customization
	   settings change, not when only a quantity changes.
	========================================================================== */

	const checkKey = useMemo(
		() =>
			Array.from(
				new Set(
					items
						.filter((item) => item.productId)
						.map(
							(item) =>
								`${item.productId}|${item.price}|${item.title}|${item.customizeReqsSig}`,
						),
				),
			)
				.sort()
				.join("~"),
		[items],
	);

	useEffect(() => {
		if (!checkKey) {
			return;
		}

		let cancelled = false;

		const unique = new Map<string, CartItem>();

		itemsRef.current.forEach((item) => {
			if (item.productId && !unique.has(item.productId)) {
				unique.set(item.productId, item);
			}
		});

		Promise.all(
			Array.from(unique.entries()).map(
				async ([productId, item]) =>
					[productId, await checkProductStatus(item)] as const,
			),
		).then((results) => {
			if (cancelled) {
				return;
			}

			setProductStatuses((previous) => ({
				...previous,
				...Object.fromEntries(results),
			}));
		});

		return () => {
			cancelled = true;
		};
	}, [checkKey]);

	const statusOf = (item: CartItem): ProductStatus | undefined =>
		item.productId ? productStatuses[item.productId] : undefined;

	const hasMissingProducts = items.some((item) => statusOf(item) === "missing");

	/* ==========================================================================
	   ERROR
	========================================================================== */

	const showError = (message: string) => {
		setError(message);

		setTimeout(() => {
			setError("");
		}, 3000);
	};

	/* ==========================================================================
	   FETCH CART
	========================================================================== */

	const fetchCart = async () => {
		setLoading(true);
		setError("");

		try {
			const response = await fetch("/api/cart", {
				method: "GET",
				credentials: "include",
				cache: "no-store",
			});

			const data: CartResponse = await response
				.json()
				.catch(() => ({}) as CartResponse);

			console.log("CART RESPONSE:", data);

			if (!response.ok) {
				throw new Error(
					data?.message ?? "Unable to load your cart. Please try again.",
				);
			}

			const rawItems = Array.isArray(data.cart) ? data.cart : [];

			const normalizedItems = rawItems
				.map(normalizeCartItem)
				.filter((item): item is CartItem => item !== null);

			console.log("NORMALIZED CART:", normalizedItems);

			setItems(normalizedItems);

			const inputs: Record<string, string> = {};

			for (const item of normalizedItems) {
				inputs[item.cartItemId] = String(item.quantity);
			}

			setQuantityInputs(inputs);

			setServerSubtotal(toNumber(data.total_price, 0));

		} catch (err) {
			console.error("Fetch cart failed:", err);

			setError(
				err instanceof Error
					? err.message
					: "Unable to load your cart. Please try again.",
			);
		} finally {
			setLoading(false);
		}
	};

	/* ==========================================================================
	   INITIAL LOAD
	========================================================================== */

	useEffect(() => {
		fetchCart();
	}, []);

	/* ==========================================================================
	   TOTALS
	========================================================================== */

	const localSubtotal = items.reduce(
		(sum, item) => sum + item.price * item.quantity,
		0,
	);

	const totalProducts = items.reduce((total, item) => total + item.quantity, 0);

	/*
	 * Only the product subtotal is shown here. Delivery is NOT included
	 * because the customer has not chosen a delivery method yet; it is
	 * calculated at checkout.
	 */

	const subtotal = items.length > 0 ? serverSubtotal || localSubtotal : 0;

	/* ==========================================================================
	   UPDATE CART

	   cart_item_id identifies the actual cart row.
	   NEVER use productId here.
	========================================================================== */

	const updateCart = async (
		item: CartItem,
		action: "increase" | "decrease" | "set",
		newQuantity?: number,
	) => {
		const cartItemId = item.cartItemId;

		if (updatingItemIds.has(cartItemId)) {
			return;
		}

		if (
			action === "set" &&
			(newQuantity === undefined ||
				!Number.isInteger(newQuantity) ||
				newQuantity < 0)
		) {
			showError("Please enter a valid quantity.");

			return;
		}

		const previousQuantity = item.quantity;

		let optimisticQuantity = previousQuantity;

		if (action === "increase") {
			optimisticQuantity = previousQuantity + 1;
		}

		if (action === "decrease") {
			optimisticQuantity = Math.max(0, previousQuantity - 1);
		}

		if (action === "set") {
			optimisticQuantity = newQuantity!;
		}

		/* MARK ITEM AS UPDATING */

		setUpdatingItemIds((previous) => {
			const next = new Set(previous);

			next.add(cartItemId);

			return next;
		});

		/* OPTIMISTIC UI */

		if (optimisticQuantity === 0) {
			setItems((previous) =>
				previous.filter((current) => current.cartItemId !== cartItemId),
			);

			setQuantityInputs((previous) => {
				const next = {
					...previous,
				};

				delete next[cartItemId];

				return next;
			});
		} else {
			setItems((previous) =>
				previous.map((current) =>
					current.cartItemId === cartItemId
						? {
								...current,
								quantity: optimisticQuantity,
							}
						: current,
				),
			);

			setQuantityInputs((previous) => ({
				...previous,
				[cartItemId]: String(optimisticQuantity),
			}));
		}

		/* BACKEND REQUEST */

		try {
			const formData = new FormData();

			formData.append("cart_item_id", cartItemId);

			formData.append("action", action);

			if (action === "set") {
				formData.append("quantity", String(newQuantity));
			}

			console.log("UPDATE CART REQUEST:", {
				cart_item_id: cartItemId,
				action,
				quantity: action === "set" ? newQuantity : undefined,
			});

			const response = await fetch("/api/cart/update_cart", {
				method: "POST",
				credentials: "include",
				body: formData,
			});

			const data = await response.json().catch(() => ({}));

			console.log("UPDATE CART RESPONSE:", data);

			if (!response.ok) {
				throw new Error(
					data?.message ?? "Unable to update cart. Please try again.",
				);
			}

			await fetchCart();
		} catch (err) {
			console.error("Cart update failed:", err);

			/* Restore previous quantity */

			setItems((previous) => {
				const exists = previous.some(
					(current) => current.cartItemId === cartItemId,
				);

				if (!exists) {
					return [
						...previous,
						{
							...item,
							quantity: previousQuantity,
						},
					];
				}

				return previous.map((current) =>
					current.cartItemId === cartItemId
						? {
								...current,
								quantity: previousQuantity,
							}
						: current,
				);
			});

			setQuantityInputs((previous) => ({
				...previous,
				[cartItemId]: String(previousQuantity),
			}));

			showError(err instanceof Error ? err.message : "Unable to update cart.");
		} finally {
			setUpdatingItemIds((previous) => {
				const next = new Set(previous);

				next.delete(cartItemId);

				return next;
			});
		}
	};

	/* ==========================================================================
	   INCREASE / DECREASE
	========================================================================== */

	const handleIncrease = (item: CartItem) => {
		updateCart(item, "increase");
	};

	const handleDecrease = (item: CartItem) => {
		updateCart(item, "decrease");
	};

	/* ==========================================================================
	   QUANTITY INPUT
	========================================================================== */

	const handleSetQuantity = (item: CartItem, value: string) => {
		if (value === "") {
			setQuantityInputs((previous) => ({
				...previous,
				[item.cartItemId]: "",
			}));

			return;
		}

		if (!/^\d+$/.test(value)) {
			return;
		}

		setQuantityInputs((previous) => ({
			...previous,
			[item.cartItemId]: value,
		}));
	};

	/* ==========================================================================
	   COMMIT QUANTITY
	========================================================================== */

	const commitQuantity = (item: CartItem) => {
		const rawValue = quantityInputs[item.cartItemId];

		if (rawValue === undefined || rawValue.trim() === "") {
			setQuantityInputs((previous) => ({
				...previous,
				[item.cartItemId]: String(item.quantity),
			}));

			return;
		}

		const quantity = Number(rawValue);

		if (!Number.isInteger(quantity) || quantity < 0) {
			setQuantityInputs((previous) => ({
				...previous,
				[item.cartItemId]: String(item.quantity),
			}));

			showError("Quantity must be a positive number or 0.");

			return;
		}

		if (quantity === item.quantity) {
			return;
		}

		/* A deleted product can only be removed, not increased */
		if (statusOf(item) === "missing" && quantity > item.quantity) {
			setQuantityInputs((previous) => ({
				...previous,
				[item.cartItemId]: String(item.quantity),
			}));

			showError("This product is no longer available.");

			return;
		}

		updateCart(item, "set", quantity);
	};

	/* ==========================================================================
	   KEYBOARD
	========================================================================== */

	const handleQuantityKeyDown = (
		event: React.KeyboardEvent<HTMLInputElement>,
		item: CartItem,
	) => {
		if (event.key === "Enter") {
			event.currentTarget.blur();
		}

		if (event.key === "Escape") {
			setQuantityInputs((previous) => ({
				...previous,
				[item.cartItemId]: String(item.quantity),
			}));

			event.currentTarget.blur();
		}
	};

	/* ==========================================================================
	   REMOVE
	========================================================================== */

	const handleRemove = (item: CartItem) => {
		updateCart(item, "set", 0);
	};

	/* ==========================================================================
	   CLEAR CART
	========================================================================== */

	const handleClearCart = async () => {
		if (items.length === 0) {
			return;
		}

		const confirmed = window.confirm(
			"Are you sure you want to clear your cart?",
		);

		if (!confirmed) {
			return;
		}

		const previousItems = [...items];

		const previousQuantityInputs = { ...quantityInputs };

		const previousServerSubtotal = serverSubtotal;

		setItems([]);

		setQuantityInputs({});

		try {
			/*
			 * /api/clear_cart takes no body: the backend identifies
			 * which cart to clear from the forwarded cookies alone.
			 */

			const response = await fetch("/api/clear_cart", {
				method: "POST",
				credentials: "include",
				cache: "no-store",
			});

			const data = await response.json().catch(() => ({}));

			console.log("CLEAR CART RESPONSE:", data);

			if (!response.ok) {
				throw new Error(data?.message ?? "Unable to clear the cart.");
			}

			setServerSubtotal(0);

		} catch (err) {
			console.error("Clear cart failed:", err);

			setItems(previousItems);

			setQuantityInputs(previousQuantityInputs);

			setServerSubtotal(previousServerSubtotal);

			showError(
				err instanceof Error ? err.message : "Unable to clear your cart.",
			);
		}
	};

	/* ==========================================================================
	   CHECKOUT
	========================================================================== */

	const handleCheckout = () => {
		if (items.length === 0) {
			return;
		}

		if (hasMissingProducts) {
			showError(
				"Please remove the unavailable products from your cart to continue.",
			);

			return;
		}

		router.push("/checkout");
	};

	/* ==========================================================================
	   LOADING
	========================================================================== */

	if (loading) {
		return (
			<main
				className="min-h-screen bg-[#FBF9F7] pt-[112px]
					sm:pt-[120px]"
			>
				<div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-4xl items-center justify-center px-5 py-12 sm:px-6">
					<div className="flex flex-col items-center gap-3">
						<span className="h-8 w-8 animate-spin rounded-full border-2 border-[#85161B]/25 border-t-[#85161B]" />

						<p className="text-sm text-[#2E2E2E]/50">Loading your cart...</p>
					</div>
				</div>
			</main>
		);
	}

	/* ==========================================================================
	   ERROR
	========================================================================== */

	if (error && items.length === 0) {
		return (
			<main
				className="min-h-screen bg-[#FBF9F7] pt-[112px]
					sm:pt-[120px]"
			>
				<div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-4xl items-center justify-center px-5 py-12 sm:px-6">
					<div className="w-full rounded-3xl border border-red-200 bg-white px-6 py-14 text-center shadow-[0_12px_45px_rgba(80,40,20,0.06)] sm:px-12">
						<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
							<AlertCircle
								size={32}
								className="text-red-500"
								strokeWidth={1.7}
							/>
						</div>

						<h1 className="mt-6 text-2xl font-bold tracking-tight text-[#2E2E2E]">
							Couldn&apos;t load your cart
						</h1>

						<p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#2E2E2E]/55">
							{error}
						</p>

						<button
							type="button"
							onClick={fetchCart}
							className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#85161B] px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#721318] hover:shadow-lg"
						>
							Try again
						</button>
					</div>
				</div>
			</main>
		);
	}

	/* ==========================================================================
	   EMPTY CART
	========================================================================== */

	if (items.length === 0) {
		return (
			<main
				className="min-h-screen bg-[#FBF9F7] pt-[112px]
					sm:pt-[120px]"
			>
				<div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-4xl items-center justify-center px-5 py-12 sm:px-6">
					<div className="w-full rounded-3xl border border-[#E8DED7] bg-white px-6 py-14 text-center shadow-[0_12px_45px_rgba(80,40,20,0.06)] sm:px-12">
						<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#F7D6BF]/40">
							<ShoppingBag
								size={32}
								className="text-[#85161B]"
								strokeWidth={1.7}
							/>
						</div>

						<p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-[#85161B]">
							Your Cart
						</p>

						<h1 className="mt-2 text-3xl font-bold tracking-tight text-[#2E2E2E] sm:text-4xl">
							Nothing here yet.
						</h1>

						<p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#2E2E2E]/55">
							Looks like you haven&apos;t added anything to your cart. Find
							something special and make it personal.
						</p>

						<Link
							href="/shop"
							className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#85161B] px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#721318] hover:shadow-lg"
						>
							Continue Shopping
							<ArrowRight size={17} />
						</Link>
					</div>
				</div>
			</main>
		);
	}

	/* ==========================================================================
	   CART PAGE
	========================================================================== */

	return (
		<main
			className="min-h-screen bg-[#FBF9F7] pt-[112px]
					sm:pt-[120px]"
		>
			{/* PAGE HEADER */}

			<section className="border-b border-[#E8DED7] bg-white">
				<div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
					<Link
						href="/shop"
						className="inline-flex items-center gap-2 text-sm font-medium text-[#2E2E2E]/55 transition-colors hover:text-[#85161B]"
					>
						<ArrowLeft size={16} />
						Continue Shopping
					</Link>

					<div className="mt-6">
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#85161B]">
							Shopping Bag
						</p>

						<h1 className="mt-1 text-3xl font-bold tracking-tight text-[#2E2E2E] sm:text-4xl">
							Your Cart
						</h1>

						<p className="mt-2 text-sm text-[#2E2E2E]/50">
							{totalProducts} {totalProducts === 1 ? "product" : "products"} in
							your cart
						</p>
					</div>
				</div>
			</section>

			{/* ERROR */}

			{error && (
				<div className="mx-auto mt-5 max-w-7xl px-5 sm:px-6 lg:px-8">
					<div
						role="alert"
						className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
					>
						{error}
					</div>
				</div>
			)}

			{/* CONTENT */}

			<section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8 lg:py-10">
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
					{/* LEFT */}

					<div>
						<div className="overflow-hidden rounded-2xl border border-[#E8DED7] bg-white">
							{/* HEADER */}

							<div className="flex items-center justify-between border-b border-[#E8DED7] px-5 py-4 sm:px-6">
								<h2 className="font-semibold text-[#2E2E2E]">Cart Items</h2>

								<button
									type="button"
									onClick={handleClearCart}
									className="text-xs font-medium text-[#2E2E2E]/45 transition-colors hover:text-[#85161B]"
								>
									Clear cart
								</button>
							</div>

							{/* PRODUCTS */}

							<div className="divide-y divide-[#E8DED7]">
								{items.map((item) => {
									const isUpdating = updatingItemIds.has(item.cartItemId);

									const status = statusOf(item);

									const isMissing = status === "missing";

									const isOutdated = status === "outdated";

									const itemTotal = item.price * item.quantity;

									const customizationEntries = Object.entries(
										item.customization,
									).filter(
										([, value]) =>
											!looksLikeImageFilename(cleanCustomizationValue(value)) &&
											!/\[[\s\S]*\]/.test(value),
									);

									const selectedVariantEntries = Object.entries(
										item.selectedVariants,
									);

									return (
										<div key={item.cartItemId} className="p-5 sm:p-6">
											<div className="flex gap-4 sm:gap-5">
												{/* PRODUCT IMAGE */}

												<div
													className={`h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#F7F3F0] sm:h-28 sm:w-28 ${
														isMissing ? "opacity-50 grayscale" : ""
													}`}
												>
													{item.image ? (
														// eslint-disable-next-line @next/next/no-img-element
														<img
															src={item.image}
															alt={item.title}
															className="h-full w-full object-cover"
															onError={(event) => {
																event.currentTarget.style.display = "none";
															}}
														/>
													) : (
														<div className="flex h-full w-full items-center justify-center">
															<ShoppingBag
																size={25}
																className="text-[#85161B]/30"
															/>
														</div>
													)}
												</div>

												{/* DETAILS */}

												<div className="min-w-0 flex-1">
													<div className="flex items-start justify-between gap-3">
														<div className="min-w-0">
															<div className="flex flex-wrap items-center gap-2">
																<h3
																	className={`font-semibold ${
																		isMissing
																			? "text-[#2E2E2E]/50"
																			: "text-[#2E2E2E]"
																	}`}
																>
																	{item.title}
																</h3>

																{isOutdated && (
																	<span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
																		<AlertTriangle size={12} />
																		Outdated product
																	</span>
																)}

																{isMissing && (
																	<span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700">
																		<PackageX size={12} />
																		Product not found
																	</span>
																)}
															</div>

															{item.description && (
																<p className="mt-1 line-clamp-2 text-xs leading-5 text-[#2E2E2E]/45">
																	{item.description}
																</p>
															)}

															<div className="mt-2 flex flex-wrap items-center gap-2">
																<span className="text-sm font-medium text-[#85161B]">
																	₹{item.price.toFixed(2)}
																</span>

																{item.marketPrice > item.price && (
																	<span className="text-xs text-[#2E2E2E]/35 line-through">
																		₹{item.marketPrice.toFixed(2)}
																	</span>
																)}
															</div>

															{/* SELECTED VARIANTS */}

															{selectedVariantEntries.length > 0 && (
																<div className="mt-2.5 flex flex-wrap gap-1.5">
																	{selectedVariantEntries.map(
																		([variantName, optionName]) => (
																			<span
																				key={variantName}
																				className="inline-flex items-center gap-1 rounded-full border border-[#E8DED7] bg-[#FBF9F7] px-2.5 py-1 text-[11px] font-medium text-[#2E2E2E]/70"
																			>
																				<span className="font-semibold text-[#85161B]">
																					{variantName}:
																				</span>
																				{optionName}
																			</span>
																		),
																	)}
																</div>
															)}
														</div>

														{/* DELETE */}

														<button
															type="button"
															disabled={isUpdating}
															onClick={() => handleRemove(item)}
															aria-label={`Remove ${item.title}`}
															className="shrink-0 rounded-lg p-2 text-[#2E2E2E]/35 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
														>
															<Trash2 size={17} />
														</button>
													</div>

													{/* PRODUCT STATUS NOTICE */}

													{isMissing && (
														<div
															role="alert"
															className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5"
														>
															<PackageX
																size={15}
																className="mt-0.5 shrink-0 text-red-600"
															/>

															<p className="text-xs leading-5 text-red-700">
																This product is no longer available. It may have
																been deleted by the store. Please remove it from
																your cart to continue.
															</p>
														</div>
													)}

													{isOutdated && (
														<div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
															<AlertTriangle
																size={15}
																className="mt-0.5 shrink-0 text-amber-600"
															/>

															<p className="text-xs leading-5 text-amber-800">
																The store has updated this product since you
																added it. Please review the price and options
																before checking out.
															</p>
														</div>
													)}

													{/* CUSTOMIZATION IMAGES */}

													{item.customizationImages.length > 0 && (
														<div className="mt-4">
															<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#85161B]">
																Uploaded Images
															</p>

															<div className="mt-2 flex flex-wrap gap-2">
																{item.customizationImages.map((image) => (
																	<a
																		key={image.key}
																		href={image.url}
																		target="_blank"
																		rel="noopener noreferrer"
																		className="block h-16 w-16 overflow-hidden rounded-lg border border-[#E8DED7] bg-[#F7F3F0] transition hover:border-[#85161B]/40 hover:shadow-sm"
																		title="View uploaded image"
																	>
																		{/* eslint-disable-next-line @next/next/no-img-element */}
																		<img
																			src={image.url}
																			alt="Uploaded customization"
																			className="h-full w-full object-cover"
																			onError={(event) => {
																				event.currentTarget.style.display =
																					"none";
																			}}
																		/>
																	</a>
																))}
															</div>
														</div>
													)}

													{/* TEXT CUSTOMIZATION */}

													{customizationEntries.length > 0 && (
														<div className="mt-4 rounded-lg bg-[#FBF9F7] px-3 py-2.5">
															<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#85161B]">
																Customization
															</p>

															<div className="mt-1 space-y-0.5">
																{customizationEntries.map(([key, value]) => (
																	<p
																		key={key}
																		className="text-xs leading-5 text-[#2E2E2E]/60"
																	>
																		<span className="font-medium text-[#2E2E2E]">
																			{formatCustomizationKey(key)}:
																		</span>{" "}
																		{cleanCustomizationValue(value)}
																	</p>
																))}
															</div>
														</div>
													)}

													{/* QUANTITY */}

													<div className="mt-4 flex items-center justify-between gap-3">
														<div className="flex items-center rounded-lg border border-[#DED6D0]">
															<button
																type="button"
																disabled={isUpdating}
																onClick={() => handleDecrease(item)}
																aria-label={`Decrease quantity of ${item.title}`}
																className="flex h-9 w-9 items-center justify-center text-[#2E2E2E]/60 transition hover:bg-[#FBF9F7] disabled:cursor-not-allowed disabled:opacity-30"
															>
																<Minus size={14} />
															</button>

															<div className="relative flex h-9 w-14 items-center justify-center border-x border-[#DED6D0]">
																{isUpdating ? (
																	<span className="h-3 w-3 animate-spin rounded-full border-2 border-[#85161B]/25 border-t-[#85161B]" />
																) : (
																	<input
																		type="text"
																		inputMode="numeric"
																		value={
																			quantityInputs[item.cartItemId] ??
																			String(item.quantity)
																		}
																		onChange={(event) =>
																			handleSetQuantity(
																				item,
																				event.target.value,
																			)
																		}
																		onBlur={() => commitQuantity(item)}
																		onKeyDown={(event) =>
																			handleQuantityKeyDown(event, item)
																		}
																		aria-label={`Quantity for ${item.title}`}
																		className="h-full w-full bg-transparent text-center text-sm font-medium text-[#2E2E2E] outline-none"
																	/>
																)}
															</div>

															<button
																type="button"
																disabled={isUpdating || isMissing}
																onClick={() => handleIncrease(item)}
																aria-label={`Increase quantity of ${item.title}`}
																className="flex h-9 w-9 items-center justify-center text-[#2E2E2E]/60 transition hover:bg-[#FBF9F7] disabled:cursor-not-allowed disabled:opacity-30"
															>
																<Plus size={14} />
															</button>
														</div>

														<p
															className={`font-semibold ${
																isMissing
																	? "text-[#2E2E2E]/35 line-through"
																	: "text-[#85161B]"
															}`}
														>
															₹{itemTotal.toFixed(2)}
														</p>
													</div>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</div>

						{/* TRUST FEATURES */}

						<div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
							<div className="flex items-center gap-3 rounded-xl border border-[#E8DED7] bg-white p-4">
								<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F7D6BF]/40">
									<Truck size={17} className="text-[#85161B]" />
								</div>

								<div>
									<p className="text-xs font-semibold text-[#2E2E2E]">
										Reliable Delivery
									</p>

									<p className="mt-0.5 text-[11px] text-[#2E2E2E]/50">
										Delivered safely to your doorstep
									</p>
								</div>
							</div>

							<div className="flex items-center gap-3 rounded-xl border border-[#E8DED7] bg-white p-4">
								<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F7D6BF]/40">
									<ShieldCheck size={17} className="text-[#85161B]" />
								</div>

								<div>
									<p className="text-xs font-semibold text-[#2E2E2E]">
										Secure Checkout
									</p>

									<p className="mt-0.5 text-[11px] text-[#2E2E2E]/50">
										Your information is protected
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* ORDER SUMMARY */}

					<aside className="lg:sticky lg:top-24 lg:self-start">
						<div className="rounded-2xl border border-[#E8DED7] bg-white p-5 shadow-[0_10px_35px_rgba(80,40,20,0.05)] sm:p-6">
							<h2 className="text-lg font-semibold text-[#2E2E2E]">
								Order Summary
							</h2>

							<div className="mt-6 space-y-4 text-sm">
								<div className="flex justify-between text-[#2E2E2E]/60">
									<span>Subtotal</span>

									<span>₹{subtotal.toFixed(2)}</span>
								</div>

								<div className="flex items-start justify-between gap-4 text-[#2E2E2E]/60">
									<span>Delivery</span>

									<span className="text-right text-xs font-medium leading-5 text-[#2E2E2E]/50">
										Calculated at checkout
									</span>
								</div>

								<div className="border-t border-[#E8DED7] pt-4">
									<div className="flex items-end justify-between">
										<div>
											<p className="font-semibold text-[#2E2E2E]">Total</p>

											<p className="mt-1 text-[11px] text-[#2E2E2E]/40">
												Excluding delivery
											</p>
										</div>

										<p className="text-2xl font-bold text-[#85161B]">
											₹{subtotal.toFixed(2)}
										</p>
									</div>
								</div>
							</div>

							<p className="mt-4 rounded-lg bg-[#FBF9F7] px-3 py-2.5 text-[11px] leading-5 text-[#2E2E2E]/50">
								Delivery charges depend on the delivery method you choose and are
								added at checkout.
							</p>

							{hasMissingProducts && (
								<div
									role="alert"
									className="mt-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5"
								>
									<PackageX
										size={15}
										className="mt-0.5 shrink-0 text-red-600"
									/>

									<p className="text-xs leading-5 text-red-700">
										Some products in your cart are no longer available. Remove
										them to continue to checkout.
									</p>
								</div>
							)}

							<button
								type="button"
								onClick={handleCheckout}
								disabled={hasMissingProducts}
								className="group mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#85161B] py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#721318] hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
							>
								Proceed to Checkout
								<ArrowRight
									size={17}
									className="transition-transform group-hover:translate-x-1"
								/>
							</button>

							<Link
								href="/shop"
								className="mt-3 flex w-full items-center justify-center rounded-xl border border-[#DED6D0] py-3 text-sm font-medium text-[#2E2E2E]/70 transition-colors hover:border-[#85161B]/30 hover:text-[#85161B]"
							>
								Continue Shopping
							</Link>

							<p className="mt-5 text-center text-[11px] leading-5 text-[#2E2E2E]/40">
								By proceeding to checkout, you agree to our terms and
								conditions.
							</p>
						</div>
					</aside>
				</div>
			</section>
		</main>
	);
}