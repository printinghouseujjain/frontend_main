"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
	AlertCircle,
	ArrowRight,
	Check,
	Heart,
	HeartOff,
	ShoppingBag,
	Trash2,
	Upload,
	X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

/* ============================================================================
   CONSTANTS
============================================================================ */

const PRODUCT_IMAGE_BASE_URL =
	"https://api.printinghouseujjain.in/assets/products/";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

/* ============================================================================
   TYPES
============================================================================ */

type CustomizeRequirement = {
	key: string;
	type: "text" | "photo" | "photos";
	max: number;
	placeholder: string;
	optional: boolean;
};

interface WishlistProduct {
	id: string;
	name: string;
	price: number;
	originalPrice?: number;
	image?: string;
	badge?: string;
	category?: string;
	description?: string;
	customizeReqs?: string | string[] | null;
}

interface RawWishlistItem {
	id?: string | number;
	product_id?: string | number;
	productId?: string | number;

	/* Some backends may return the product directly */
	name?: string;
	selling_price?: string | number;
	market_price?: string | number;
	primary_photo_path?: string;
	customize_reqs?: string | string[] | null;
	customizeReqs?: string | string[] | null;
	description?: string;
	category?: string;
	badge?: string;

	product?: {
		id?: string | number;
		name?: string;
		selling_price?: string | number;
		market_price?: string | number;
		primary_photo_path?: string;
		customize_reqs?: string | string[] | null;
		customizeReqs?: string | string[] | null;
		description?: string;
		category?: string;
		badge?: string;
	};
}

interface Product {
	id?: string | number;
	name?: string;
	description?: string;
	primary_photo_path?: string;
	other_photos_paths?: string;
	market_price?: string | number;
	selling_price?: string | number;
	reseller_price?: string | number;
	category_ids?: string;
	occasion_ids?: string;
	in_stock?: string;
	sold?: string | number;
	customize_reqs?: string | string[] | null;
	customizeReqs?: string | string[] | null;
	keywords?: string;
	created_at?: string;
	badge?: string;
	category?: string;
}

interface WishlistResponse {
	data?: RawWishlistItem[];
	items?: RawWishlistItem[];
	wishlist?: RawWishlistItem[];
	message?: string;
	status?: number;
}

interface ProductResponse {
	status?: number;
	message?: string;
	product?: Product;
	data?: Product | Product[];
	products?: Product[];
}

/* ============================================================================
   CUSTOMIZATION PARSER

   Supported:

   text:10:Enter your custom name

   photo:Upload Photo

   photos:5:Upload Photos

   OLD / KEYED FORMAT:

   insidename:text:10:To Be Printed Inside

   photo1:photo:1:Upload Photo

   photos1:photos:5:Upload Photos

   IMPORTANT:

   insidename:text:10:To Be Printed Inside

   becomes:

   key         = insidename
   type        = text
   max         = 10
   placeholder = To Be Printed Inside

   Only "To Be Printed Inside" is shown in the modal.
============================================================================ */

function parseCustomizeRequirements(
	value?: string | string[] | null,
): CustomizeRequirement[] {
	if (!value) {
		return [];
	}

	let parsed: unknown;

	if (Array.isArray(value)) {
		parsed = value;
	} else {
		try {
			parsed = JSON.parse(value);
		} catch (error) {
			console.error("Failed to parse customize_reqs:", value, error);

			return [];
		}
	}

	if (!Array.isArray(parsed)) {
		return [];
	}

	return parsed
		.map((requirement): CustomizeRequirement | null => {
			if (typeof requirement !== "string") {
				return null;
			}

			const parts = requirement.split(":").map((part) => part.trim());

			if (parts.length < 2) {
				return null;
			}

			let key = "";
			let type: "text" | "photo" | "photos";
			let max = 1;
			let placeholder = "";

			/* =========================================================
			   FORMAT:

			   text:10:Enter your custom name
			   photo:Upload Photo
			   photos:5:Upload Photos
			========================================================= */

			if (
				parts[0] === "text" ||
				parts[0] === "photo" ||
				parts[0] === "photos"
			) {
				type = parts[0];

				if (type === "photo") {
					key = "photo";
					max = 1;
					placeholder = parts.slice(1).join(":").trim();
				} else {
					const possibleMax = Number(parts[1]);

					if (Number.isFinite(possibleMax) && possibleMax >= 1) {
						max = possibleMax;
						placeholder = parts.slice(2).join(":").trim();
					} else {
						max = type === "text" ? 100 : 1;

						placeholder = parts.slice(1).join(":").trim();
					}

					key =
						type === "text"
							? `text_${Math.random().toString(36).slice(2, 8)}`
							: `photos_${Math.random().toString(36).slice(2, 8)}`;
				}
			} else if (

			/* =========================================================
			   KEYED FORMAT:

			   insidename:text:10:To Be Printed Inside

			   This is the important format for your backend.
			========================================================= */
				parts.length >= 3 &&
				(parts[1] === "text" || parts[1] === "photo" || parts[1] === "photos")
			) {
				key = parts[0];

				type = parts[1];

				const possibleMax = Number(parts[2]);

				if (Number.isFinite(possibleMax) && possibleMax >= 1) {
					max = possibleMax;
				} else {
					max = type === "photo" ? 1 : 100;
				}

				/*
				 * Everything after:
				 *
				 * key:type:max:
				 *
				 * becomes the visible label.
				 *
				 * Example:
				 *
				 * insidename:text:10:To Be Printed Inside
				 *
				 * label = "To Be Printed Inside"
				 */

				placeholder = parts.slice(3).join(":").trim();

				/*
				 * Fallback for:
				 *
				 * photo1:photo:Upload Photo
				 */

				if (!placeholder) {
					placeholder = parts.slice(2).join(":").trim();

					max = type === "photo" ? 1 : 100;
				}
			} else {
				return null;
			}

			if (!placeholder) {
				return null;
			}

			const optional = /\(\s*optional\s*\)/i.test(placeholder);

			const cleanPlaceholder = placeholder
				.replace(/\s*\(\s*optional\s*\)/i, "")
				.trim();

			return {
				key,
				type,
				max,
				placeholder: cleanPlaceholder,
				optional,
			};
		})
		.filter((item): item is CustomizeRequirement => item !== null);
}

/* ============================================================================
   IMAGE
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
   EXTRACT PRODUCT
============================================================================ */

function extractProduct(data: ProductResponse): Product | null {
	if (data.product && typeof data.product === "object") {
		return data.product;
	}

	if (data.data && !Array.isArray(data.data) && typeof data.data === "object") {
		return data.data;
	}

	if (Array.isArray(data.products) && data.products.length > 0) {
		return data.products[0];
	}

	if (Array.isArray(data.data) && data.data.length > 0) {
		return data.data[0];
	}

	return null;
}

/* ============================================================================
   NORMALIZE WISHLIST ITEM
============================================================================ */

function normalizeWishlistItem(raw: RawWishlistItem): WishlistProduct | null {
	const id = String(
		raw.product_id ?? raw.productId ?? raw.product?.id ?? raw.id ?? "",
	);

	if (!id) {
		return null;
	}

	const nestedProduct = raw.product;

	const price = Number(nestedProduct?.selling_price ?? raw.selling_price ?? 0);

	const originalPrice = Number(
		nestedProduct?.market_price ?? raw.market_price ?? 0,
	);

	const customizeReqs =
		nestedProduct?.customize_reqs ??
		nestedProduct?.customizeReqs ??
		raw.customize_reqs ??
		raw.customizeReqs ??
		null;

	return {
		id,

		name: nestedProduct?.name ?? raw.name ?? "Untitled product",

		price: Number.isFinite(price) ? price : 0,

		originalPrice:
			Number.isFinite(originalPrice) && originalPrice > price
				? originalPrice
				: undefined,

		image: getProductImage(
			nestedProduct?.primary_photo_path ?? raw.primary_photo_path,
		),

		description: nestedProduct?.description ?? raw.description,

		category: nestedProduct?.category ?? raw.category,

		badge: nestedProduct?.badge ?? raw.badge,

		customizeReqs,
	};
}

/* ============================================================================
   PAGE
============================================================================ */

export default function WishlistPage() {
	const [wishlist, setWishlist] = useState<WishlistProduct[]>([]);

	const [loading, setLoading] = useState(true);

	const [error, setError] = useState("");

	const [removingId, setRemovingId] = useState<string | null>(null);

	const [addingId, setAddingId] = useState<string | null>(null);

	/* =========================================================
	   CUSTOMIZATION MODAL
	========================================================= */

	const [customizationOpen, setCustomizationOpen] = useState(false);

	const [selectedProduct, setSelectedProduct] =
		useState<WishlistProduct | null>(null);

	const [customizationValues, setCustomizationValues] = useState<
		Record<string, string>
	>({});

	const [customizationFiles, setCustomizationFiles] = useState<
		Record<string, File[]>
	>({});

	const [customizationValidationError, setCustomizationValidationError] =
		useState("");

	const [customizationAdding, setCustomizationAdding] = useState(false);

	/* =========================================================
	   SUCCESS STATE
	========================================================= */

	const [successMessage, setSuccessMessage] = useState("");

	/* =========================================================
	   ERROR
	========================================================= */

	const showError = (message: string) => {
		setError(message);

		setTimeout(() => {
			setError("");
		}, 3000);
	};

	/* =========================================================
	   FETCH PRODUCT
	========================================================= */

	const fetchProductDetails = async (
		productId: string,
	): Promise<Product | null> => {
		try {
			const response = await fetch(
				`/api/products?product_id=${encodeURIComponent(productId)}`,
				{
					method: "GET",
					cache: "no-store",
				},
			);

			const data: ProductResponse = await response.json().catch(() => ({}));

			if (!response.ok) {
				throw new Error(
					data?.message ?? `Unable to fetch product ${productId}.`,
				);
			}

			return extractProduct(data);
		} catch (err) {
			console.error(`Fetch product ${productId} failed:`, err);

			return null;
		}
	};

	/* =========================================================
	   FETCH WISHLIST
	========================================================= */

	const fetchWishlist = useCallback(async () => {
		setLoading(true);
		setError("");

		try {
			console.log("=================================");
			console.log("FETCH WISHLIST");
			console.log("=================================");

			const response = await fetch("/api/wishlist", {
				method: "GET",
				credentials: "include",
				cache: "no-store",
			});

			const responseText = await response.text();

			let data: WishlistResponse = {};

			try {
				data = responseText ? JSON.parse(responseText) : {};
			} catch {
				data = {
					message: responseText || "Invalid response from server.",
				};
			}

			console.log("WISHLIST STATUS:", response.status);

			console.log("WISHLIST RESPONSE:", data);

			if (!response.ok) {
				throw new Error(
					data?.message ?? "Unable to load your wishlist. Please try again.",
				);
			}

			const rawItems = data.data ?? data.items ?? data.wishlist ?? [];

			const normalizedItems = rawItems
				.map(normalizeWishlistItem)
				.filter((item): item is WishlistProduct => item !== null);

			/*
			 * Fetch product information for every
			 * wishlist item.
			 */

			const itemsWithDetails = await Promise.all(
				normalizedItems.map(async (wishlistItem) => {
					const product = await fetchProductDetails(wishlistItem.id);

					if (!product) {
						return wishlistItem;
					}

					const price = Number(
						product.selling_price ?? wishlistItem.price ?? 0,
					);

					const originalPrice = Number(
						product.market_price ?? wishlistItem.originalPrice ?? 0,
					);

					const customizeReqs =
						product.customize_reqs ??
						product.customizeReqs ??
						wishlistItem.customizeReqs ??
						null;

					return {
						...wishlistItem,

						name: product.name ?? wishlistItem.name,

						price: Number.isFinite(price) ? price : 0,

						originalPrice:
							Number.isFinite(originalPrice) && originalPrice > price
								? originalPrice
								: undefined,

						image:
							getProductImage(product.primary_photo_path) ?? wishlistItem.image,

						description: product.description ?? wishlistItem.description,

						category: product.category ?? wishlistItem.category,

						badge: product.badge ?? wishlistItem.badge,

						customizeReqs,
					};
				}),
			);

			setWishlist(itemsWithDetails);
		} catch (err) {
			console.error("Fetch wishlist failed:", err);

			setError(
				err instanceof Error
					? err.message
					: "Unable to load your wishlist. Please try again.",
			);
		} finally {
			setLoading(false);
		}
	}, []);

	/* =========================================================
	   INITIAL FETCH
	========================================================= */

	useEffect(() => {
		void fetchWishlist();
	}, [fetchWishlist]);

	/* =========================================================
	   BODY SCROLL LOCK
	========================================================= */

	useEffect(() => {
		if (!customizationOpen) {
			return;
		}

		const previousOverflow = document.body.style.overflow;

		document.body.style.overflow = "hidden";

		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [customizationOpen]);

	/* =========================================================
	   RESET CUSTOMIZATION
	========================================================= */

	const resetCustomization = () => {
		setCustomizationValues({});
		setCustomizationFiles({});
		setCustomizationValidationError("");
	};

	/* =========================================================
	   OPEN CUSTOMIZATION
	========================================================= */

	const openCustomizationModal = (product: WishlistProduct) => {
		setSelectedProduct(product);
		setCustomizationValues({});
		setCustomizationFiles({});
		setCustomizationValidationError("");
		setCustomizationOpen(true);
	};

	/* =========================================================
	   CLOSE CUSTOMIZATION
	========================================================= */

	const closeCustomizationModal = () => {
		if (customizationAdding) {
			return;
		}

		setCustomizationOpen(false);
		setSelectedProduct(null);
		resetCustomization();
	};

	/* =========================================================
	   REMOVE FROM WISHLIST
	========================================================= */

	const removeFromWishlist = async (productId: string): Promise<boolean> => {
		const removedItem = wishlist.find((item) => item.id === productId);

		const removedIndex = wishlist.findIndex((item) => item.id === productId);

		setWishlist((current) => current.filter((item) => item.id !== productId));

		setRemovingId(productId);

		try {
			const response = await fetch("/api/wishlist/remove", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify({
					productId,
				}),
			});

			const data = await response.json().catch(() => ({}));

			if (!response.ok) {
				throw new Error(
					data?.message ?? "Unable to remove item from wishlist.",
				);
			}

			return true;
		} catch (err) {
			console.error("Remove wishlist failed:", err);

			/*
			 * Restore the item if backend failed.
			 */

			if (removedItem) {
				setWishlist((current) => {
					const next = [...current];

					next.splice(removedIndex, 0, removedItem);

					return next;
				});
			}

			showError(
				err instanceof Error
					? err.message
					: "Unable to remove item from wishlist.",
			);

			return false;
		} finally {
			setRemovingId(null);
		}
	};

	/* =========================================================
	   ADD TO CART

	   SAME CONTRACT AS PRODUCT CARD

	   product_id
	   text values by their backend key
	   files by their backend key
	========================================================= */

	const addToCart = async (
		product: WishlistProduct,
		values: Record<string, string>,
		files: Record<string, File[]>,
	) => {
		if (addingId === product.id) {
			return false;
		}

		setAddingId(product.id);
		setError("");

		try {
			const formData = new FormData();

			/* =====================================================
			   PRODUCT ID
			===================================================== */

			formData.append("product_id", product.id);

			/* =====================================================
			   TEXT CUSTOMIZATION

			   Example:

			   insidename:text:10:To Be Printed Inside

			   becomes:

			   formData.append("insidename", "Hello");

			   NOT:

			   formData.append(
			     "To Be Printed Inside",
			     "Hello"
			   );
			===================================================== */

			Object.entries(values).forEach(([key, value]) => {
				const trimmedValue = value.trim();

				if (trimmedValue) {
					formData.append(key, trimmedValue);
				}
			});

			/* =====================================================
			   FILE CUSTOMIZATION
			===================================================== */

			Object.entries(files).forEach(([key, fileList]) => {
				if (!fileList.length) {
					return;
				}

				/*
				 * Single photo
				 */

				if (fileList.length === 1) {
					formData.append(key, fileList[0]);

					return;
				}

				/*
				 * Multiple photos
				 */

				fileList.forEach((file) => {
					formData.append(`${key}[]`, file);
				});
			});

			/* =====================================================
			   DEBUG FOR DEVELOPMENT
			===================================================== */

			console.log("=================================");

			console.log("ADDING WISHLIST PRODUCT TO CART");

			console.log("Product ID:", product.id);

			console.log("Text values:", values);

			console.log("Files:", files);

			for (const [key, value] of formData.entries()) {
				console.log(
					"FORM DATA:",
					key,
					value instanceof File ? value.name : value,
				);
			}

			console.log("=================================");

			/* =====================================================
			   API
			===================================================== */

			const response = await fetch("/api/cart/add", {
				method: "POST",
				credentials: "include",
				body: formData,
			});

			const responseText = await response.text();

			let data: any;

			try {
				data = responseText ? JSON.parse(responseText) : {};
			} catch {
				data = {
					message: responseText || "Invalid response from server.",
				};
			}

			console.log("ADD TO CART STATUS:", response.status);

			console.log("ADD TO CART RESPONSE:", data);

			if (!response.ok) {
				throw new Error(
					data?.message ?? `Unable to add product to cart (${response.status})`,
				);
			}

			/* =====================================================
			   SUCCESS
			===================================================== */

			setSuccessMessage(`${product.name} added to cart.`);

			setTimeout(() => {
				setSuccessMessage("");
			}, 2200);

			return true;
		} catch (err) {
			console.error("Add to cart failed:", err);

			showError(
				err instanceof Error ? err.message : "Unable to add item to cart.",
			);

			return false;
		} finally {
			setAddingId(null);
		}
	};

	/* =========================================================
	   HANDLE ADD TO CART

	   If customization exists:

	   OPEN MODAL

	   Otherwise:

	   ADD DIRECTLY
	========================================================= */

	const handleAddToCart = async (product: WishlistProduct) => {
		const requirements = parseCustomizeRequirements(product.customizeReqs);

		console.log("Product customization requirements:", requirements);

		/*
		 * Customized product
		 */

		if (requirements.length > 0) {
			openCustomizationModal(product);

			return;
		}

		/*
		 * Normal product
		 */

		const success = await addToCart(product, {}, {});

		if (success) {
			await removeFromWishlist(product.id);
		}
	};

	/* =========================================================
	   TEXT CHANGE
	========================================================= */

	const handleTextChange = (key: string, value: string, max: number) => {
		setCustomizationValues((previous) => ({
			...previous,
			[key]: value.slice(0, max),
		}));

		setCustomizationValidationError("");
	};

	/* =========================================================
	   SINGLE PHOTO
	========================================================= */

	const handleSinglePhotoChange = (
		requirement: CustomizeRequirement,
		file: File | undefined,
	) => {
		if (!file) {
			return;
		}

		setCustomizationValidationError("");

		if (!file.type.startsWith("image/")) {
			setCustomizationValidationError(
				`${requirement.placeholder}: Please select an image file.`,
			);

			return;
		}

		if (file.size > MAX_FILE_SIZE) {
			setCustomizationValidationError(
				`${requirement.placeholder}: Image must be 10 MB or smaller.`,
			);

			return;
		}

		setCustomizationFiles((previous) => ({
			...previous,
			[requirement.key]: [file],
		}));
	};

	/* =========================================================
	   MULTIPLE PHOTOS
	========================================================= */

	const handleMultiplePhotoChange = (
		requirement: CustomizeRequirement,
		fileList: FileList | null,
	) => {
		if (!fileList) {
			return;
		}

		setCustomizationValidationError("");

		const selectedFiles = Array.from(fileList);

		if (selectedFiles.length > requirement.max) {
			setCustomizationValidationError(
				`${requirement.placeholder}: Please select up to ${requirement.max} photos.`,
			);

			return;
		}

		const invalidFile = selectedFiles.find(
			(file) => !file.type.startsWith("image/"),
		);

		if (invalidFile) {
			setCustomizationValidationError(
				`${requirement.placeholder}: Only image files are allowed.`,
			);

			return;
		}

		const oversizedFile = selectedFiles.find(
			(file) => file.size > MAX_FILE_SIZE,
		);

		if (oversizedFile) {
			setCustomizationValidationError(
				`${requirement.placeholder}: Each image must be 10 MB or smaller.`,
			);

			return;
		}

		setCustomizationFiles((previous) => ({
			...previous,
			[requirement.key]: selectedFiles,
		}));
	};

	/* =========================================================
	   REMOVE PHOTO
	========================================================= */

	const removePhoto = (key: string, index: number) => {
		setCustomizationFiles((previous) => ({
			...previous,
			[key]: (previous[key] || []).filter(
				(_, fileIndex) => fileIndex !== index,
			),
		}));
	};

	/* =========================================================
	   VALIDATE CUSTOMIZATION
	========================================================= */

	const validateCustomization = (): boolean => {
		if (!selectedProduct) {
			return false;
		}

		const requirements = parseCustomizeRequirements(
			selectedProduct.customizeReqs,
		);

		for (const requirement of requirements) {
			/* =================================================
				   TEXT
				================================================= */

			if (requirement.type === "text") {
				const value = customizationValues[requirement.key]?.trim() || "";

				if (!requirement.optional && !value) {
					setCustomizationValidationError(
						`${requirement.placeholder} is required.`,
					);

					return false;
				}

				if (value.length > requirement.max) {
					setCustomizationValidationError(
						`${requirement.placeholder}: Maximum ${requirement.max} characters allowed.`,
					);

					return false;
				}
			}

			/* =================================================
				   SINGLE PHOTO
				================================================= */

			if (requirement.type === "photo") {
				const files = customizationFiles[requirement.key] || [];

				if (!requirement.optional && files.length === 0) {
					setCustomizationValidationError(
						`${requirement.placeholder} is required.`,
					);

					return false;
				}
			}

			/* =================================================
				   MULTIPLE PHOTOS
				================================================= */

			if (requirement.type === "photos") {
				const files = customizationFiles[requirement.key] || [];

				if (!requirement.optional && files.length === 0) {
					setCustomizationValidationError(
						`${requirement.placeholder} is required.`,
					);

					return false;
				}

				if (files.length > requirement.max) {
					setCustomizationValidationError(
						`${requirement.placeholder}: Maximum ${requirement.max} photos allowed.`,
					);

					return false;
				}
			}
		}

		return true;
	};

	/* =========================================================
	   SUBMIT CUSTOMIZATION
	========================================================= */

	const handleCustomizationSubmit = async () => {
		if (!selectedProduct || customizationAdding) {
			return;
		}

		setCustomizationValidationError("");

		const valid = validateCustomization();

		if (!valid) {
			return;
		}

		setCustomizationAdding(true);

		try {
			const success = await addToCart(
				selectedProduct,
				customizationValues,
				customizationFiles,
			);

			if (!success) {
				return;
			}

			/*
			 * Close modal after successful
			 * cart addition.
			 */

			setCustomizationOpen(false);
			resetCustomization();

			const productId = selectedProduct.id;

			setSelectedProduct(null);

			/*
			 * Remove from wishlist.
			 */

			await removeFromWishlist(productId);
		} finally {
			setCustomizationAdding(false);
		}
	};

	/* =========================================================
	   LOADING
	========================================================= */

	if (loading) {
		return (
			<main className="min-h-screen bg-[#F8F5F2]">
				<WishlistHeader />

				<div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
					<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{Array.from({
							length: 4,
						}).map((_, index) => (
							<div
								key={index}
								className="overflow-hidden rounded-2xl border border-[#E7D5C8] bg-white"
							>
								<div className="aspect-square animate-pulse bg-[#EDE5DF]" />

								<div className="space-y-3 p-5">
									<div className="h-3 w-1/3 animate-pulse rounded bg-[#EDE5DF]" />

									<div className="h-5 animate-pulse rounded bg-[#EDE5DF]" />

									<div className="h-5 w-1/2 animate-pulse rounded bg-[#EDE5DF]" />

									<div className="mt-4 h-11 animate-pulse rounded-xl bg-[#EDE5DF]" />
								</div>
							</div>
						))}
					</div>
				</div>
			</main>
		);
	}

	/* =========================================================
	   ERROR
	========================================================= */

	if (error && wishlist.length === 0) {
		return (
			<main className="min-h-screen bg-[#F8F5F2]">
				<WishlistHeader />

				<div className="mx-auto max-w-3xl px-5 py-16 sm:px-6 lg:px-8">
					<div className="rounded-3xl border border-red-200 bg-white px-6 py-14 text-center shadow-sm sm:px-12">
						<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
							<AlertCircle
								size={32}
								className="text-red-500"
								strokeWidth={1.7}
							/>
						</div>

						<h1 className="mt-6 text-2xl font-bold tracking-tight text-[#2E2E2E]">
							Couldn't load your wishlist
						</h1>

						<p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#2E2E2E]/55">
							{error}
						</p>

						<button
							type="button"
							onClick={() => void fetchWishlist()}
							className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#85161B] px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#721318] hover:shadow-lg"
						>
							Try again
						</button>
					</div>
				</div>
			</main>
		);
	}

	/* =========================================================
	   MAIN
	========================================================= */

	return (
		<main className="min-h-screen bg-[#F8F5F2]">
			<WishlistHeader />

			{/* SUCCESS MESSAGE */}

			<AnimatePresence>
				{successMessage && (
					<motion.div
						initial={{
							opacity: 0,
							y: -10,
						}}
						animate={{
							opacity: 1,
							y: 0,
						}}
						exit={{
							opacity: 0,
							y: -10,
						}}
						className="fixed right-5 top-5 z-[120]"
					>
						<div className="flex items-center gap-2 rounded-xl bg-[#202020] px-4 py-3 text-sm font-medium text-white shadow-xl">
							<Check size={16} />
							{successMessage}
						</div>
					</motion.div>
				)}
			</AnimatePresence>

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

			<div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
				{/* PAGE INTRO */}

				<div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#85161B]/70">
							Your favourites
						</p>

						<h1 className="text-3xl font-bold tracking-tight text-[#2E2E2E] sm:text-4xl lg:text-[42px]">
							My Wishlist
						</h1>

						<p className="mt-2 text-sm text-[#2E2E2E]/55 sm:text-base">
							Keep the gifts you love close until you're ready to make them
							yours.
						</p>
					</div>

					{wishlist.length > 0 && (
						<div className="flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-medium text-[#2E2E2E]/60 shadow-sm">
							<Heart size={14} className="text-[#85161B]" fill="currentColor" />
							{wishlist.length} {wishlist.length === 1 ? "item" : "items"}
						</div>
					)}
				</div>

				{/* EMPTY */}

				{wishlist.length === 0 ? (
					<EmptyWishlist />
				) : (
					<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						<AnimatePresence mode="popLayout">
							{wishlist.map((product, index) => (
								<WishlistCard
									key={product.id}
									product={product}
									index={index}
									adding={addingId === product.id}
									removing={removingId === product.id}
									onRemove={() => void removeFromWishlist(product.id)}
									onAddToCart={() => void handleAddToCart(product)}
								/>
							))}
						</AnimatePresence>
					</div>
				)}

				{wishlist.length > 0 && (
					<div className="mx-auto mt-12 flex max-w-xl items-center justify-center gap-3 text-center">
						<div className="h-px flex-1 bg-[#E7D5C8]" />

						<span className="px-2 text-xs font-medium text-[#2E2E2E]/40">
							Save it today, gift it when the moment comes
						</span>

						<div className="h-px flex-1 bg-[#E7D5C8]" />
					</div>
				)}
			</div>

			{/* CUSTOMIZATION MODAL */}

			{customizationOpen && selectedProduct && (
				<CustomizationModal
					product={selectedProduct}
					values={customizationValues}
					files={customizationFiles}
					validationError={customizationValidationError}
					adding={customizationAdding}
					onClose={closeCustomizationModal}
					onTextChange={handleTextChange}
					onSinglePhotoChange={handleSinglePhotoChange}
					onMultiplePhotoChange={handleMultiplePhotoChange}
					onRemovePhoto={removePhoto}
					onSubmit={handleCustomizationSubmit}
				/>
			)}
		</main>
	);
}

/* ============================================================================
   HEADER
============================================================================ */

function WishlistHeader() {
	return (
		<section className="border-b border-[#E7D5C8] bg-white">
			<div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4 sm:px-6 lg:px-8">
				<div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F7D6BF]/50 text-[#85161B]">
					<Heart size={19} strokeWidth={1.8} />
				</div>

				<div>
					<p className="text-sm font-semibold text-[#2E2E2E]">Your Wishlist</p>

					<p className="text-xs text-[#2E2E2E]/45">
						Your handpicked favourites
					</p>
				</div>
			</div>
		</section>
	);
}

/* ============================================================================
   WISHLIST CARD
============================================================================ */

interface WishlistCardProps {
	product: WishlistProduct;
	index: number;
	adding: boolean;
	removing: boolean;
	onRemove: () => void;
	onAddToCart: () => void;
}

function WishlistCard({
	product,
	index,
	adding,
	removing,
	onRemove,
	onAddToCart,
}: WishlistCardProps) {
	const customizeRequirements = parseCustomizeRequirements(
		product.customizeReqs,
	);

	const hasDiscount =
		product.originalPrice !== undefined &&
		product.originalPrice > product.price;

	return (
		<motion.article
			layout
			initial={{
				opacity: 0,
				y: 20,
			}}
			animate={{
				opacity: 1,
				y: 0,
			}}
			exit={{
				opacity: 0,
				scale: 0.95,
			}}
			transition={{
				duration: 0.35,
				delay: index * 0.05,
			}}
			className="group overflow-hidden rounded-2xl border border-[#E7D5C8] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
		>
			{/* IMAGE */}

			<div className="relative aspect-square overflow-hidden bg-[#F2E9E2]">
				{product.image ? (
					<img
						src={product.image}
						alt={product.name}
						loading="lazy"
						className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center">
						<ShoppingBag
							size={40}
							className="text-[#85161B]/25"
							strokeWidth={1.5}
						/>
					</div>
				)}

				{/* BADGE */}

				{product.badge && (
					<div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#85161B] shadow-sm backdrop-blur-sm">
						{product.badge}
					</div>
				)}

				{/* REMOVE */}

				<button
					type="button"
					onClick={onRemove}
					disabled={removing}
					aria-label={`Remove ${product.name} from wishlist`}
					className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#85161B] shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-[#85161B] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
				>
					{removing ? (
						<span className="h-4 w-4 animate-spin rounded-full border-2 border-[#85161B]/25 border-t-[#85161B]" />
					) : (
						<Trash2 size={15} />
					)}
				</button>
			</div>

			{/* CONTENT */}

			<div className="p-4 sm:p-5">
				{product.category && (
					<p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#85161B]/60">
						{product.category}
					</p>
				)}

				<h2 className="line-clamp-2 min-h-[44px] text-base font-semibold leading-snug text-[#2E2E2E]">
					{product.name}
				</h2>

				{product.description && (
					<p className="mt-2 line-clamp-2 text-xs leading-5 text-[#2E2E2E]/45">
						{product.description}
					</p>
				)}

				{/* PRICE */}

				<div className="mt-3 flex items-center gap-2">
					<span className="text-lg font-bold text-[#85161B]">
						₹
						{product.price.toLocaleString("en-IN", {
							minimumFractionDigits: 0,
							maximumFractionDigits: 2,
						})}
					</span>

					{hasDiscount && (
						<span className="text-xs text-[#2E2E2E]/35 line-through">
							₹
							{product.originalPrice?.toLocaleString("en-IN", {
								minimumFractionDigits: 0,
								maximumFractionDigits: 2,
							})}
						</span>
					)}
				</div>

				{/* CUSTOMIZATION INDICATOR */}

				{customizeRequirements.length > 0 && (
					<div className="mt-3 rounded-lg bg-[#F7F4F1] px-3 py-2 text-[10px] font-medium text-[#85161B]">
						Personalization required
					</div>
				)}

				{/* ACTIONS */}

				<div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
					<button
						type="button"
						onClick={onAddToCart}
						disabled={adding || removing}
						className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#85161B] px-4 py-3 text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#721318] hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{adding ? (
							<span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
						) : (
							<ShoppingBag size={15} />
						)}

						{adding
							? "Adding..."
							: customizeRequirements.length > 0
								? "Customize & Add"
								: "Add to Cart"}
					</button>

					<Link
						href={`/product/${product.id}`}
						aria-label={`View ${product.name}`}
						className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E7D5C8] text-[#85161B] transition-all duration-200 hover:bg-[#F8F5F2]"
					>
						<ArrowRight size={17} />
					</Link>
				</div>
			</div>
		</motion.article>
	);
}

/* ============================================================================
   CUSTOMIZATION MODAL
============================================================================ */

interface CustomizationModalProps {
	product: WishlistProduct;
	values: Record<string, string>;
	files: Record<string, File[]>;
	validationError: string;
	adding: boolean;
	onClose: () => void;
	onTextChange: (key: string, value: string, max: number) => void;
	onSinglePhotoChange: (
		requirement: CustomizeRequirement,
		file: File | undefined,
	) => void;
	onMultiplePhotoChange: (
		requirement: CustomizeRequirement,
		fileList: FileList | null,
	) => void;
	onRemovePhoto: (key: string, index: number) => void;
	onSubmit: () => void;
}

function CustomizationModal({
	product,
	values,
	files,
	validationError,
	adding,
	onClose,
	onTextChange,
	onSinglePhotoChange,
	onMultiplePhotoChange,
	onRemovePhoto,
	onSubmit,
}: CustomizationModalProps) {
	const requirements = parseCustomizeRequirements(product.customizeReqs);

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
			{/* BACKDROP */}

			<button
				type="button"
				aria-label="Close customization"
				onClick={onClose}
				disabled={adding}
				className="absolute inset-0 cursor-default bg-black/45 backdrop-blur-[2px]"
			/>

			{/* MODAL */}

			<div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[26px] bg-white shadow-2xl">
				{/* HEADER */}

				<div className="flex items-start justify-between gap-4 border-b border-[#E8DED7] px-5 py-4 sm:px-6">
					<div className="min-w-0">
						<p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#85161B]">
							Personalize
						</p>

						<h2 className="mt-1 line-clamp-2 text-lg font-semibold text-[#202020]">
							{product.name}
						</h2>

						<p className="mt-1 text-xs text-black/45">
							Add the details required for your custom order.
						</p>
					</div>

					<button
						type="button"
						onClick={onClose}
						disabled={adding}
						className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F7F4F1] text-black/55 transition hover:bg-[#F0EAE5] hover:text-[#85161B] disabled:opacity-50"
					>
						<X size={18} />
					</button>
				</div>

				{/* FORM */}

				<div className="overflow-y-auto px-5 py-5 sm:px-6">
					<div className="space-y-5">
						{requirements.map((requirement) => {
							/*
							 * IMPORTANT:
							 *
							 * requirement.placeholder
							 *
							 * is ONLY:
							 *
							 * "To Be Printed Inside"
							 *
							 * for:
							 *
							 * insidename:text:10:To Be Printed Inside
							 *
							 * The backend key "insidename"
							 * is never displayed.
							 */

							const label = requirement.placeholder;

							const textValue = values[requirement.key] || "";

							const requirementFiles = files[requirement.key] || [];

							return (
								<div key={requirement.key}>
									{/* LABEL */}

									<label className="mb-2 flex items-center justify-between gap-3">
										<span className="text-sm font-semibold text-[#202020]">
											{label}
										</span>

										{requirement.optional ? (
											<span className="text-[10px] font-medium text-black/35">
												Optional
											</span>
										) : (
											<span className="text-[10px] font-semibold text-[#85161B]">
												Required
											</span>
										)}
									</label>

									{/* TEXT */}

									{requirement.type === "text" && (
										<div>
											<input
												type="text"
												value={textValue}
												onChange={(e) =>
													onTextChange(
														requirement.key,
														e.target.value,
														requirement.max,
													)
												}
												maxLength={requirement.max}
												placeholder={label}
												className="w-full rounded-xl border border-[#DED6D0] bg-white px-4 py-3 text-sm text-[#202020] outline-none transition placeholder:text-black/30 focus:border-[#85161B] focus:ring-2 focus:ring-[#85161B]/10"
											/>

											<div className="mt-1.5 flex justify-end">
												<span className="text-[10px] text-black/35">
													{textValue.length}/{requirement.max}
												</span>
											</div>
										</div>
									)}

									{/* SINGLE PHOTO */}

									{requirement.type === "photo" && (
										<div>
											<label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#DED6D0] bg-[#FBF9F7] px-4 py-7 text-center transition hover:border-[#85161B]/50 hover:bg-[#85161B]/[0.02]">
												<Upload size={20} className="text-[#85161B]" />

												<span className="mt-2 text-sm font-medium text-[#202020]">
													{requirementFiles.length > 0
														? "Change image"
														: "Upload image"}
												</span>

												<span className="mt-1 text-[10px] text-black/40">
													PNG, JPG, WEBP • Max 10 MB
												</span>

												<input
													type="file"
													accept="image/*"
													className="hidden"
													onChange={(e) =>
														onSinglePhotoChange(
															requirement,
															e.target.files?.[0],
														)
													}
												/>
											</label>

											{requirementFiles.length > 0 && (
												<div className="mt-2 flex items-center justify-between rounded-lg bg-[#F7F4F1] px-3 py-2">
													<span className="max-w-[80%] truncate text-xs text-black/65">
														{requirementFiles[0].name}
													</span>

													<button
														type="button"
														onClick={() => onRemovePhoto(requirement.key, 0)}
														className="text-black/35 transition hover:text-red-600"
													>
														<Trash2 size={15} />
													</button>
												</div>
											)}
										</div>
									)}

									{/* MULTIPLE PHOTOS */}

									{requirement.type === "photos" && (
										<div>
											<label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#DED6D0] bg-[#FBF9F7] px-4 py-7 text-center transition hover:border-[#85161B]/50 hover:bg-[#85161B]/[0.02]">
												<Upload size={20} className="text-[#85161B]" />

												<span className="mt-2 text-sm font-medium text-[#202020]">
													Select photos
												</span>

												<span className="mt-1 text-[10px] text-black/40">
													Up to {requirement.max} photos • Each max 10 MB
												</span>

												<input
													type="file"
													accept="image/*"
													multiple
													className="hidden"
													onChange={(e) =>
														onMultiplePhotoChange(requirement, e.target.files)
													}
												/>
											</label>

											{requirementFiles.length > 0 && (
												<div className="mt-3 space-y-2">
													{requirementFiles.map((file, index) => (
														<div
															key={`${file.name}-${file.lastModified}-${index}`}
															className="flex items-center justify-between rounded-lg bg-[#F7F4F1] px-3 py-2"
														>
															<span className="max-w-[80%] truncate text-xs text-black/65">
																{file.name}
															</span>

															<button
																type="button"
																onClick={() =>
																	onRemovePhoto(requirement.key, index)
																}
																className="text-black/35 transition hover:text-red-600"
															>
																<Trash2 size={15} />
															</button>
														</div>
													))}
												</div>
											)}
										</div>
									)}
								</div>
							);
						})}
					</div>

					{/* VALIDATION ERROR */}

					{validationError && (
						<div
							role="alert"
							className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs font-medium text-red-600"
						>
							{validationError}
						</div>
					)}
				</div>

				{/* FOOTER */}

				<div className="border-t border-[#E8DED7] bg-white px-5 py-4 sm:px-6">
					<button
						type="button"
						onClick={onSubmit}
						disabled={adding}
						className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#85161B] text-sm font-semibold text-white transition hover:bg-[#721318] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
					>
						{adding ? (
							<>
								<span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
								Adding to cart...
							</>
						) : (
							<>
								<ShoppingBag size={17} />
								Add to cart
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);
}

/* ============================================================================
   EMPTY WISHLIST
============================================================================ */

function EmptyWishlist() {
	return (
		<motion.div
			initial={{
				opacity: 0,
				y: 15,
			}}
			animate={{
				opacity: 1,
				y: 0,
			}}
			className="pt-[112px]
					sm:pt-[120px] flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-[#DCCBC0] bg-white px-6 text-center"
		>
			<div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#F7D6BF]/40 text-[#85161B]">
				<HeartOff size={32} strokeWidth={1.5} />
			</div>

			<h2 className="mt-6 text-2xl font-bold text-[#2E2E2E] sm:text-3xl">
				Your wishlist is waiting
			</h2>

			<p className="mt-2 max-w-md text-sm leading-6 text-[#2E2E2E]/55 sm:text-base">
				Save the gifts you love and come back whenever you're ready to make
				someone's day a little more special.
			</p>

			<Link
				href="/shop"
				className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#85161B] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#721318] hover:shadow-md"
			>
				<ShoppingBag size={16} />
				Start Shopping
				<ArrowRight size={16} />
			</Link>
		</motion.div>
	);
}
