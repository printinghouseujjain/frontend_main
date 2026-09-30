"use client";

import {
	useEffect,
	useState,
} from "react";

import { createPortal } from "react-dom";

import {
	Play,
	Video,
} from "lucide-react";

import {
	assetUrl,
	fetchSiteConfig,
} from "@/app/lib/siteConfig";

export default function SocialVideos() {
	const [videos, setVideos] =
		useState<string[]>([]);

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

		fetchSiteConfig()
			.then((config) => {
				if (!mountedComponent) return;

				setVideos(
					Array.isArray(config.videos)
						? config.videos.filter(Boolean)
						: [],
				);
			})
			.catch((error) => {
				console.error(
					"Failed to load social videos:",
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
	 * Lock page scrolling while the fullscreen
	 * video is open.
	 */
	useEffect(() => {
		if (!activeVideo) {
			return;
		}

		const originalOverflow =
			document.body.style.overflow;

		document.body.style.overflow = "hidden";

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

	if (
		!loading &&
		videos.length === 0
	) {
		return null;
	}

	return (
		<>
			<section className="w-full py-10 sm:py-14 lg:py-20">
				<div className="mb-7 flex items-end justify-between gap-4 sm:mb-9">
					<div>
						<p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#85161B] sm:text-xs">
							From our socials
						</p>

						<h2 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-[#2E2E2E] sm:text-4xl lg:text-5xl">
							See it come to life.
						</h2>

						<p className="mt-3 max-w-xl text-sm leading-6 text-[#6B625D] sm:text-base">
							Watch our latest creations,
							products and behind-the-scenes
							moments.
						</p>
					</div>

					<div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E8DED7] text-[#85161B] sm:flex">
						<Video
							size={19}
							strokeWidth={1.7}
						/>
					</div>
				</div>

				{loading ? (
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
						{Array.from({
							length: 4,
						}).map((_, index) => (
							<div
								key={index}
								className="aspect-[9/14] animate-pulse rounded-2xl bg-[#F7D6BF]/30"
							/>
						))}
					</div>
				) : (
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
						{videos.map(
							(path, index) => {
								const videoUrl =
									assetUrl(path);

								return (
									<button
										key={`${path}-${index}`}
										type="button"
										onClick={() =>
											setActiveVideo(
												videoUrl,
											)
										}
										className="group relative aspect-[9/14] overflow-hidden rounded-2xl bg-[#2E2E2E]"
									>
										<video
											src={
												videoUrl
											}
											muted
											loop
											autoPlay
											playsInline
											preload="metadata"
											className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
										/>

										<div className="absolute inset-0 bg-black/15 transition group-hover:bg-black/30" />

										<div className="absolute inset-0 flex items-center justify-center">
											<div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-[#85161B] shadow-lg transition duration-300 group-hover:scale-110">
												<Play
													size={19}
													fill="currentColor"
													className="ml-0.5"
												/>
											</div>
										</div>

										<div className="absolute bottom-3 left-3 right-3 text-left">
											<span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80">
												Watch
												video
											</span>
										</div>
									</button>
								);
							},
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
						aria-label="Social video"
						onClick={() =>
							setActiveVideo(null)
						}
					>
						{/* Close button */}
						<button
							type="button"
							aria-label="Close video"
							onClick={() =>
								setActiveVideo(null)
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
								h-auto
								max-h-[calc(100dvh-2rem)]
								w-auto
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
							<video
								src={activeVideo}
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