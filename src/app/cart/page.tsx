"use client";

import React, { useEffect, useState } from "react";
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
} from "lucide-react";

/* ============================================================================
   CONSTANTS
============================================================================ */

const BACKEND_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL ||
	"https://api.printinghouseujjain.in";

const PRODUCT_IMAGE_BASE_URL =
	`${BACKEND_URL}/assets/products/`;

const UPLOAD_IMAGE_BASE_URL =
	`${BACKEND_URL}/assets/uploads/`;

/* ============================================================================
   TYPES
============================================================================ */

type Customization = Record<string, string>;

type SelectedVariants = Record<string, string>;

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
	 *
	 * Only present when the backend includes selected_variants
	 * on this cart row (i.e. the product has variants and the
	 * customer picked one).
	 */
	selectedVariants: SelectedVariants;

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

	customization?:
		| string
		| Record<string, string>;

	/*
	 * Backend sends the variants selected for this cart row as a
	 * JSON-encoded object string, e.g.
	 *
	 * "{\"3 In 1 Set\":\"Black Colour with Golden Pen And Metal Keychain\"}"
	 */
	selected_variants?:
		| string
		| Record<string, string>;
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
 *
 * Handles:
 * 249
 * "249"
 * "249.00"
 * undefined
 * null
 * invalid strings
 */
function toNumber(
	value: unknown,
	fallback = 0,
): number {
	const number = Number(value);

	return Number.isFinite(number)
		? number
		: fallback;
}

/**
 * Safely parse JSON.
 *
 * The backend can send JSON fields as strings:
 *
 * "[]"
 *
 * or
 *
 * "[\"a.png\",\"b.png\"]"
 *
 * or
 *
 * "{\"frontname\":\"Nalla\"}"
 *
 * This helper prevents JSON.parse from crashing
 * the entire page.
 */
function safeJsonParse<T>(
	value: unknown,
	fallback: T,
): T {
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

/* ============================================================================
   PARSE CUSTOMIZATION
============================================================================ */

function parseCustomization(
	value?:
		| string
		| Record<string, string>,
): Customization {
	if (!value) {
		return {};
	}

	/*
	 * Already an object.
	 */
	if (typeof value === "object") {
		return value;
	}

	const trimmed = value.trim();

	/*
	 * Backend sends:
	 *
	 * "No customization."
	 *
	 * This is not JSON.
	 */
	if (
		!trimmed ||
		trimmed.toLowerCase() ===
			"no customization."
	) {
		return {};
	}

	/*
	 * Backend sends:
	 *
	 * "{\"frontname\":\"...\",\"insidename\":\"...\"}"
	 */
	const parsed = safeJsonParse<
		Record<string, unknown> | null
	>(trimmed, null);

	if (
		parsed &&
		typeof parsed === "object" &&
		!Array.isArray(parsed)
	) {
		const result: Customization = {};

		Object.entries(parsed).forEach(
			([key, itemValue]) => {
				if (
					itemValue !== null &&
					itemValue !== undefined
				) {
					result[key] = String(itemValue);
				}
			},
		);

		return result;
	}

	return {};
}

/* ============================================================================
   PARSE SELECTED VARIANTS
============================================================================ */

/**
 * Backend sends the variants chosen for this cart row as a JSON-encoded
 * object string, e.g.
 *
 * "{\"3 In 1 Set\":\"Black Colour with Golden Pen And Metal Keychain\"}"
 *
 * which maps variant name -> chosen option name. Products without
 * variants simply omit this field entirely.
 */
function parseSelectedVariants(
	value?:
		| string
		| Record<string, string>,
): SelectedVariants {
	if (!value) {
		return {};
	}

	if (typeof value === "object") {
		const result: SelectedVariants = {};

		Object.entries(value).forEach(
			([key, itemValue]) => {
				if (
					itemValue !== null &&
					itemValue !== undefined
				) {
					result[key] = String(itemValue);
				}
			},
		);

		return result;
	}

	const trimmed = value.trim();

	if (!trimmed) {
		return {};
	}

	const parsed = safeJsonParse<
		Record<string, unknown> | null
	>(trimmed, null);

	if (
		parsed &&
		typeof parsed === "object" &&
		!Array.isArray(parsed)
	) {
		const result: SelectedVariants = {};

		Object.entries(parsed).forEach(
			([key, itemValue]) => {
				if (
					itemValue !== null &&
					itemValue !== undefined
				) {
					result[key] = String(itemValue);
				}
			},
		);

		return result;
	}

	return {};
}

/* ============================================================================
   CLEAN CUSTOMIZATION VALUE
============================================================================ */

/**
 * Converts:
 *
 * "Name To be Printed on Front Side = Nalla"
 *
 * into:
 *
 * "Nalla"
 *
 * Also handles:
 *
 * "Upload Up to 4 Photos = [\"file1.jpg\",\"file2.png\"]"
 */
function cleanCustomizationValue(
	value: string,
): string {
	if (!value) {
		return "";
	}

	const trimmed = value.trim();

	/*
	 * Try to detect an embedded array.
	 */
	const arrayMatch =
		trimmed.match(/\[[\s\S]*\]/);

	if (arrayMatch) {
		const parsed =
			safeJsonParse<unknown[] | null>(
				arrayMatch[0],
				null,
			);

		if (Array.isArray(parsed)) {
			return parsed
				.filter(
					(item): item is string =>
						typeof item === "string",
				)
				.join(", ");
		}
	}

	/*
	 * Remove everything before "=".
	 */
	if (trimmed.includes("=")) {
		return trimmed
			.split("=")
			.slice(1)
			.join("=")
			.trim();
	}

	return trimmed;
}

/* ============================================================================
   CHECK IMAGE FILENAME
============================================================================ */

function looksLikeImageFilename(
	value: string,
): boolean {
	if (!value) {
		return false;
	}

	const filename = value
		.trim()
		.replace(/^["']|["']$/g, "")
		.replace(/^\[|\]$/g, "");

	return /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(
		filename,
	);
}

/* ============================================================================
   EXTRACT CUSTOMIZATION IMAGES
============================================================================ */

function extractCustomizationImages(
	customization: Customization,
): UploadedCustomizationImage[] {
	const images: UploadedCustomizationImage[] =
		[];

	Object.entries(customization).forEach(
		([key, rawValue]) => {
			if (!rawValue) {
				return;
			}

			const value = rawValue.trim();

			/*
			 * ---------------------------------------------------------------
			 * CASE 1:
			 * Direct filename
			 * ---------------------------------------------------------------
			 */

			const cleanedValue =
				cleanCustomizationValue(value);

			/*
			 * ---------------------------------------------------------------
			 * CASE 2:
			 *
			 * "Upload Up to 4 Photos = [\"a.jpg\",\"b.jpg\"]"
			 * ---------------------------------------------------------------
			 */

			const arrayMatch =
				value.match(/\[[\s\S]*\]/);

			if (arrayMatch) {
				const parsed =
					safeJsonParse<unknown[] | null>(
						arrayMatch[0],
						null,
					);

				if (Array.isArray(parsed)) {
					parsed.forEach(
						(filename, index) => {
							if (
								typeof filename !==
								"string"
							) {
								return;
							}

							const cleanFilename =
								filename
									.trim()
									.replace(
										/^["']|["']$/g,
										"",
									);

							if (
								!cleanFilename ||
								!looksLikeImageFilename(
									cleanFilename,
								)
							) {
								return;
							}

							images.push({
								key: `${key}-${index}`,
								filename:
									cleanFilename,
								url:
									`${UPLOAD_IMAGE_BASE_URL}${encodeURIComponent(
										cleanFilename,
									)}`,
							});
						},
					);

					return;
				}
			}

			/*
			 * ---------------------------------------------------------------
			 * CASE 3:
			 *
			 * Single image filename.
			 * ---------------------------------------------------------------
			 */

			if (
				looksLikeImageFilename(
					cleanedValue,
				)
			) {
				images.push({
					key,
					filename: cleanedValue,
					url:
						`${UPLOAD_IMAGE_BASE_URL}${encodeURIComponent(
							cleanedValue,
						)}`,
				});
			}
		},
	);

	/*
	 * Remove duplicates.
	 */
	return images.filter(
		(image, index, array) =>
			array.findIndex(
				(current) =>
					current.filename ===
					image.filename,
			) === index,
	);
}

/* ============================================================================
   GET PRODUCT IMAGE
============================================================================ */

function getProductImage(
	photoPath?: string,
): string | undefined {
	if (!photoPath) {
		return undefined;
	}

	if (
		photoPath.startsWith("http://") ||
		photoPath.startsWith("https://")
	) {
		return photoPath;
	}

	const cleanPath =
		photoPath.replace(/^\/+/, "");

	return `${PRODUCT_IMAGE_BASE_URL}${cleanPath}`;
}

/* ============================================================================
   NORMALIZE CART ITEM
============================================================================ */

function normalizeCartItem(
	raw: RawCartItem,
): CartItem | null {
	/*
	 * cart_item_id is the UNIQUE cart row.
	 *
	 * Product id may be duplicated.
	 *
	 * Example:
	 *
	 * Product:
	 * id = 2
	 *
	 * Cart rows:
	 * cart_item_id = 38
	 * cart_item_id = 36
	 * cart_item_id = 35
	 *
	 * Therefore we MUST use cart_item_id
	 * as the React key and for cart updates.
	 */

	if (
		raw.cart_item_id ===
			undefined ||
		raw.cart_item_id === null
	) {
		console.error(
			"Cart item is missing cart_item_id:",
			raw,
		);

		return null;
	}

	const cartItemId = String(
		raw.cart_item_id,
	);

	const quantity = Math.max(
		1,
		Math.floor(
			toNumber(
				raw.quantity,
				1,
			),
		),
	);

	const customization =
		parseCustomization(
			raw.customization,
		);

	const customizationImages =
		extractCustomizationImages(
			customization,
		);

	const selectedVariants =
		parseSelectedVariants(
			raw.selected_variants,
		);

	return {
		cartItemId,

		productId:
			raw.id !== undefined &&
			raw.id !== null
				? String(raw.id)
				: undefined,

		title:
			raw.name ??
			"Untitled product",

		description:
			raw.description ??
			"",

		price: toNumber(
			raw.selling_price,
			0,
		),

		marketPrice: toNumber(
			raw.market_price,
			0,
		),

		resellerPrice: toNumber(
			raw.reseller_price,
			0,
		),

		quantity,

		image: getProductImage(
			raw.primary_photo_path,
		),

		delivery: toNumber(
			raw.delivery,
			0,
		),

		customization,

		customizationImages,

		selectedVariants,

		inStock:
			raw.in_stock ??
			"available",
	};
}

/* ============================================================================
   FORMAT CUSTOMIZATION KEY
============================================================================ */

function formatCustomizationKey(
	key: string,
): string {
	return key
		.replace(/_/g, " ")
		.replace(
			/\b\w/g,
			(char) => char.toUpperCase(),
		);
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

	const [items, setItems] =
		useState<CartItem[]>([]);

	const [loading, setLoading] =
		useState(true);

	const [error, setError] =
		useState("");

	const [deliveryFee, setDeliveryFee] =
		useState(0);

	const [
		serverSubtotal,
		setServerSubtotal,
	] = useState(0);

	const [
		serverGrandTotal,
		setServerGrandTotal,
	] = useState(0);

	const [
		updatingItemIds,
		setUpdatingItemIds,
	] = useState<Set<string>>(
		new Set(),
	);

	const [
		quantityInputs,
		setQuantityInputs,
	] = useState<
		Record<string, string>
	>({});

	/* ==========================================================================
	   ERROR
	========================================================================== */

	const showError = (
		message: string,
	) => {
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
			const response =
				await fetch(
					"/api/cart",
					{
						method: "GET",
						credentials:
							"include",
						cache:
							"no-store",
					},
				);

			const data: CartResponse =
				await response
					.json()
					.catch(
						() =>
							({}) as CartResponse,
					);

			console.log(
				"CART RESPONSE:",
				data,
			);

			if (!response.ok) {
				throw new Error(
					data?.message ??
						"Unable to load your cart. Please try again.",
				);
			}

			/*
			 * Backend response:
			 *
			 * {
			 *   status: 200,
			 *   message: "success.",
			 *   products_count: 4,
			 *   cart: [...]
			 * }
			 *
			 * cart is directly an array.
			 */

			const rawItems =
				Array.isArray(data.cart)
					? data.cart
					: [];

			const normalizedItems =
				rawItems
					.map(
						normalizeCartItem,
					)
					.filter(
						(
							item,
						): item is CartItem =>
							item !== null,
					);

			console.log(
				"NORMALIZED CART:",
				normalizedItems,
			);

			setItems(
				normalizedItems,
			);

			/*
			 * Quantity input values.
			 */
			const inputs: Record<
				string,
				string
			> = {};

			for (const item of normalizedItems) {
				inputs[
					item.cartItemId
				] = String(
					item.quantity,
				);
			}

			setQuantityInputs(
				inputs,
			);

			/*
			 * Backend totals may be:
			 *
			 * 996
			 *
			 * OR
			 *
			 * "996.00"
			 */

			setServerSubtotal(
				toNumber(
					data.total_price,
					0,
				),
			);

			setDeliveryFee(
				toNumber(
					data.delivery_fee,
					0,
				),
			);

			setServerGrandTotal(
				toNumber(
					data.grand_total,
					0,
				),
			);
		} catch (err) {
			console.error(
				"Fetch cart failed:",
				err,
			);

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

	const localSubtotal =
		items.reduce(
			(sum, item) =>
				sum +
				item.price *
					item.quantity,
			0,
		);

	const totalProducts =
		items.reduce(
			(total, item) =>
				total +
				item.quantity,
			0,
		);

	/*
	 * The backend already gives:
	 *
	 * total_price = 996
	 * delivery_fee = 90
	 * grand_total = 1086
	 *
	 * Use backend values when available.
	 *
	 * This also means the UI exactly reflects
	 * the backend's calculation.
	 */

	const subtotal =
		items.length > 0
			? serverSubtotal ||
				localSubtotal
			: 0;

	const grandTotal =
		items.length > 0
			? serverGrandTotal ||
				subtotal +
					deliveryFee
			: 0;

	/* ==========================================================================
	   UPDATE CART
	========================================================================== */

	const updateCart = async (
		item: CartItem,
		action:
			| "increase"
			| "decrease"
			| "set",
		newQuantity?: number,
	) => {
		/*
		 * IMPORTANT:
		 *
		 * cart_item_id identifies the
		 * actual cart row.
		 *
		 * NEVER use productId here.
		 */

		const cartItemId =
			item.cartItemId;

		if (
			updatingItemIds.has(
				cartItemId,
			)
		) {
			return;
		}

		if (
			action === "set" &&
			(
				newQuantity ===
					undefined ||
				!Number.isInteger(
					newQuantity,
				) ||
				newQuantity < 0
			)
		) {
			showError(
				"Please enter a valid quantity.",
			);

			return;
		}

		const previousQuantity =
			item.quantity;

		let optimisticQuantity =
			previousQuantity;

		if (
			action ===
			"increase"
		) {
			optimisticQuantity =
				previousQuantity +
				1;
		}

		if (
			action ===
			"decrease"
		) {
			optimisticQuantity =
				Math.max(
					0,
					previousQuantity -
						1,
				);
		}

		if (action === "set") {
			optimisticQuantity =
				newQuantity!;
		}

		/* ---------------------------------------------------------------
		   MARK ITEM AS UPDATING
		--------------------------------------------------------------- */

		setUpdatingItemIds(
			(previous) => {
				const next =
					new Set(
						previous,
					);

				next.add(
					cartItemId,
				);

				return next;
			},
		);

		/* ---------------------------------------------------------------
		   OPTIMISTIC UI
		--------------------------------------------------------------- */

		if (
			optimisticQuantity ===
			0
		) {
			setItems(
				(previous) =>
					previous.filter(
						(current) =>
							current.cartItemId !==
							cartItemId,
					),
			);

			setQuantityInputs(
				(previous) => {
					const next = {
						...previous,
					};

					delete next[
						cartItemId
					];

					return next;
				},
			);
		} else {
			setItems(
				(previous) =>
					previous.map(
						(current) =>
							current.cartItemId ===
							cartItemId
								? {
										...current,
										quantity:
											optimisticQuantity,
									}
								: current,
					),
			);

			setQuantityInputs(
				(previous) => ({
					...previous,
					[cartItemId]:
						String(
							optimisticQuantity,
						),
				}),
			);
		}

		/* ---------------------------------------------------------------
		   BACKEND REQUEST
		--------------------------------------------------------------- */

		try {
			const formData =
				new FormData();

			formData.append(
				"cart_item_id",
				cartItemId,
			);

			formData.append(
				"action",
				action,
			);

			if (
				action === "set"
			) {
				formData.append(
					"quantity",
					String(
						newQuantity,
					),
				);
			}

			console.log(
				"UPDATE CART REQUEST:",
				{
					cart_item_id:
						cartItemId,
					action,
					quantity:
						action ===
						"set"
							? newQuantity
							: undefined,
				},
			);

			const response =
				await fetch(
					"/api/cart/update_cart",
					{
						method:
							"POST",
						credentials:
							"include",
						body:
							formData,
					},
				);

			const data =
				await response
					.json()
					.catch(
						() => ({}),
					);

			console.log(
				"UPDATE CART RESPONSE:",
				data,
			);

			if (!response.ok) {
				throw new Error(
					data?.message ??
						"Unable to update cart. Please try again.",
				);
			}

			await fetchCart();
		} catch (err) {
			console.error(
				"Cart update failed:",
				err,
			);

			/*
			 * Restore previous quantity.
			 */

			setItems(
				(previous) => {
					const exists =
						previous.some(
							(current) =>
								current.cartItemId ===
								cartItemId,
						);

					if (!exists) {
						return [
							...previous,
							{
								...item,
								quantity:
									previousQuantity,
							},
						];
					}

					return previous.map(
						(current) =>
							current.cartItemId ===
							cartItemId
								? {
										...current,
										quantity:
											previousQuantity,
									}
								: current,
					);
				},
			);

			setQuantityInputs(
				(previous) => ({
					...previous,
					[cartItemId]:
						String(
							previousQuantity,
						),
				}),
			);

			showError(
				err instanceof Error
					? err.message
					: "Unable to update cart.",
			);
		} finally {
			setUpdatingItemIds(
				(previous) => {
					const next =
						new Set(
							previous,
						);

					next.delete(
						cartItemId,
					);

					return next;
				},
			);
		}
	};

	/* ==========================================================================
	   INCREASE
	========================================================================== */

	const handleIncrease = (
		item: CartItem,
	) => {
		updateCart(
			item,
			"increase",
		);
	};

	/* ==========================================================================
	   DECREASE
	========================================================================== */

	const handleDecrease = (
		item: CartItem,
	) => {
		updateCart(
			item,
			"decrease",
		);
	};

	/* ==========================================================================
	   QUANTITY INPUT
	========================================================================== */

	const handleSetQuantity = (
		item: CartItem,
		value: string,
	) => {
		if (value === "") {
			setQuantityInputs(
				(previous) => ({
					...previous,
					[item.cartItemId]:
						"",
				}),
			);

			return;
		}

		if (!/^\d+$/.test(value)) {
			return;
		}

		setQuantityInputs(
			(previous) => ({
				...previous,
				[item.cartItemId]:
					value,
			}),
		);
	};

	/* ==========================================================================
	   COMMIT QUANTITY
	========================================================================== */

	const commitQuantity = (
		item: CartItem,
	) => {
		const rawValue =
			quantityInputs[
				item.cartItemId
			];

		if (
			rawValue ===
				undefined ||
			rawValue.trim() === ""
		) {
			setQuantityInputs(
				(previous) => ({
					...previous,
					[item.cartItemId]:
						String(
							item.quantity,
						),
				}),
			);

			return;
		}

		const quantity =
			Number(rawValue);

		if (
			!Number.isInteger(
				quantity,
			) ||
			quantity < 0
		) {
			setQuantityInputs(
				(previous) => ({
					...previous,
					[item.cartItemId]:
						String(
							item.quantity,
						),
				}),
			);

			showError(
				"Quantity must be a positive number or 0.",
			);

			return;
		}

		if (
			quantity ===
			item.quantity
		) {
			return;
		}

		updateCart(
			item,
			"set",
			quantity,
		);
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
			setQuantityInputs(
				(previous) => ({
					...previous,
					[item.cartItemId]:
						String(
							item.quantity,
						),
				}),
			);

			event.currentTarget.blur();
		}
	};

	/* ==========================================================================
	   REMOVE
	========================================================================== */

	const handleRemove = (
		item: CartItem,
	) => {
		updateCart(
			item,
			"set",
			0,
		);
	};

	/* ==========================================================================
	   CLEAR CART
	========================================================================== */

	const handleClearCart =
		async () => {
			if (
				items.length ===
				0
			) {
				return;
			}

			const confirmed =
				window.confirm(
					"Are you sure you want to clear your cart?",
				);

			if (!confirmed) {
				return;
			}

			const previousItems =
				[...items];

			setItems([]);

			setQuantityInputs({});

			try {
				for (const item of previousItems) {
					const formData =
						new FormData();

					formData.append(
						"cart_item_id",
						item.cartItemId,
					);

					formData.append(
						"action",
						"set",
					);

					formData.append(
						"quantity",
						"0",
					);

					const response =
						await fetch(
							"/api/cart/update_cart",
							{
								method:
									"POST",
								credentials:
									"include",
								body:
									formData,
							},
						);

					const data =
						await response
							.json()
							.catch(
								() => ({}),
							);

					if (
						!response.ok
					) {
						throw new Error(
							data?.message ??
								"Unable to clear the cart.",
						);
					}
				}

				setDeliveryFee(0);

				setServerSubtotal(
					0,
				);

				setServerGrandTotal(
					0,
				);
			} catch (err) {
				console.error(
					"Clear cart failed:",
					err,
				);

				setItems(
					previousItems,
				);

				const restoredInputs: Record<
					string,
					string
				> = {};

				for (const item of previousItems) {
					restoredInputs[
						item.cartItemId
					] = String(
						item.quantity,
					);
				}

				setQuantityInputs(
					restoredInputs,
				);

				showError(
					err instanceof Error
						? err.message
						: "Unable to clear your cart.",
				);
			}
		};

	/* ==========================================================================
	   CHECKOUT
	========================================================================== */

	const handleCheckout =
		() => {
			if (
				items.length ===
				0
			) {
				return;
			}

			router.push(
				"/checkout",
			);
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

	if (
		error &&
		items.length ===
			0
	) {
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
							Couldn't load your cart
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
							Looks like you haven't added anything to your cart. Find something
							special and make it personal.
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

												<div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#F7F3F0] sm:h-28 sm:w-28">
													{item.image ? (
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
															<h3 className="font-semibold text-[#2E2E2E]">
																{item.title}
															</h3>

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
																disabled={isUpdating}
																onClick={() => handleIncrease(item)}
																aria-label={`Increase quantity of ${item.title}`}
																className="flex h-9 w-9 items-center justify-center text-[#2E2E2E]/60 transition hover:bg-[#FBF9F7] disabled:cursor-not-allowed disabled:opacity-30"
															>
																<Plus size={14} />
															</button>
														</div>

														<p className="font-semibold text-[#85161B]">
															₹{itemTotal.toFixed(2)}
														</p>
													</div>

													{/* DELIVERY */}

													{/* {item.delivery > 0 && (
														<p className="mt-2 text-[11px] text-[#2E2E2E]/40">
															Delivery: ₹{item.delivery.toFixed(2)}
														</p>
													)} */}
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

								<div className="flex justify-between text-[#2E2E2E]/60">
									<span>Delivery</span>

									<span>
										{deliveryFee > 0 ? `₹${deliveryFee.toFixed(2)}` : "Free"}
									</span>
								</div>

								<div className="border-t border-[#E8DED7] pt-4">
									<div className="flex items-end justify-between">
										<div>
											<p className="font-semibold text-[#2E2E2E]">
												Grand Total
											</p>

											<p className="mt-1 text-[11px] text-[#2E2E2E]/40">
												Including delivery
											</p>
										</div>

										<p className="text-2xl font-bold text-[#85161B]">
											₹{grandTotal.toFixed(2)}
										</p>
									</div>
								</div>
							</div>

							<button
								type="button"
								onClick={handleCheckout}
								className="group mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#85161B] py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#721318] hover:shadow-lg active:scale-[0.99]"
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