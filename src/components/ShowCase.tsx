"use client";

import {
	useEffect,
	useState,
} from "react";

import Image from "next/image";

import { createPortal } from "react-dom";

import {
	ArrowUpRight,
	Images,
} from "lucide-react";

import {
	assetUrl,
	fetchSiteConfig,
} from "@/app/lib/siteConfig";

export default function ShowcaseSection() {
	const [images, setImages] =
		useState<string[]>([]);

	const [loading, setLoading] =
		useState(true);

	const [selectedImage, setSelectedImage] =
		useState<string | null>(null);

	const [mounted, setMounted] =
		useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		let mountedComponent = true;

		fetchSiteConfig()
			.then((config) => {
				if (!mountedComponent) return;

				setImages(
					Array.isArray(config.showcase)
						? config.showcase.filter(Boolean)
						: [],
				);
			})
			.catch((error) => {
				console.error(
					"Failed to load showcase:",
					error,
				);
			})
			.finally(() => {
				if (mountedComponent) {
					setLoading(false);
				}
			});

		return () => {
			mountedComponent = false;
		};
	}, []);

	/*
	 * Prevent page scrolling while the fullscreen
	 * showcase image is open.
	 */
	useEffect(() => {
		if (!selectedImage) {
			return;
		}

		const originalOverflow =
			document.body.style.overflow;

		document.body.style.overflow = "hidden";

		return () => {
			document.body.style.overflow =
				originalOverflow;
		};
	}, [selectedImage]);

	/*
	 * Close the fullscreen image with Escape.
	 */
	useEffect(() => {
		if (!selectedImage) {
			return;
		}

		const handleKeyDown = (
			event: KeyboardEvent,
		) => {
			if (event.key === "Escape") {
				setSelectedImage(null);
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
	}, [selectedImage]);

	if (
		!loading &&
		images.length === 0
	) {
		return null;
	}

	return (
		<>
			<section className="w-full py-10 sm:py-14 lg:py-20">
				<div className="mb-7 flex items-end justify-between gap-4 sm:mb-9">
					<div>
						<p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#85161B] sm:text-xs">
							Our work
						</p>

						<h2 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-[#2E2E2E] sm:text-4xl lg:text-5xl">
							A little look at what we make.
						</h2>

						<p className="mt-3 max-w-xl text-sm leading-6 text-[#6B625D] sm:text-base">
							Personalized gifts and professional
							printing, made with attention to the
							details that matter.
						</p>
					</div>

					<div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E8DED7] text-[#85161B] sm:flex">
						<Images
							size={19}
							strokeWidth={1.7}
						/>
					</div>
				</div>

				{loading ? (
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
						{Array.from({
							length: 8,
						}).map((_, index) => (
							<div
								key={index}
								className="aspect-square animate-pulse rounded-2xl bg-[#F7D6BF]/30"
							/>
						))}
					</div>
				) : (
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
						{images.map(
							(path, index) => {
								const imageUrl =
									assetUrl(path);

								return (
									<button
										key={`${path}-${index}`}
										type="button"
										onClick={() =>
											setSelectedImage(
												imageUrl,
											)
										}
										className="group relative aspect-square overflow-hidden rounded-2xl bg-[#F7D6BF]/20"
									>
										<Image
											src={
												imageUrl
											}
											alt={`Printing House showcase ${index + 1}`}
											fill
											sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
											className="object-cover transition duration-700 group-hover:scale-105"
											unoptimized
										/>

										<div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

										<div className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#85161B] opacity-0 shadow-sm transition-all duration-300 group-hover:opacity-100">
											<ArrowUpRight size={16} />
										</div>
									</button>
								);
							},
						)}
					</div>
				)}
			</section>

			{selectedImage &&
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
						aria-label="Showcase image"
						onClick={() =>
							setSelectedImage(null)
						}
					>
						{/* Close button */}
						<button
							type="button"
							aria-label="Close image"
							onClick={() =>
								setSelectedImage(null)
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

						{/* Fullscreen image */}
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
							onClick={(event) =>
								event.stopPropagation()
							}
						>
							<img
								src={selectedImage}
								alt="Printing House showcase"
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