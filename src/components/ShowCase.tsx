"use client";

import { useEffect, useRef, useState } from "react";

import Image from "next/image";

import { createPortal } from "react-dom";

import { ArrowUpRight, ChevronLeft, ChevronRight, Images } from "lucide-react";

import { assetUrl, fetchSiteConfig } from "@/app/lib/siteConfig";

export default function ShowcaseSection() {
	const [images, setImages] = useState<string[]>([]);

	const [loading, setLoading] = useState(true);

	const [selectedImage, setSelectedImage] = useState<string | null>(null);

	const [mounted, setMounted] = useState(false);

	const scrollerRef = useRef<HTMLDivElement | null>(null);

	/* =========================================================
	   MOUNT
	========================================================= */

	useEffect(() => {
		setMounted(true);
	}, []);

	/* =========================================================
	   FETCH SHOWCASE
	========================================================= */

	useEffect(() => {
		let mountedComponent = true;

		fetchSiteConfig()
			.then((config) => {
				if (!mountedComponent) {
					return;
				}

				setImages(
					Array.isArray(config.showcase) ? config.showcase.filter(Boolean) : [],
				);
			})
			.catch((error) => {
				console.error("Failed to load showcase:", error);
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

	/* =========================================================
	   PREVENT BODY SCROLL WHEN FULLSCREEN IMAGE IS OPEN
	========================================================= */

	useEffect(() => {
		if (!selectedImage) {
			return;
		}

		const originalOverflow = document.body.style.overflow;

		document.body.style.overflow = "hidden";

		return () => {
			document.body.style.overflow = originalOverflow;
		};
	}, [selectedImage]);

	/* =========================================================
	   ESCAPE TO CLOSE FULLSCREEN IMAGE
	========================================================= */

	useEffect(() => {
		if (!selectedImage) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setSelectedImage(null);
			}
		};

		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [selectedImage]);

	/* =========================================================
	   CAROUSEL SCROLL
	========================================================= */

	const scrollByCard = (direction: "left" | "right") => {
		const scroller = scrollerRef.current;

		if (!scroller) {
			return;
		}

		const card = scroller.querySelector<HTMLElement>("[data-showcase-card]");

		const cardWidth = card?.offsetWidth ?? scroller.clientWidth * 0.68;

		const gap = 12;

		const amount = cardWidth + gap;

		scroller.scrollBy({
			left: direction === "left" ? -amount : amount,
			behavior: "smooth",
		});
	};

	/* =========================================================
	   EMPTY STATE
	========================================================= */

	if (!loading && images.length === 0) {
		return null;
	}

	/* =========================================================
	   RENDER
	========================================================= */

	return (
		<>
			<section className="w-full py-10 sm:py-14 lg:py-20">
				{/* =================================================
				    HEADER
				================================================= */}

				<div className="mb-7 flex items-end justify-between gap-4 sm:mb-9">
					<div>
						<p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#85161B] sm:text-xs">
							Our work
						</p>

						<h2 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-[#2E2E2E] sm:text-4xl lg:text-5xl">
							A little look at what we make.
						</h2>

						<p className="mt-3 max-w-xl text-sm leading-6 text-[#6B625D] sm:text-base">
							Personalized gifts and professional printing, made with attention
							to the details that matter.
						</p>
					</div>

					{/* =================================================
					    DESKTOP CONTROLS
					================================================= */}

					<div className="hidden shrink-0 items-center gap-2 sm:flex">
						<div
							className="
								flex
								h-11
								w-11
								items-center
								justify-center
								rounded-full
								border
								border-[#E8DED7]
								text-[#85161B]
							"
						>
							<Images size={19} strokeWidth={1.7} />
						</div>

						{!loading && images.length > 0 && (
							<div className="flex items-center gap-1.5">
								<button
									type="button"
									aria-label="Scroll left"
									onClick={() => scrollByCard("left")}
									className="
											flex
											h-11
											w-11
											items-center
											justify-center
											rounded-full
											border
											border-[#E8DED7]
											text-[#2E2E2E]
											transition
											hover:border-[#85161B]/40
											hover:text-[#85161B]
										"
								>
									<ChevronLeft size={19} />
								</button>

								<button
									type="button"
									aria-label="Scroll right"
									onClick={() => scrollByCard("right")}
									className="
											flex
											h-11
											w-11
											items-center
											justify-center
											rounded-full
											border
											border-[#E8DED7]
											text-[#2E2E2E]
											transition
											hover:border-[#85161B]/40
											hover:text-[#85161B]
										"
								>
									<ChevronRight size={19} />
								</button>
							</div>
						)}
					</div>
				</div>

				{/* =================================================
				    LOADING SKELETON
				================================================= */}

				{loading ? (
					<div className="flex gap-3 overflow-hidden">
						{Array.from({
							length: 6,
						}).map((_, index) => (
							<div
								key={index}
								className="
									aspect-square
									w-[68vw]
									shrink-0
									animate-pulse
									rounded-2xl
									bg-[#F7D6BF]/30
									sm:w-[320px]
									lg:w-[340px]
								"
							/>
						))}
					</div>
				) : (
					/* =================================================
					   HORIZONTAL SHOWCASE
					================================================= */

					<div
						ref={scrollerRef}
						className="
							flex
							snap-x
							snap-mandatory
							gap-3
							overflow-x-auto
							overflow-y-hidden
							pb-2
							scroll-smooth
							scrollbar-hide
						"
					>
						{images.map((path, index) => {
							const imageUrl = assetUrl(path);

							return (
								<button
									key={`${path}-${index}`}
									type="button"
									data-showcase-card
									onClick={() => setSelectedImage(imageUrl)}
									aria-label={`View showcase image ${index + 1}`}
									className="
											group
											relative
											aspect-square
											w-[68vw]
											shrink-0
											snap-start
											overflow-hidden
											rounded-2xl
											bg-[#F7D6BF]/20
											sm:w-[320px]
											lg:w-[340px]
										"
								>
									{/* IMAGE */}

									<Image
										src={imageUrl}
										alt={`Printing House showcase ${index + 1}`}
										fill
										sizes="(max-width: 640px) 68vw, 340px"
										className="
												object-cover
												transition
												duration-700
												group-hover:scale-105
											"
										unoptimized
									/>

									{/* HOVER OVERLAY */}

									<div
										className="
												pointer-events-none
												absolute
												inset-0
												bg-gradient-to-t
												from-black/35
												via-transparent
												to-transparent
												opacity-0
												transition-opacity
												duration-300
												group-hover:opacity-100
											"
									/>

									{/* OPEN ICON */}

									<div
										className="
												pointer-events-none
												absolute
												bottom-3
												right-3
												flex
												h-9
												w-9
												items-center
												justify-center
												rounded-full
												bg-white/95
												text-[#85161B]
												opacity-0
												shadow-sm
												transition-all
												duration-300
												group-hover:opacity-100
											"
									>
										<ArrowUpRight size={16} />
									</div>
								</button>
							);
						})}
					</div>
				)}

				{/* =================================================
				    MOBILE SCROLL HINT
				================================================= */}

				{!loading && images.length > 1 && (
					<div className="mt-4 flex items-center justify-between sm:hidden">
						<p className="text-[11px] font-medium text-[#6B625D]/70">
							Swipe to explore
						</p>

						<div className="flex items-center gap-1.5">
							<span className="h-1.5 w-8 rounded-full bg-[#85161B]/20" />
							<span className="h-1.5 w-1.5 rounded-full bg-[#85161B]/40" />
							<span className="h-1.5 w-1.5 rounded-full bg-[#85161B]/40" />
						</div>
					</div>
				)}
			</section>

			{/* =====================================================
			    FULLSCREEN IMAGE PORTAL
			===================================================== */}

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
						onClick={() => setSelectedImage(null)}
					>
						{/* =================================================
						    CLOSE BUTTON
						================================================= */}

						<button
							type="button"
							aria-label="Close image"
							onClick={() => setSelectedImage(null)}
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

						{/* =================================================
						    FULLSCREEN IMAGE
						================================================= */}

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
							onClick={(event) => event.stopPropagation()}
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
