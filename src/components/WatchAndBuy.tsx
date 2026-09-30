"use client";

import {
	useEffect,
	useMemo,
	useState,
} from "react";

import Link from "next/link";

import { createPortal } from "react-dom";

import {
	ArrowRight,
	Play,
	ShoppingBag,
	Sparkles,
} from "lucide-react";

import {
	assetUrl,
	fetchSiteConfig,
} from "@/app/lib/siteConfig";

type Product = {
	id: string;
	name: string;
	price: number;
	original: number;
	image: string;
};

type RawProduct = {
	id?: string | number;
	name?: string;
	price?: string | number;
	selling_price?: string | number;
	market_price?: string | number;
	original?: string | number;
	primary_photo_path?: string;
	primary_photo?: string;
	image?: string;
};

function extractProducts(
	data: unknown,
): RawProduct[] {
	if (Array.isArray(data)) {
		return data as RawProduct[];
	}

	if (
		!data ||
		typeof data !== "object"
	) {
		return [];
	}

	const value =
		data as Record<string, unknown>;

	if (Array.isArray(value.products)) {
		return value.products as RawProduct[];
	}

	if (Array.isArray(value.result)) {
		return value.result as RawProduct[];
	}

	if (Array.isArray(value.data)) {
		return value.data as RawProduct[];
	}

	return [];
}

function normalizeProduct(
	raw: RawProduct,
): Product | null {
	if (
		raw.id === undefined ||
		!raw.name
	) {
		return null;
	}

	const price = Number(
		raw.selling_price ??
			raw.price ??
			0,
	);

	const original = Number(
		raw.market_price ??
			raw.original ??
			price,
	);

	const image =
		raw.primary_photo_path ??
		raw.primary_photo ??
		raw.image ??
		"";

	return {
		id: String(raw.id),
		name: raw.name,
		price: Number.isFinite(price)
			? price
			: 0,
		original: Number.isFinite(
			original,
		)
			? original
			: price,
		image: image
			? assetUrl(image)
			: "",
	};
}

export default function WatchAndBuy() {
	const [videos, setVideos] =
		useState<
			Record<string, string>
		>({});

	const [products, setProducts] =
		useState<Product[]>([]);

	const [loading, setLoading] =
		useState(true);

	const [activeVideo, setActiveVideo] =
		useState<string | null>(null);

	const [mounted, setMounted] =
		useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		let mountedComponent = true;

		async function load() {
			try {
				const [
					config,
					productsResponse,
				] = await Promise.all([
					fetchSiteConfig(),

					fetch(
						"/api/products",
						{
							cache: "no-store",
						},
					),
				]);

				const productData =
					await productsResponse.json();

				const normalizedProducts =
					extractProducts(
						productData,
					)
						.map(
							normalizeProduct,
						)
						.filter(
							(
								product,
							): product is Product =>
								product !==
								null,
						);

				if (
					!mountedComponent
				) {
					return;
				}

				setVideos(
					config.watch_and_buy ??
						{},
				);

				setProducts(
					normalizedProducts,
				);
			} catch (error) {
				console.error(
					"Failed to load Watch & Buy:",
					error,
				);
			} finally {
				if (
					mountedComponent
				) {
					setLoading(false);
				}
			}
		}

		load();

		return () => {
			mountedComponent = false;
		};
	}, []);

	/*
	 * Prevent page scrolling while the
	 * fullscreen video is open.
	 */
	useEffect(() => {
		if (!activeVideo) {
			return;
		}

		const originalOverflow =
			document.body.style.overflow;

		document.body.style.overflow =
			"hidden";

		return () => {
			document.body.style.overflow =
				originalOverflow;
		};
	}, [activeVideo]);

	/*
	 * Escape closes the fullscreen video.
	 */
	useEffect(() => {
		if (!activeVideo) {
			return;
		}

		const handleKeyDown = (
			event: KeyboardEvent,
		) => {
			if (event.key === "Escape") {
				setActiveVideo(null);
			}
		};

		document.addEventListener(
			"keydown",
			handleKeyDown,
		);

		return () => {
			document.removeEventListener(
				"keydown",
				handleKeyDown,
			);
		};
	}, [activeVideo]);

	const items = useMemo(() => {
		return Object.entries(videos)
			.filter(
				([, video]) =>
					Boolean(video),
			)
			.map(
				([
					productId,
					video,
				]) => ({
					productId,
					video: assetUrl(
						video,
					),
					product:
						products.find(
							(product) =>
								product.id ===
								String(
									productId,
								),
						),
				}),
			);
	}, [videos, products]);

	if (
		!loading &&
		items.length === 0
	) {
		return null;
	}

	return (
		<>
			<section className="w-full py-10 sm:py-14 lg:py-20">
				<div className="mb-7 flex flex-col justify-between gap-5 sm:mb-9 sm:flex-row sm:items-end">
					<div>
						<div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[#85161B] sm:text-xs">
							<Sparkles size={13} />

							Watch & Buy
						</div>

						<h2 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-[#2E2E2E] sm:text-4xl lg:text-5xl">
							See it. Love it. Get it.
						</h2>

						<p className="mt-3 max-w-xl text-sm leading-6 text-[#6B625D] sm:text-base">
							Watch our products
							in action and
							explore the
							product directly.
						</p>
					</div>
				</div>

				{loading ? (
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
						{Array.from({
							length: 4,
						}).map(
							(_, index) => (
								<div
									key={
										index
									}
									className="aspect-[9/14] animate-pulse rounded-2xl bg-[#F7D6BF]/30"
								/>
							),
						)}
					</div>
				) : (
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
						{items.map(
							(item) => (
								<div
									key={
										item.productId
									}
									className="group overflow-hidden rounded-2xl border border-[#E8DED7] bg-white"
								>
									<button
										type="button"
										onClick={() =>
											setActiveVideo(
												item.video,
											)
										}
										className="relative block aspect-[9/13] w-full overflow-hidden bg-[#2E2E2E]"
									>
										<video
											src={
												item.video
											}
											muted
											loop
											autoPlay
											playsInline
											preload="metadata"
											className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
										/>

										<div className="absolute inset-0 bg-black/10 transition group-hover:bg-black/25" />

										<div className="absolute inset-0 flex items-center justify-center">
											<span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-[#85161B] shadow-lg transition group-hover:scale-110">
												<Play
													size={
														17
													}
													fill="currentColor"
													className="ml-0.5"
												/>
											</span>
										</div>
									</button>

									<div className="p-4">
										{item.product ? (
											<>
												<h3 className="line-clamp-2 text-sm font-semibold leading-5 text-[#2E2E2E]">
													{
														item
															.product
															.name
													}
												</h3>

												<div className="mt-2 flex items-center gap-2">
													<span className="text-base font-bold text-[#85161B]">
														₹
														{item.product.price.toLocaleString(
															"en-IN",
														)}
													</span>

													{item
														.product
														.original >
														item
															.product
															.price && (
														<span className="text-xs text-[#6B625D]/60 line-through">
															₹
															{item.product.original.toLocaleString(
																"en-IN",
															)}
														</span>
													)}
												</div>

												<Link
													href={`/product/${item.product.id}`}
													className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#85161B] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#6D1116]"
												>
													<ShoppingBag
														size={
															14
														}
													/>

													View
													product

													<ArrowRight
														size={
															14
														}
													/>
												</Link>
											</>
										) : (
											<>
												<p className="text-sm font-semibold text-[#2E2E2E]">
													Featured
													product
												</p>

												<Link
													href={`/product/${item.productId}`}
													className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#85161B]"
												>
													View
													product

													<ArrowRight
														size={
															13
														}
													/>
												</Link>
											</>
										)}
									</div>
								</div>
							),
						)}
					</div>
				)}
			</section>

			{activeVideo &&
				mounted &&
				createPortal(
					<div
						className="
							fixed
							inset-0
							z-[9999]
							flex
							h-[100dvh]
							w-screen
							items-center
							justify-center
							bg-black/90
							p-4
							sm:p-6
						"
						role="dialog"
						aria-modal="true"
						aria-label="Watch and Buy video"
						onClick={() =>
							setActiveVideo(
								null,
							)
						}
					>
						{/* Close button */}
						<button
							type="button"
							aria-label="Close video"
							onClick={() =>
								setActiveVideo(
									null,
								)
							}
							className="
								fixed
								right-4
								top-4
								z-[10001]
								flex
								h-11
								w-11
								items-center
								justify-center
								rounded-full
								bg-white
								text-2xl
								font-medium
								text-[#2E2E2E]
								shadow-xl
								transition
								hover:bg-[#F7D6BF]
								sm:right-6
								sm:top-6
							"
						>
							×
						</button>

						{/* Fullscreen video */}
						<div
							className="
								relative
								flex
								max-h-[calc(100dvh-2rem)]
								max-w-[calc(100vw-2rem)]
								items-center
								justify-center
								sm:max-h-[calc(100dvh-3rem)]
								sm:max-w-[calc(100vw-3rem)]
							"
							onClick={(
								event,
							) =>
								event.stopPropagation()
							}
						>
							<video
								src={
									activeVideo
								}
								controls
								autoPlay
								playsInline
								className="
									max-h-[calc(100dvh-2rem)]
									max-w-full
									rounded-xl
									object-contain
									shadow-2xl
									sm:max-h-[calc(100dvh-3rem)]
								"
							/>
						</div>
					</div>,
					document.body,
				)}
		</>
	);
}