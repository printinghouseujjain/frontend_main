"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
	Heart,
	ShoppingBag,
	Check,
	X,
	Upload,
	Trash2,
	AlertTriangle,
	ChevronDown,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type CustomizeRequirement = {
	key: string;
	type: "text" | "photo" | "photos";
	max: number;
	placeholder: string;
	optional: boolean;
};

type Item = {
    id: string;
    name: string;
    price: number;
    image?: string;
    original?: number;
    badge?: string;
    tag?: string;
    description?: string;
    brand?: string;
    inStock?: boolean;
    customizeReqs?: string | string[] | null;
    noCustomization?: boolean;
    options?: string[];
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

/* =========================================================
   PARSE CUSTOMIZATION REQUIREMENTS
========================================================= */

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

			/*
			 * Supported formats:
			 *
			 * text:10:Enter your custom name
			 * photo:Upload Photo
			 * photos:5:Upload Photos
			 *
			 * Old format:
			 *
			 * name:text:50:Enter name
			 * photo:photo:1:Upload Photo
			 * gallery:photos:5:Upload Photos
			 */

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

					/*
					 * Use a deterministic key.
					 *
					 * Do NOT use Math.random() here because it causes
					 * the key to change on every render.
					 */
					key =
						type === "text"
							? `text_${placeholder
									.toLowerCase()
									.replace(/[^a-z0-9]+/g, "_")
									.slice(0, 30)}`
							: `photos_${placeholder
									.toLowerCase()
									.replace(/[^a-z0-9]+/g, "_")
									.slice(0, 30)}`;
				}
			} else if (
				parts.length >= 3 &&
				(parts[1] === "text" || parts[1] === "photo" || parts[1] === "photos")
			) {
				key = parts[0];
				type = parts[1];

				const possibleMax = Number(parts[2]);

				if (Number.isFinite(possibleMax) && possibleMax >= 1) {
					max = possibleMax;
					placeholder = parts.slice(3).join(":").trim();
				} else {
					max = type === "photo" ? 1 : 100;
					placeholder = parts.slice(2).join(":").trim();
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

/* =========================================================
   COMPONENT
========================================================= */

export default function ProductCard({
	item,
	showOriginal = false,
}: {
	item: Item;
	showOriginal?: boolean;
}) {
	const isInStock = item.inStock !== false;
	const isOutOfStock = !isInStock;
	/* =====================================================
       WISHLIST
    ===================================================== */

	const [wishlisted, setWishlisted] = useState(false);
	const [wishlistLoading, setWishlistLoading] = useState(false);
	const [wishlistError, setWishlistError] = useState("");

	/* =====================================================
       CART
    ===================================================== */

	const [addingToCart, setAddingToCart] = useState(false);
	const [addedToCart, setAddedToCart] = useState(false);
	const [cartError, setCartError] = useState("");

	/* =====================================================
       CUSTOMIZATION
    ===================================================== */

	const [customizationOpen, setCustomizationOpen] = useState(false);

	const [customizationValues, setCustomizationValues] = useState<
		Record<string, string>
	>({});

	const [customizationFiles, setCustomizationFiles] = useState<
		Record<string, File[]>
	>({});

	const [customizationValidationError, setCustomizationValidationError] =
		useState("");

	/* =====================================================
       RAW ORDER (buyer opts out of customization for this
       order, even though the product supports it)
    ===================================================== */

	const [rawOrder, setRawOrder] = useState(false);

	/* =====================================================
       OPTION
    ===================================================== */

	const [selectedOption, setSelectedOption] = useState("");

	/* =====================================================
       PARSED CUSTOMIZATION REQUIREMENTS
    ===================================================== */

	const customizeRequirements = parseCustomizeRequirements(item.customizeReqs);

	/* =====================================================
       HAS OPTIONS
    ===================================================== */

	const hasOptions =
		!item.noCustomization &&
		Array.isArray(item.options) &&
		item.options.length > 0;

	/* =====================================================
       DETERMINE WHETHER CUSTOMIZATION IS AVAILABLE
    ===================================================== */

	const hasCustomization =
		!item.noCustomization && (customizeRequirements.length > 0 || hasOptions);

	/* =====================================================
       DEBUG
    ===================================================== */

	useEffect(() => {
		console.log(
			`Product "${item.name}" raw customizeReqs:`,
			item.customizeReqs,
		);

		console.log(
			`Product "${item.name}" parsed customization requirements:`,
			customizeRequirements,
		);

		console.log(`Product "${item.name}" options:`, item.options);

		console.log(
			`Product "${item.name}" noCustomization:`,
			item.noCustomization,
		);
	}, [item.name, item.customizeReqs, item.noCustomization, item.options]);

	/* =====================================================
       BODY SCROLL LOCK
    ===================================================== */

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

	/* =====================================================
       RESET CUSTOMIZATION
    ===================================================== */

	const resetCustomization = () => {
		setCustomizationValues({});
		setCustomizationFiles({});
		setCustomizationValidationError("");
		setSelectedOption("");
		setRawOrder(false);
	};

	/* =====================================================
       OPEN MODAL
    ===================================================== */

	const openCustomizationModal = () => {
		setCartError("");
		setCustomizationValidationError("");

		/*
		 * Automatically select the first option if there
		 * is only one option.
		 */
		if (item.options && item.options.length === 1) {
			setSelectedOption(item.options[0]);
		}

		setCustomizationOpen(true);
	};

	/* =====================================================
       CLOSE MODAL
    ===================================================== */

	const closeCustomizationModal = () => {
		if (addingToCart) {
			return;
		}

		setCustomizationOpen(false);
		resetCustomization();
	};

	/* =====================================================
       TOGGLE RAW ORDER
    ===================================================== */

	const handleToggleRawOrder = () => {
		setCustomizationValidationError("");

		setRawOrder((previous) => !previous);
	};

	/* =====================================================
       ADD TO CART (customized / option-based)
    ===================================================== */

	const addToCart = async (
		values: Record<string, string>,
		files: Record<string, File[]>,
		option?: string,
	) => {
		if (isOutOfStock || addingToCart) {
			return;
		}

		setCartError("");
		setAddingToCart(true);

		try {
			const formData = new FormData();

			/* =================================================
               PRODUCT ID
            ================================================= */

			formData.append("product_id", item.id);

			/* =================================================
               OPTION
            ================================================= */

			if (!item.noCustomization && option?.trim()) {
				formData.append("option", option.trim());
			}

			/* =================================================
               TEXT CUSTOMIZATION
            ================================================= */

			if (!item.noCustomization) {
				Object.entries(values).forEach(([key, value]) => {
					const trimmedValue = value.trim();

					if (trimmedValue) {
						formData.append(key, trimmedValue);
					}
				});

				/* =================================================
                   FILE CUSTOMIZATION
                ================================================= */

				Object.entries(files).forEach(([key, fileList]) => {
					if (!fileList.length) {
						return;
					}

					/*
					 * SINGLE PHOTO
					 */
					if (fileList.length === 1) {
						formData.append(key, fileList[0]);

						return;
					}

					/*
					 * MULTIPLE PHOTOS
					 */
					fileList.forEach((file) => {
						formData.append(`${key}[]`, file);
					});
				});
			}

			/* =================================================
               DEBUG FOR API REQUEST
            ================================================= */

			console.log("========== ADD TO CART ==========");

			for (const [key, value] of formData.entries()) {
				if (value instanceof File) {
					console.log(key, value.name, value.size, value.type);
				} else {
					console.log(key, value);
				}
			}

			console.log("=================================");

			/* =================================================
               API
            ================================================= */

			const response = await fetch("/api/cart/add", {
				method: "POST",
				credentials: "include",
				body: formData,
			});

			const responseText = await response.text();

			let data: any;

			try {
				data = JSON.parse(responseText);
			} catch {
				data = {
					message: responseText || "Invalid response from server.",
				};
			}

			console.log("ADD TO CART STATUS:", response.status);

			console.log("ADD TO CART RESPONSE:", data);

			if (!response.ok) {
				throw new Error(
					data?.message || `Unable to add product to cart (${response.status})`,
				);
			}

			setAddedToCart(true);
			setCustomizationOpen(false);
			resetCustomization();

			setTimeout(() => {
				setAddedToCart(false);
			}, 1800);
		} catch (error) {
			console.error("Add to cart failed:", error);

			setCartError(
				error instanceof Error
					? error.message
					: "Unable to add item to cart. Please try again.",
			);
		} finally {
			setAddingToCart(false);
		}
	};

	/* =====================================================
       ADD TO CART (raw / no customization for this order)

       Body shape sent to the backend:

       product_id: "9"
       customize: "raw"

       No option, no per-field keys, no photos — a raw order
       is just the bare product.
    ===================================================== */

	const addRawToCart = async () => {
		if (isOutOfStock || addingToCart) {
			return;
		}

		setCartError("");
		setAddingToCart(true);

		try {
			const formData = new FormData();

			formData.append("product_id", item.id);
			formData.append("customize", "raw");

			console.log("========== ADD TO CART (RAW) ==========");

			for (const [key, value] of formData.entries()) {
				if (value instanceof File) {
					console.log(key, value.name, value.size, value.type);
				} else {
					console.log(key, value);
				}
			}

			console.log("========================================");

			const response = await fetch("/api/cart/add", {
				method: "POST",
				credentials: "include",
				body: formData,
			});

			const responseText = await response.text();

			let data: any;

			try {
				data = JSON.parse(responseText);
			} catch {
				data = {
					message: responseText || "Invalid response from server.",
				};
			}

			console.log("ADD TO CART STATUS:", response.status);

			console.log("ADD TO CART RESPONSE:", data);

			if (!response.ok) {
				throw new Error(
					data?.message || `Unable to add product to cart (${response.status})`,
				);
			}

			setAddedToCart(true);
			setCustomizationOpen(false);
			resetCustomization();

			setTimeout(() => {
				setAddedToCart(false);
			}, 1800);
		} catch (error) {
			console.error("Add to cart failed:", error);

			setCartError(
				error instanceof Error
					? error.message
					: "Unable to add item to cart. Please try again.",
			);
		} finally {
			setAddingToCart(false);
		}
	};

	/* =====================================================
       HANDLE ADD TO CART
    ===================================================== */

	const handleAddToCart = async () => {
		if (isOutOfStock || addingToCart) {
			return;
		}

		setCartError("");

		if (item.noCustomization) {
			await addToCart({}, {});
			return;
		}

		if (hasCustomization) {
			openCustomizationModal();
			return;
		}

		await addToCart({}, {});
	};

	/* =====================================================
       TEXT CHANGE
    ===================================================== */

	const handleTextChange = (key: string, value: string, max: number) => {
		setCustomizationValues((previous) => ({
			...previous,
			[key]: value.slice(0, max),
		}));

		setCustomizationValidationError("");
	};

	/* =====================================================
       SINGLE PHOTO
    ===================================================== */

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

	/* =====================================================
       MULTIPLE PHOTOS
    ===================================================== */

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

	/* =====================================================
       REMOVE PHOTO
    ===================================================== */

	const removePhoto = (key: string, index: number) => {
		setCustomizationFiles((previous) => ({
			...previous,
			[key]: (previous[key] || []).filter(
				(_, fileIndex) => fileIndex !== index,
			),
		}));
	};

	/* =====================================================
       VALIDATE CUSTOMIZATION
    ===================================================== */

	const validateCustomization = (): boolean => {
		/* =================================================
           OPTION
        ================================================= */

		if (hasOptions && !selectedOption.trim()) {
			setCustomizationValidationError("Please select an option.");

			return false;
		}

		/* =================================================
           REQUIREMENTS
        ================================================= */

		for (const requirement of customizeRequirements) {
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

	/* =====================================================
       SUBMIT CUSTOMIZATION
    ===================================================== */

	const handleCustomizationSubmit = async () => {
		setCustomizationValidationError("");

		/*
		 * RAW ORDER — buyer opted out of customization for
		 * this purchase. Skip normal validation entirely and
		 * send the raw payload shape instead.
		 */

		if (rawOrder) {
			await addRawToCart();
			return;
		}

		const valid = validateCustomization();

		if (!valid) {
			return;
		}

		await addToCart(customizationValues, customizationFiles, selectedOption);
	};

	/* =====================================================
       WISHLIST
    ===================================================== */

	const handleToggleWishlist = async () => {
		if (wishlistLoading) {
			return;
		}

		setWishlistError("");

		const previousValue = wishlisted;

		setWishlisted(!previousValue);
		setWishlistLoading(true);

		try {
			const response = await fetch("/api/wishlist/add", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify({
					productId: item.id,
				}),
			});

			const data: {
				message?: string;
			} = await response.json().catch(() => ({}));

			if (!response.ok) {
				throw new Error(
					data?.message || "Unable to update wishlist. Please try again.",
				);
			}
		} catch (error) {
			console.error("Wishlist update failed:", error);

			setWishlisted(previousValue);

			setWishlistError(
				error instanceof Error
					? error.message
					: "Unable to update wishlist. Please try again.",
			);

			setTimeout(() => {
				setWishlistError("");
			}, 2500);
		} finally {
			setWishlistLoading(false);
		}
	};

	/* =====================================================
       PRODUCT URL
    ===================================================== */

	const productUrl = `/product/${item.id}`;

	/* =====================================================
       RENDER
    ===================================================== */

	return (
		<>
			{/* =================================================
                PRODUCT CARD
            ================================================= */}

			<article
				className="
                    group
                    w-full
                    min-w-0
                    overflow-hidden
                    rounded-[26px]
                    border
                    border-black/[0.06]
                    bg-white
                    p-2.5
                    shadow-[0_8px_30px_rgba(0,0,0,0.05)]
                    transition-all
                    duration-300
                    hover:-translate-y-1
                    hover:shadow-[0_14px_40px_rgba(0,0,0,0.09)]
                "
			>
				{/* IMAGE */}

				<Link
					href={productUrl}
					aria-label={`View ${item.name}`}
					className="
                        relative
                        block
                        aspect-[0.92]
                        overflow-hidden
                        rounded-[21px]
                        bg-[#F3F0EC]
                    "
				>
					{item.image ? (
						<img
							src={item.image}
							alt={item.name}
							loading="lazy"
							className="
                                h-full
                                w-full
                                object-cover
                                transition-transform
                                duration-500
                                ease-out
                                group-hover:scale-[1.035]
                            "
						/>
					) : (
						<div
							className="
                                flex
                                h-full
                                w-full
                                items-center
                                justify-center
                                text-sm
                                text-black/40
                            "
						>
							No image
						</div>
					)}

					{/* BADGE */}

					{(item.badge || item.tag) && (
						<div
							className="
                                pointer-events-none
                                absolute
                                left-3
                                top-3
                                rounded-full
                                bg-white/95
                                px-3
                                py-1.5
                                text-[10px]
                                font-bold
                                uppercase
                                tracking-[0.08em]
                                text-[#85161B]
                                shadow-sm
                            "
						>
							{item.badge || item.tag}
						</div>
					)}

					{/* WISHLIST */}

					<button
						type="button"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							handleToggleWishlist();
						}}
						disabled={wishlistLoading}
						aria-label={
							wishlisted
								? `Remove ${item.name} from wishlist`
								: `Add ${item.name} to wishlist`
						}
						className="
                            absolute
                            right-3
                            top-3
                            z-10
                            flex
                            h-10
                            w-10
                            items-center
                            justify-center
                            rounded-full
                            bg-white/95
                            shadow-sm
                            transition-all
                            duration-200
                            hover:scale-105
                            active:scale-90
                            disabled:cursor-not-allowed
                            disabled:opacity-70
                        "
					>
						<Heart
							size={19}
							strokeWidth={1.8}
							className={
								wishlisted ? "fill-[#85161B] text-[#85161B]" : "text-[#222]"
							}
						/>
					</button>
				</Link>

				{/* PRODUCT INFORMATION */}

				<div className="px-2 pb-1 pt-4">
					{/* NAME */}

					<Link
						href={productUrl}
						className="block"
						aria-label={`View ${item.name}`}
					>
						<h3
							className="
                                line-clamp-1
                                text-[16px]
                                font-semibold
                                leading-tight
                                tracking-[-0.01em]
                                text-[#202020]
                                transition-colors
                                duration-200
                                group-hover:text-[#85161B]
                            "
						>
							{item.name}
						</h3>
					</Link>

					{/* BRAND */}

					{item.brand && (
						<p
							className="
                                mt-1
                                text-[12px]
                                font-medium
                                text-black/40
                            "
						>
							{item.brand}
						</p>
					)}

					{/* DESCRIPTION */}

					<Link href={productUrl} className="block">
						<p
							className="
                                mt-1.5
                                line-clamp-2
                                min-h-[34px]
                                text-[12px]
                                leading-[1.45]
                                text-black/45
                            "
						>
							{item.description ||
								"Thoughtfully designed and made to make every moment personal."}
						</p>
					</Link>

					{/* NO CUSTOMIZATION */}

					{item.noCustomization && (
						<div
							className="
                                mt-3
                                flex
                                items-start
                                gap-2
                                rounded-xl
                                border
                                border-amber-200
                                bg-amber-50
                                px-3
                                py-2.5
                            "
						>
							<AlertTriangle
								size={14}
								strokeWidth={2}
								className="
                                    mt-0.5
                                    shrink-0
                                    text-amber-600
                                "
							/>

							<div className="min-w-0">
								<p
									className="
                                        text-[10px]
                                        font-semibold
                                        leading-[1.35]
                                        text-amber-800
                                    "
								>
									Raw product only
								</p>

								<p
									className="
                                        mt-0.5
                                        text-[9px]
                                        leading-[1.4]
                                        text-amber-700/80
                                    "
								>
									No customization included. Suitable for resellers.
								</p>
							</div>
						</div>
					)}
					<div className="mt-3">
						<span
							className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${
								isOutOfStock
									? "bg-red-50 text-red-600"
									: "bg-emerald-50 text-emerald-700"
							}`}
						>
							{isOutOfStock ? "Out of stock" : "In stock"}
						</span>
					</div>
					{/* PRICE */}

					<div className="mt-4 min-w-0">
						<div className="flex items-baseline gap-2">
							<span
								className="
                                    text-[19px]
                                    font-bold
                                    tracking-tight
                                    text-[#85161B]
                                "
							>
								₹{item.price.toFixed(0)}
							</span>

							{showOriginal && item.original && (
								<span
									className="
                                            text-[12px]
                                            font-medium
                                            text-black/30
                                            line-through
                                        "
								>
									₹{item.original.toFixed(0)}
								</span>
							)}
						</div>
					</div>

					{/* ADD TO CART */}

					<div className="mt-3 flex items-center gap-2">
						<button
							type="button"
							onClick={handleAddToCart}
							disabled={isOutOfStock || addingToCart}
							aria-label={
								isOutOfStock
									? `${item.name} is out of stock`
									: `Add ${item.name} to cart`
							}
							className="
        flex
        h-11
        flex-1
        items-center
        justify-center
        gap-2
        rounded-full
        border
        border-[#85161B]/25
        bg-white
        text-[12px]
        font-semibold
        text-[#85161B]
        transition-all
        duration-200
        hover:border-[#85161B]/50
        hover:bg-[#85161B]/[0.04]
        active:scale-95
        disabled:cursor-not-allowed
        disabled:border-black/10
        disabled:bg-black/[0.04]
        disabled:text-black/40
        disabled:opacity-100
    "
						>
							{isOutOfStock ? (
								<>
									<X size={16} strokeWidth={2.2} />
									<span>Out of stock</span>
								</>
							) : addingToCart ? (
								<>
									<span
										className="
                    h-3.5
                    w-3.5
                    animate-spin
                    rounded-full
                    border-2
                    border-[#85161B]/30
                    border-t-[#85161B]
                "
									/>
									<span>Adding...</span>
								</>
							) : addedToCart ? (
								<>
									<Check size={16} strokeWidth={2.4} />
									<span>Added</span>
								</>
							) : (
								<>
									<ShoppingBag size={16} strokeWidth={2} />
									<span>
										{hasCustomization ? "Customize & Add" : "Add to cart"}
									</span>
								</>
							)}
						</button>
					</div>

					{/* ERRORS */}

					{cartError && (
						<p
							role="alert"
							className="
                                mt-2
                                text-[11px]
                                font-medium
                                text-red-600
                            "
						>
							{cartError}
						</p>
					)}

					{wishlistError && (
						<p
							role="alert"
							className="
                                mt-2
                                text-[11px]
                                font-medium
                                text-red-600
                            "
						>
							{wishlistError}
						</p>
					)}
				</div>
			</article>

			{/* =================================================
                CUSTOMIZATION MODAL
            ================================================= */}

			{customizationOpen && (
				<div
					className="
                        fixed
                        inset-0
                        z-[100]
                        flex
                        items-center
                        justify-center
                        p-4
                    "
				>
					{/* BACKDROP */}

					<button
						type="button"
						aria-label="Close customization"
						onClick={closeCustomizationModal}
						className="
                            absolute
                            inset-0
                            cursor-default
                            bg-black/45
                            backdrop-blur-[2px]
                        "
					/>

					{/* MODAL */}

					<div
						className="
                            relative
                            z-10
                            flex
                            max-h-[90vh]
                            w-full
                            max-w-lg
                            flex-col
                            overflow-hidden
                            rounded-[26px]
                            bg-white
                            shadow-2xl
                        "
					>
						{/* HEADER */}

						<div
							className="
                                flex
                                items-start
                                justify-between
                                gap-4
                                border-b
                                border-[#E8DED7]
                                px-5
                                py-4
                                sm:px-6
                            "
						>
							<div className="min-w-0">
								<p
									className="
                                        text-[10px]
                                        font-bold
                                        uppercase
                                        tracking-[0.15em]
                                        text-[#85161B]
                                    "
								>
									Personalize
								</p>

								<h2
									className="
                                        mt-1
                                        line-clamp-2
                                        text-lg
                                        font-semibold
                                        text-[#202020]
                                    "
								>
									{item.name}
								</h2>

								<p
									className="
                                        mt-1
                                        text-xs
                                        text-black/45
                                    "
								>
									Add the details required for your custom order.
								</p>
							</div>

							<button
								type="button"
								onClick={closeCustomizationModal}
								disabled={addingToCart}
								className="
                                    flex
                                    h-9
                                    w-9
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-full
                                    bg-[#F7F4F1]
                                    text-black/55
                                    transition
                                    hover:bg-[#F0EAE5]
                                    hover:text-[#85161B]
                                    disabled:opacity-50
                                "
							>
								<X size={18} />
							</button>
						</div>

						{/* FORM */}

						<div className="overflow-y-auto px-5 py-5 sm:px-6">
							<div className="space-y-5">
								{/* =================================================
                                    RAW ORDER TOGGLE
                                ================================================= */}

								<div
									className="
                                        rounded-xl
                                        border
                                        border-[#DED6D0]
                                        bg-[#FBF9F7]
                                        p-4
                                    "
								>
									<label className="flex cursor-pointer items-start gap-3">
										<input
											type="checkbox"
											checked={rawOrder}
											onChange={handleToggleRawOrder}
											className="mt-0.5 h-4 w-4 accent-[#85161B]"
										/>

										<div className="min-w-0">
											<span
												className="
                                                    text-sm
                                                    font-semibold
                                                    text-[#202020]
                                                "
											>
												No customization — send raw product
											</span>

											<p className="mt-1 text-xs text-black/45">
												Skip personalization and receive the plain product
												as-is.
											</p>
										</div>
									</label>

									{rawOrder && (
										<div
											className="
                                                mt-3
                                                flex
                                                items-start
                                                gap-2
                                                rounded-lg
                                                border
                                                border-amber-200
                                                bg-amber-50
                                                px-3
                                                py-2.5
                                            "
										>
											<AlertTriangle
												size={14}
												strokeWidth={2}
												className="mt-0.5 shrink-0 text-amber-600"
											/>

											<p className="text-[11px] leading-[1.5] text-amber-800">
												A raw product will be delivered without any
												customization applied — preferably suited for resellers.
												Please confirm this is what you want before adding to
												cart.
											</p>
										</div>
									)}
								</div>

								{!rawOrder && (
									<>
										{/* =================================================
                                            OPTION
                                        ================================================= */}

										{hasOptions && (
											<div>
												<label
													htmlFor={`option-${item.id}`}
													className="
                                                        mb-2
                                                        flex
                                                        items-center
                                                        justify-between
                                                        gap-3
                                                    "
												>
													<span
														className="
                                                            text-sm
                                                            font-semibold
                                                            text-[#202020]
                                                        "
													>
														Select option
													</span>

													<span
														className="
                                                            text-[10px]
                                                            font-semibold
                                                            text-[#85161B]
                                                        "
													>
														Required
													</span>
												</label>

												<div className="relative">
													<select
														id={`option-${item.id}`}
														value={selectedOption}
														onChange={(e) => {
															setSelectedOption(e.target.value);
															setCustomizationValidationError("");
														}}
														className="
                                                            w-full
                                                            appearance-none
                                                            rounded-xl
                                                            border
                                                            border-[#DED6D0]
                                                            bg-white
                                                            px-4
                                                            py-3
                                                            pr-10
                                                            text-sm
                                                            text-[#202020]
                                                            outline-none
                                                            transition
                                                            focus:border-[#85161B]
                                                            focus:ring-2
                                                            focus:ring-[#85161B]/10
                                                        "
													>
														<option value="">Select an option</option>

														{item.options?.map((option, index) => (
															<option key={`${option}-${index}`} value={option}>
																{option}
															</option>
														))}
													</select>

													<ChevronDown
														size={17}
														className="
                                                            pointer-events-none
                                                            absolute
                                                            right-4
                                                            top-1/2
                                                            -translate-y-1/2
                                                            text-black/40
                                                        "
													/>
												</div>
											</div>
										)}

										{/* =================================================
                                            CUSTOMIZATION REQUIREMENTS
                                        ================================================= */}

										{customizeRequirements.map((requirement) => {
											const label = requirement.placeholder;

											const textValue =
												customizationValues[requirement.key] || "";

											const files = customizationFiles[requirement.key] || [];

											return (
												<div key={requirement.key}>
													{/* LABEL */}

													<label
														className="
                                                            mb-2
                                                            flex
                                                            items-center
                                                            justify-between
                                                            gap-3
                                                        "
													>
														<span
															className="
                                                                text-sm
                                                                font-semibold
                                                                text-[#202020]
                                                            "
														>
															{label}
														</span>

														{requirement.optional ? (
															<span
																className="
                                                                    text-[10px]
                                                                    font-medium
                                                                    text-black/35
                                                                "
															>
																Optional
															</span>
														) : (
															<span
																className="
                                                                    text-[10px]
                                                                    font-semibold
                                                                    text-[#85161B]
                                                                "
															>
																Required
															</span>
														)}
													</label>

													{/* =================================================
                                                        TEXT
                                                    ================================================= */}

													{requirement.type === "text" && (
														<div>
															<input
																type="text"
																value={textValue}
																onChange={(e) =>
																	handleTextChange(
																		requirement.key,
																		e.target.value,
																		requirement.max,
																	)
																}
																maxLength={requirement.max}
																placeholder={requirement.placeholder}
																className="
                                                                    w-full
                                                                    rounded-xl
                                                                    border
                                                                    border-[#DED6D0]
                                                                    bg-white
                                                                    px-4
                                                                    py-3
                                                                    text-sm
                                                                    text-[#202020]
                                                                    outline-none
                                                                    transition
                                                                    placeholder:text-black/30
                                                                    focus:border-[#85161B]
                                                                    focus:ring-2
                                                                    focus:ring-[#85161B]/10
                                                                "
															/>

															<div className="mt-1.5 flex justify-end">
																<span className="text-[10px] text-black/35">
																	{textValue.length}/{requirement.max}
																</span>
															</div>
														</div>
													)}

													{/* =================================================
                                                        SINGLE PHOTO
                                                    ================================================= */}

													{requirement.type === "photo" && (
														<div>
															<label
																className="
                                                                    flex
                                                                    cursor-pointer
                                                                    flex-col
                                                                    items-center
                                                                    justify-center
                                                                    rounded-xl
                                                                    border
                                                                    border-dashed
                                                                    border-[#DED6D0]
                                                                    bg-[#FBF9F7]
                                                                    px-4
                                                                    py-7
                                                                    text-center
                                                                    transition
                                                                    hover:border-[#85161B]/50
                                                                    hover:bg-[#85161B]/[0.02]
                                                                "
															>
																<Upload size={20} className="text-[#85161B]" />

																<span className="mt-2 text-sm font-medium text-[#202020]">
																	{files.length > 0
																		? "Change image"
																		: "Upload image"}
																</span>

																<span className="mt-1 text-[10px] text-black/40">
																	PNG, JPG, WEBP
																	{" • "}
																	Max 10 MB
																</span>

																<input
																	type="file"
																	accept="image/*"
																	className="hidden"
																	onChange={(e) =>
																		handleSinglePhotoChange(
																			requirement,
																			e.target.files?.[0],
																		)
																	}
																/>
															</label>

															{files.length > 0 && (
																<div
																	className="
                                                                        mt-2
                                                                        flex
                                                                        items-center
                                                                        justify-between
                                                                        rounded-lg
                                                                        bg-[#F7F4F1]
                                                                        px-3
                                                                        py-2
                                                                    "
																>
																	<span className="max-w-[80%] truncate text-xs text-black/65">
																		{files[0].name}
																	</span>

																	<button
																		type="button"
																		onClick={() =>
																			removePhoto(requirement.key, 0)
																		}
																		className="text-black/35 transition hover:text-red-600"
																	>
																		<Trash2 size={15} />
																	</button>
																</div>
															)}
														</div>
													)}

													{/* =================================================
                                                        MULTIPLE PHOTOS
                                                    ================================================= */}

													{requirement.type === "photos" && (
														<div>
															<label
																className="
                                                                    flex
                                                                    cursor-pointer
                                                                    flex-col
                                                                    items-center
                                                                    justify-center
                                                                    rounded-xl
                                                                    border
                                                                    border-dashed
                                                                    border-[#DED6D0]
                                                                    bg-[#FBF9F7]
                                                                    px-4
                                                                    py-7
                                                                    text-center
                                                                    transition
                                                                    hover:border-[#85161B]/50
                                                                    hover:bg-[#85161B]/[0.02]
                                                                "
															>
																<Upload size={20} className="text-[#85161B]" />

																<span className="mt-2 text-sm font-medium text-[#202020]">
																	Select photos
																</span>

																<span className="mt-1 text-[10px] text-black/40">
																	Up to {requirement.max} photos
																	{" • "}
																	Each max 10 MB
																</span>

																<input
																	type="file"
																	accept="image/*"
																	multiple
																	className="hidden"
																	onChange={(e) =>
																		handleMultiplePhotoChange(
																			requirement,
																			e.target.files,
																		)
																	}
																/>
															</label>

															{files.length > 0 && (
																<div className="mt-3 space-y-2">
																	{files.map((file, index) => (
																		<div
																			key={`${file.name}-${file.lastModified}-${index}`}
																			className="
                                                                                flex
                                                                                items-center
                                                                                justify-between
                                                                                rounded-lg
                                                                                bg-[#F7F4F1]
                                                                                px-3
                                                                                py-2
                                                                            "
																		>
																			<span className="max-w-[80%] truncate text-xs text-black/65">
																				{file.name}
																			</span>

																			<button
																				type="button"
																				onClick={() =>
																					removePhoto(requirement.key, index)
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
									</>
								)}
							</div>

							{/* VALIDATION ERROR */}

							{customizationValidationError && (
								<div
									role="alert"
									className="
                                        mt-5
                                        rounded-xl
                                        border
                                        border-red-200
                                        bg-red-50
                                        px-3.5
                                        py-3
                                        text-xs
                                        font-medium
                                        text-red-600
                                    "
								>
									{customizationValidationError}
								</div>
							)}
						</div>

						{/* FOOTER */}

						<div
							className="
                                border-t
                                border-[#E8DED7]
                                bg-white
                                px-5
                                py-4
                                sm:px-6
                            "
						>
							<button
								type="button"
								onClick={handleCustomizationSubmit}
								disabled={addingToCart}
								className="
                                    flex
                                    h-11
                                    w-full
                                    items-center
                                    justify-center
                                    gap-2
                                    rounded-full
                                    bg-[#85161B]
                                    text-sm
                                    font-semibold
                                    text-white
                                    transition
                                    hover:bg-[#721318]
                                    active:scale-[0.99]
                                    disabled:cursor-not-allowed
                                    disabled:opacity-60
                                "
							>
								{addingToCart ? (
									<>
										<span
											className="
                                                h-4
                                                w-4
                                                animate-spin
                                                rounded-full
                                                border-2
                                                border-white/30
                                                border-t-white
                                            "
										/>
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
			)}
		</>
	);
}
