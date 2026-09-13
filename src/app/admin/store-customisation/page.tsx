"use client";

import React, {
	ChangeEvent,
	FormEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

import {
	AlertCircle,
	CheckCircle2,
	Image as ImageIcon,
	ImagePlus,
	Loader2,
	Megaphone,
	RefreshCw,
	Trash2,
	Upload,
	X,
} from "lucide-react";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

type Message = {
	type: "success" | "error";
	text: string;
} | null;

type LoadingAction =
	| "add-strip"
	| "change-strip"
	| "remove-strip"
	| "add-hero"
	| "change-hero"
	| "remove-hero"
	| "popup-toggle"
	| "popup-image"
	| null;

type Announcement = {
	index: number;
	value: string;
};

type HeroImage = {
	index: number;
	url: string;
};

type StoreConfig = {
	announcements: Announcement[];
	heroImages: HeroImage[];
	popupEnabled: boolean;
	popupImage: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function formatFileSize(bytes: number) {
	if (bytes < 1024) {
		return `${bytes} B`;
	}

	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)} KB`;
	}

	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function validateImageFile(file: File | null) {
	if (!file) {
		return "Please select an image.";
	}

	if (!file.type.startsWith("image/")) {
		return "Please select a valid image file.";
	}

	if (file.size > MAX_FILE_SIZE) {
		return "Image size must not exceed 10 MB.";
	}

	return null;
}

function getBackendMessage(data: unknown, fallback: string) {
	if (isObject(data) && typeof data.message === "string") {
		return data.message;
	}

	if (isObject(data) && typeof data.error === "string") {
		return data.error;
	}

	return fallback;
}

function apiRequestSucceeded(response: Response, data: unknown) {
	if (!response.ok) {
		return false;
	}

	if (
		isObject(data) &&
		typeof data.status === "number" &&
		data.status !== 200
	) {
		return false;
	}

	if (isObject(data) && data.success === false) {
		return false;
	}

	return true;
}

function getFirstArray(object: Record<string, unknown>, keys: string[]) {
	for (const key of keys) {
		if (Array.isArray(object[key])) {
			return object[key];
		}
	}

	return [];
}

function getString(object: Record<string, unknown>, keys: string[]) {
	for (const key of keys) {
		if (typeof object[key] === "string") {
			return object[key];
		}
	}

	return "";
}

/*
 * Converts the config response into the format used by this page.
 *
 * The parser intentionally supports multiple likely config shapes:
 *
 * strip / strips / announcements
 * hero / hero_images / heroImages
 * popup.enabled / popup_enabled
 * popup.image / popup_image
 */
function parseStoreConfig(raw: unknown): StoreConfig {
	if (!isObject(raw)) {
		return {
			announcements: [],
			heroImages: [],
			popupEnabled: false,
			popupImage: "",
		};
	}

	const config = isObject(raw.config) ? raw.config : raw;

	/*
	 * ANNOUNCEMENTS
	 */
	const rawAnnouncements = getFirstArray(config, [
		"announcements",
		"announcement",
		"strips",
		"strip",
		"announcement_strip",
		"announcement_strips",
	]);

	const announcements: Announcement[] = rawAnnouncements
		.map((item, index) => {
			if (typeof item === "string") {
				return {
					index,
					value: item,
				};
			}

			if (isObject(item)) {
				const value = getString(item, [
					"value",
					"text",
					"message",
					"title",
					"content",
				]);

				return {
					index,
					value,
				};
			}

			return {
				index,
				value: "",
			};
		})
		.filter((item) => item.value.trim());

	/*
	 * HERO IMAGES
	 */
	const rawHeroImages = getFirstArray(config, [
		"hero",
		"heroes",
		"hero_images",
		"heroImages",
		"hero_slides",
		"heroSlides",
	]);

	const heroImages: HeroImage[] = rawHeroImages
		.map((item, index) => {
			if (typeof item === "string") {
				return {
					index,
					url: item,
				};
			}

			if (isObject(item)) {
				return {
					index,
					url: getString(item, ["url", "image", "path", "src", "image_path"]),
				};
			}

			return {
				index,
				url: "",
			};
		})
		.filter((item) => item.url.trim());

	/*
	 * POPUP
	 */
	const popup = isObject(config.popup) ? config.popup : {};

	let popupEnabled = false;

	if (typeof popup.enabled === "boolean") {
		popupEnabled = popup.enabled;
	} else if (typeof config.popup_enabled === "boolean") {
		popupEnabled = config.popup_enabled;
	} else if (typeof config.popupEnabled === "boolean") {
		popupEnabled = config.popupEnabled;
	} else if (typeof config.popup_toggle === "boolean") {
		popupEnabled = config.popup_toggle;
	}

	let popupImage = "";

	if (isObject(popup)) {
		popupImage = getString(popup, ["image", "url", "path", "image_path"]);
	}

	if (!popupImage) {
		popupImage = getString(config, ["popup_image", "popupImage"]);
	}

	return {
		announcements,
		heroImages,
		popupEnabled,
		popupImage,
	};
}

function resolveImageUrl(path: string) {
	if (!path) {
		return "";
	}

	if (
		path.startsWith("http://") ||
		path.startsWith("https://") ||
		path.startsWith("data:")
	) {
		return path;
	}

	return `https://api.printinghouseujjain.in/${path.replace(/^\/+/, "")}`;
}

export default function StoreCustomisationPage() {
	const [config, setConfig] = useState<StoreConfig>({
		announcements: [],
		heroImages: [],
		popupEnabled: false,
		popupImage: "",
	});

	const [loadingConfig, setLoadingConfig] = useState(true);

	const [stripValue, setStripValue] = useState("");

	const [changeStripIndex, setChangeStripIndex] = useState("0");

	const [changeStripValue, setChangeStripValue] = useState("");

	const [heroAddFile, setHeroAddFile] = useState<File | null>(null);

	const [heroChangeIndex, setHeroChangeIndex] = useState("0");

	const [heroChangeFile, setHeroChangeFile] = useState<File | null>(null);

	const [popupImage, setPopupImage] = useState<File | null>(null);

	const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);

	const [message, setMessage] = useState<Message>(null);

	const heroAddInputRef = useRef<HTMLInputElement>(null);

	const heroChangeInputRef = useRef<HTMLInputElement>(null);

	const popupImageInputRef = useRef<HTMLInputElement>(null);

	/*
	 * ─────────────────────────────────────────
	 * LOAD CONFIG
	 * ─────────────────────────────────────────
	 */

	const loadConfig = useCallback(async () => {
		setLoadingConfig(true);

		try {
			const response = await fetch("/api/site-config", {
				method: "GET",
				credentials: "include",
				cache: "no-store",
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(
					getBackendMessage(data, "Unable to load store configuration."),
				);
			}

			setConfig(parseStoreConfig(data));
		} catch (error) {
			setMessage({
				type: "error",
				text:
					error instanceof Error
						? error.message
						: "Unable to load store configuration.",
			});
		} finally {
			setLoadingConfig(false);
		}
	}, []);

	useEffect(() => {
		loadConfig();
	}, [loadConfig]);

	/*
	 * ─────────────────────────────────────────
	 * HELPERS
	 * ─────────────────────────────────────────
	 */

	const clearMessage = () => {
		setMessage(null);
	};

	const showSuccess = (text: string) => {
		setMessage({
			type: "success",
			text,
		});
	};

	const showError = (text: string) => {
		setMessage({
			type: "error",
			text,
		});
	};

	const isLoading = (action: LoadingAction) => loadingAction === action;

	const submitCommand = async (
		formData: FormData,
		action: LoadingAction,
		successMessage: string,
	) => {
		if (!action) {
			return false;
		}

		setLoadingAction(action);
		clearMessage();

		try {
			const response = await fetch("/api/admin/home_content_update", {
				method: "POST",
				body: formData,
				credentials: "include",
				cache: "no-store",
			});

			const data = await response.json().catch(() => ({}));

			if (!apiRequestSucceeded(response, data)) {
				throw new Error(
					getBackendMessage(data, "Unable to update store content."),
				);
			}

			showSuccess(successMessage);

			/*
			 * Refresh the actual config after every
			 * successful update.
			 */
			await loadConfig();

			return true;
		} catch (error) {
			showError(
				error instanceof Error
					? error.message
					: "Unable to update store content.",
			);

			return false;
		} finally {
			setLoadingAction(null);
		}
	};

	/*
	 * ─────────────────────────────────────────
	 * ANNOUNCEMENT STRIP
	 * ─────────────────────────────────────────
	 */

	const addStrip = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const value = stripValue.trim();

		if (!value) {
			showError("Please enter an announcement message.");
			return;
		}

		const formData = new FormData();

		formData.append("command_type", "admin");
		formData.append("command", "strip");
		formData.append("action", "add");
		formData.append("value", value);

		const success = await submitCommand(
			formData,
			"add-strip",
			"Announcement strip added successfully.",
		);

		if (success) {
			setStripValue("");
		}
	};

	const changeStrip = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const index = Number(changeStripIndex);
		const value = changeStripValue.trim();

		if (!Number.isInteger(index) || index < 0) {
			showError("Please enter a valid strip index.");
			return;
		}

		if (!value) {
			showError("Please enter the updated announcement.");
			return;
		}

		const formData = new FormData();

		formData.append("command_type", "admin");
		formData.append("command", "strip");
		formData.append("action", "change");
		formData.append("index", String(index));
		formData.append("value", value);

		await submitCommand(
			formData,
			"change-strip",
			"Announcement strip updated successfully.",
		);
	};

	const removeStrip = async (index: number) => {
		const confirmed = window.confirm(
			`Are you sure you want to remove announcement #${index}?`,
		);

		if (!confirmed) {
			return;
		}

		const formData = new FormData();

		formData.append("command_type", "admin");
		formData.append("command", "strip");
		formData.append("action", "remove");
		formData.append("index", String(index));

		await submitCommand(
			formData,
			"remove-strip",
			"Announcement strip removed successfully.",
		);
	};

	const editStrip = (index: number, value: string) => {
		setChangeStripIndex(String(index));
		setChangeStripValue(value);

		window.scrollTo({
			top: 0,
			behavior: "smooth",
		});
	};

	/*
	 * ─────────────────────────────────────────
	 * HERO IMAGES
	 * ─────────────────────────────────────────
	 */

	const handleHeroAddFile = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0] ?? null;

		if (!file) {
			setHeroAddFile(null);
			return;
		}

		const error = validateImageFile(file);

		if (error) {
			showError(error);
			event.target.value = "";
			setHeroAddFile(null);
			return;
		}

		setHeroAddFile(file);
		clearMessage();
	};

	const handleHeroChangeFile = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0] ?? null;

		if (!file) {
			setHeroChangeFile(null);
			return;
		}

		const error = validateImageFile(file);

		if (error) {
			showError(error);
			event.target.value = "";
			setHeroChangeFile(null);
			return;
		}

		setHeroChangeFile(file);
		clearMessage();
	};

	const addHeroImage = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const error = validateImageFile(heroAddFile);

		if (error) {
			showError(error);
			return;
		}

		const formData = new FormData();

		formData.append("command_type", "admin");
		formData.append("command", "hero");
		formData.append("action", "add");
		formData.append("image", heroAddFile!);

		const success = await submitCommand(
			formData,
			"add-hero",
			"Hero image added successfully.",
		);

		if (success) {
			setHeroAddFile(null);

			if (heroAddInputRef.current) {
				heroAddInputRef.current.value = "";
			}
		}
	};

	const changeHeroImage = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const index = Number(heroChangeIndex);

		if (!Number.isInteger(index) || index < 0) {
			showError("Please enter a valid hero image index.");
			return;
		}

		const error = validateImageFile(heroChangeFile);

		if (error) {
			showError(error);
			return;
		}

		const formData = new FormData();

		formData.append("command_type", "admin");
		formData.append("command", "hero");
		formData.append("action", "change");
		formData.append("index", String(index));
		formData.append("image", heroChangeFile!);

		const success = await submitCommand(
			formData,
			"change-hero",
			"Hero image replaced successfully.",
		);

		if (success) {
			setHeroChangeFile(null);

			if (heroChangeInputRef.current) {
				heroChangeInputRef.current.value = "";
			}
		}
	};

	const removeHeroImage = async (index: number) => {
		const confirmed = window.confirm(
			`Are you sure you want to remove hero image #${index}?`,
		);

		if (!confirmed) {
			return;
		}

		const formData = new FormData();

		formData.append("command_type", "admin");
		formData.append("command", "hero");
		formData.append("action", "remove");
		formData.append("index", String(index));

		await submitCommand(
			formData,
			"remove-hero",
			"Hero image removed successfully.",
		);
	};

	const prepareHeroChange = (index: number) => {
		setHeroChangeIndex(String(index));

		document.getElementById("hero-change-section")?.scrollIntoView({
			behavior: "smooth",
			block: "center",
		});
	};

	/*
	 * ─────────────────────────────────────────
	 * POPUP
	 * ─────────────────────────────────────────
	 */

	const togglePopup = async (enabled: boolean) => {
		const formData = new FormData();

		formData.append("command_type", "admin");
		formData.append("command", "popup_toggle");
		formData.append("enabled", String(enabled));

		await submitCommand(
			formData,
			"popup-toggle",
			enabled ? "Popup enabled successfully." : "Popup disabled successfully.",
		);
	};

	const handlePopupImage = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0] ?? null;

		if (!file) {
			setPopupImage(null);
			return;
		}

		const error = validateImageFile(file);

		if (error) {
			showError(error);
			event.target.value = "";
			setPopupImage(null);
			return;
		}

		setPopupImage(file);
		clearMessage();
	};

	const changePopupImage = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const error = validateImageFile(popupImage);

		if (error) {
			showError(error);
			return;
		}

		const formData = new FormData();

		formData.append("command_type", "admin");
		formData.append("command", "popup_image");
		formData.append("image", popupImage!);

		const success = await submitCommand(
			formData,
			"popup-image",
			"Popup image updated successfully.",
		);

		if (success) {
			setPopupImage(null);

			if (popupImageInputRef.current) {
				popupImageInputRef.current.value = "";
			}
		}
	};

	return (
		<main className="min-h-screen bg-[#FBF9F7] px-4 py-6 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-7xl">
				{/* PAGE HEADER */}
				<div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-start gap-4">
						<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#85161B] text-white">
							<RefreshCw size={22} />
						</div>

						<div>
							<h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
								Store Customisation
							</h1>

							<p className="mt-1 text-sm text-gray-500">
								Manage your announcement strip, hero images and promotional
								popup.
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={loadConfig}
						disabled={loadingConfig}
						className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
					>
						<RefreshCw
							size={17}
							className={loadingConfig ? "animate-spin" : ""}
						/>
						Refresh
					</button>
				</div>

				{/* MESSAGE */}
				{message && (
					<div
						className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 ${
							message.type === "success"
								? "border-green-200 bg-green-50 text-green-800"
								: "border-red-200 bg-red-50 text-red-800"
						}`}
					>
						{message.type === "success" ? (
							<CheckCircle2 size={20} className="mt-0.5 shrink-0" />
						) : (
							<AlertCircle size={20} className="mt-0.5 shrink-0" />
						)}

						<div className="flex-1 text-sm font-medium">{message.text}</div>

						<button
							type="button"
							onClick={clearMessage}
							className="rounded-md p-1 hover:bg-black/5"
						>
							<X size={17} />
						</button>
					</div>
				)}

				{/* LOADING CONFIG */}
				{loadingConfig ? (
					<div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-gray-200 bg-white">
						<div className="flex flex-col items-center gap-3 text-gray-500">
							<Loader2 size={30} className="animate-spin text-[#85161B]" />
							<p className="text-sm">Loading store configuration...</p>
						</div>
					</div>
				) : (
					<div className="space-y-6">
						{/* ==================================================
						    ANNOUNCEMENT STRIP
						================================================== */}

						<section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
							<div className="border-b border-gray-100 px-5 py-5 sm:px-6">
								<div className="flex items-center justify-between gap-4">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#85161B]/10 text-[#85161B]">
											<Megaphone size={20} />
										</div>

										<div>
											<h2 className="text-lg font-semibold text-gray-900">
												Announcement Strip
											</h2>

											<p className="text-sm text-gray-500">
												Current announcements from your store configuration.
											</p>
										</div>
									</div>

									<div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
										{config.announcements.length}{" "}
										{config.announcements.length === 1 ? "item" : "items"}
									</div>
								</div>
							</div>

							<div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.2fr_1fr]">
								{/* Current announcements */}
								<div>
									<h3 className="mb-3 text-sm font-semibold text-gray-900">
										Current Announcements
									</h3>

									{config.announcements.length === 0 ? (
										<div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
											No announcements found in the site configuration.
										</div>
									) : (
										<div className="space-y-3">
											{config.announcements.map((item) => (
												<div
													key={item.index}
													className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4"
												>
													<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#85161B] text-xs font-bold text-white">
														{item.index}
													</div>

													<div className="min-w-0 flex-1">
														<p className="break-words text-sm leading-6 text-gray-800">
															{item.value}
														</p>

														<p className="mt-1 text-xs text-gray-400">
															Index {item.index}
														</p>
													</div>

													<div className="flex shrink-0 gap-2">
														<button
															type="button"
															onClick={() => editStrip(item.index, item.value)}
															className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
														>
															Edit
														</button>

														<button
															type="button"
															onClick={() => removeStrip(item.index)}
															disabled={loadingAction !== null}
															className="rounded-lg border border-red-200 bg-white p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
															aria-label={`Remove announcement ${item.index}`}
														>
															{isLoading("remove-strip") ? (
																<Loader2 size={15} className="animate-spin" />
															) : (
																<Trash2 size={15} />
															)}
														</button>
													</div>
												</div>
											))}
										</div>
									)}
								</div>

								{/* Add / edit */}
								<div className="space-y-5">
									<form
										onSubmit={addStrip}
										className="rounded-xl border border-gray-200 p-4"
									>
										<h3 className="font-semibold text-gray-900">
											Add Announcement
										</h3>

										<textarea
											value={stripValue}
											onChange={(event) => setStripValue(event.target.value)}
											rows={3}
											placeholder="🎉 New announcement message"
											className="mt-3 w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#85161B] focus:ring-2 focus:ring-[#85161B]/10"
										/>

										<button
											type="submit"
											disabled={loadingAction !== null}
											className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#85161B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6f1217] disabled:cursor-not-allowed disabled:opacity-60"
										>
											{isLoading("add-strip") ? (
												<Loader2 size={17} className="animate-spin" />
											) : (
												<Megaphone size={17} />
											)}
											Add Announcement
										</button>
									</form>

									<form
										onSubmit={changeStrip}
										className="rounded-xl border border-gray-200 p-4"
									>
										<h3 className="font-semibold text-gray-900">
											Edit Announcement
										</h3>

										<div className="mt-3 grid grid-cols-[100px_1fr] gap-3">
											<div>
												<label className="text-xs font-medium text-gray-600">
													Index
												</label>

												<input
													type="number"
													min="0"
													value={changeStripIndex}
													onChange={(event) =>
														setChangeStripIndex(event.target.value)
													}
													className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#85161B]"
												/>
											</div>

											<div>
												<label className="text-xs font-medium text-gray-600">
													Message
												</label>

												<input
													type="text"
													value={changeStripValue}
													onChange={(event) =>
														setChangeStripValue(event.target.value)
													}
													placeholder="Updated announcement"
													className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#85161B]"
												/>
											</div>
										</div>

										<button
											type="submit"
											disabled={loadingAction !== null}
											className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#85161B] bg-white px-4 py-2.5 text-sm font-semibold text-[#85161B] hover:bg-[#85161B]/5 disabled:opacity-50"
										>
											{isLoading("change-strip") ? (
												<Loader2 size={17} className="animate-spin" />
											) : (
												<RefreshCw size={17} />
											)}
											Update Announcement
										</button>
									</form>
								</div>
							</div>
						</section>

						{/* ==================================================
						    HERO IMAGES
						================================================== */}

						<section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
							<div className="border-b border-gray-100 px-5 py-5 sm:px-6">
								<div className="flex items-center justify-between gap-4">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#85161B]/10 text-[#85161B]">
											<ImageIcon size={20} />
										</div>

										<div>
											<h2 className="text-lg font-semibold text-gray-900">
												Hero Images
											</h2>

											<p className="text-sm text-gray-500">
												Current images in the hero carousel.
											</p>
										</div>
									</div>

									<div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
										{config.heroImages.length} images
									</div>
								</div>
							</div>

							<div className="p-5 sm:p-6">
								{/* Existing images */}
								{config.heroImages.length === 0 ? (
									<div className="mb-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
										No hero images found in the site configuration.
									</div>
								) : (
									<div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
										{config.heroImages.map((item) => (
											<div
												key={item.index}
												className="overflow-hidden rounded-xl border border-gray-200 bg-white"
											>
												<div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
													<img
														src={resolveImageUrl(item.url)}
														alt={`Hero image ${item.index}`}
														className="h-full w-full object-cover"
													/>

													<div className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-1 text-xs font-bold text-white">
														#{item.index}
													</div>
												</div>

												<div className="flex items-center gap-2 p-3">
													<button
														type="button"
														onClick={() => prepareHeroChange(item.index)}
														className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
													>
														<RefreshCw size={14} />
														Replace
													</button>

													<button
														type="button"
														onClick={() => removeHeroImage(item.index)}
														disabled={loadingAction !== null}
														className="flex items-center justify-center rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
													>
														<Trash2 size={15} />
													</button>
												</div>
											</div>
										))}
									</div>
								)}

								<div className="grid gap-6 lg:grid-cols-2">
									{/* ADD */}
									<form
										onSubmit={addHeroImage}
										className="rounded-xl border border-gray-200 p-4"
									>
										<h3 className="font-semibold text-gray-900">
											Add Hero Image
										</h3>

										<label className="mt-4 flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 text-center hover:border-[#85161B] hover:bg-[#85161B]/5">
											<input
												ref={heroAddInputRef}
												type="file"
												accept="image/*"
												onChange={handleHeroAddFile}
												className="hidden"
											/>

											<ImagePlus size={30} className="text-gray-400" />

											<span className="mt-2 text-sm font-medium text-gray-700">
												Choose image
											</span>

											<span className="mt-1 text-xs text-gray-500">
												Maximum 10 MB
											</span>
										</label>

										{heroAddFile && (
											<div className="mt-3 rounded-lg bg-gray-50 px-3 py-2">
												<p className="truncate text-sm font-medium">
													{heroAddFile.name}
												</p>

												<p className="text-xs text-gray-500">
													{formatFileSize(heroAddFile.size)}
												</p>
											</div>
										)}

										<button
											type="submit"
											disabled={loadingAction !== null}
											className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#85161B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6f1217] disabled:opacity-50"
										>
											{isLoading("add-hero") ? (
												<Loader2 size={17} className="animate-spin" />
											) : (
												<Upload size={17} />
											)}
											Add Hero Image
										</button>
									</form>

									{/* CHANGE */}
									<form
										id="hero-change-section"
										onSubmit={changeHeroImage}
										className="rounded-xl border border-gray-200 p-4"
									>
										<h3 className="font-semibold text-gray-900">
											Replace Hero Image
										</h3>

										<div className="mt-4">
											<label className="text-xs font-medium text-gray-600">
												Image Index
											</label>

											<input
												type="number"
												min="0"
												value={heroChangeIndex}
												onChange={(event) =>
													setHeroChangeIndex(event.target.value)
												}
												className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#85161B]"
											/>
										</div>

										<label className="mt-4 flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 text-center hover:border-[#85161B] hover:bg-[#85161B]/5">
											<input
												ref={heroChangeInputRef}
												type="file"
												accept="image/*"
												onChange={handleHeroChangeFile}
												className="hidden"
											/>

											<ImagePlus size={30} className="text-gray-400" />

											<span className="mt-2 text-sm font-medium text-gray-700">
												Choose replacement
											</span>

											<span className="mt-1 text-xs text-gray-500">
												Maximum 10 MB
											</span>
										</label>

										{heroChangeFile && (
											<div className="mt-3 rounded-lg bg-gray-50 px-3 py-2">
												<p className="truncate text-sm font-medium">
													{heroChangeFile.name}
												</p>

												<p className="text-xs text-gray-500">
													{formatFileSize(heroChangeFile.size)}
												</p>
											</div>
										)}

										<button
											type="submit"
											disabled={loadingAction !== null}
											className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#85161B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6f1217] disabled:opacity-50"
										>
											{isLoading("change-hero") ? (
												<Loader2 size={17} className="animate-spin" />
											) : (
												<RefreshCw size={17} />
											)}
											Replace Hero Image
										</button>
									</form>
								</div>
							</div>
						</section>

						{/* ==================================================
						    POPUP
						================================================== */}

						<section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
							<div className="border-b border-gray-100 px-5 py-5 sm:px-6">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#85161B]/10 text-[#85161B]">
										<ImageIcon size={20} />
									</div>

									<div>
										<h2 className="text-lg font-semibold text-gray-900">
											Promotional Popup
										</h2>

										<p className="text-sm text-gray-500">
											Manage popup visibility and image.
										</p>
									</div>
								</div>
							</div>

							<div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
								{/* STATUS */}
								<div className="rounded-xl border border-gray-200 p-5">
									<h3 className="font-semibold text-gray-900">
										Popup Visibility
									</h3>

									<div className="mt-5 flex items-center justify-between rounded-xl bg-gray-50 p-4">
										<div>
											<p className="text-sm font-semibold text-gray-900">
												Current status
											</p>

											<p className="mt-1 text-xs text-gray-500">
												{config.popupEnabled
													? "The popup is currently visible."
													: "The popup is currently disabled."}
											</p>
										</div>

										<div
											className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
												config.popupEnabled
													? "bg-green-100 text-green-700"
													: "bg-gray-200 text-gray-600"
											}`}
										>
											{config.popupEnabled ? "Enabled" : "Disabled"}
										</div>
									</div>

									<div className="mt-4 grid grid-cols-2 gap-3">
										<button
											type="button"
											onClick={() => togglePopup(true)}
											disabled={loadingAction !== null}
											className="flex items-center justify-center gap-2 rounded-lg bg-[#85161B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6f1217] disabled:opacity-50"
										>
											{isLoading("popup-toggle") ? (
												<Loader2 size={17} className="animate-spin" />
											) : (
												<CheckCircle2 size={17} />
											)}
											Enable
										</button>

										<button
											type="button"
											onClick={() => togglePopup(false)}
											disabled={loadingAction !== null}
											className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
										>
											{isLoading("popup-toggle") ? (
												<Loader2 size={17} className="animate-spin" />
											) : (
												<X size={17} />
											)}
											Disable
										</button>
									</div>
								</div>

								{/* POPUP IMAGE */}
								<form
									onSubmit={changePopupImage}
									className="rounded-xl border border-gray-200 p-5"
								>
									<h3 className="font-semibold text-gray-900">Popup Image</h3>

									{config.popupImage && (
										<div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
											<img
												src={resolveImageUrl(config.popupImage)}
												alt="Current popup"
												className="max-h-60 w-full object-contain"
											/>
										</div>
									)}

									<label className="mt-4 flex min-h-[130px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 text-center hover:border-[#85161B] hover:bg-[#85161B]/5">
										<input
											ref={popupImageInputRef}
											type="file"
											accept="image/*"
											onChange={handlePopupImage}
											className="hidden"
										/>

										<ImagePlus size={30} className="text-gray-400" />

										<span className="mt-2 text-sm font-medium text-gray-700">
											Choose new popup image
										</span>

										<span className="mt-1 text-xs text-gray-500">
											Maximum 10 MB
										</span>
									</label>

									{popupImage && (
										<div className="mt-3 rounded-lg bg-gray-50 px-3 py-2">
											<p className="truncate text-sm font-medium">
												{popupImage.name}
											</p>

											<p className="text-xs text-gray-500">
												{formatFileSize(popupImage.size)}
											</p>
										</div>
									)}

									<button
										type="submit"
										disabled={loadingAction !== null}
										className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#85161B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6f1217] disabled:opacity-50"
									>
										{isLoading("popup-image") ? (
											<Loader2 size={17} className="animate-spin" />
										) : (
											<Upload size={17} />
										)}
										Update Popup Image
									</button>
								</form>
							</div>
						</section>
					</div>
				)}
			</div>
		</main>
	);
}
