"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck, Truck, Palette, BadgeCheck } from "lucide-react";

import { assetUrl, fetchSiteConfig } from "./siteConfig";

const HERO_COPY = [
	{
		tag: "Professional Printing",
		title: "Ujjain's First Dedicated Online Store",
		subtitle: "Personalized Gifts & Custom Printing",
	},
	{
		tag: "Personalized Gifts",
		title: "Gift Love, Gift Memories",
		subtitle:
			"Personalized photo gifts crafted with heart — mugs, cushions, frames & more",
	},
	{
		tag: "Professional Printing",
		title: "Print That Makes an Impression",
		subtitle:
			"Visiting cards, brochures, banners — delivered with precision and speed",
	},
];

const FEATURES = [
	{
		icon: Palette,
		title: "100% Customizable",
		subtitle: "Make it truly yours",
	},
	{
		icon: BadgeCheck,
		title: "Premium Quality",
		subtitle: "Crafted with care",
	},
	{
		icon: Truck,
		title: "Fast Delivery",
		subtitle: "Across India",
	},
	{
		icon: ShieldCheck,
		title: "Secure Payments",
		subtitle: "Safe checkout",
	},
];

export default function Hero() {
	const [heroPaths, setHeroPaths] = useState<string[]>([]);
	const [heroIdx, setHeroIdx] = useState(0);
	const [direction, setDirection] = useState(1);

	/*
	 * Fetch hero images directly from:
	 *
	 * https://api.printinghouseujjain.in/assets/config.json
	 */
	useEffect(() => {
		let mounted = true;

		fetchSiteConfig()
			.then((config) => {
				if (mounted && Array.isArray(config.hero)) {
					setHeroPaths(config.hero.filter(Boolean));
				}
			})
			.catch((error) => {
				console.error("Failed to load hero config:", error);
			});

		return () => {
			mounted = false;
		};
	}, []);

	const heroSlides = useMemo(
		() =>
			heroPaths.map((path, index) => ({
				id: `${path}-${index}`,

				...(HERO_COPY[index] ?? {
					tag: "Printing House Ujjain",
					title: "Personalized Gifts & Custom Printing",
					subtitle:
						"Quality printing and personalized products for every occasion",
				}),

				img: assetUrl(path),
			})),
		[heroPaths],
	);

	/*
	 * Make sure the active slide remains valid
	 * if config.json changes the number of slides.
	 */
	useEffect(() => {
		setHeroIdx((current) =>
			Math.min(current, Math.max(heroSlides.length - 1, 0)),
		);
	}, [heroSlides.length]);

	/*
	 * Automatic slider.
	 */
	useEffect(() => {
		if (heroSlides.length <= 1) return;

		const timer = setInterval(() => {
			setDirection(1);

			setHeroIdx((prev) => (prev + 1) % heroSlides.length);
		}, 10000);

		return () => clearInterval(timer);
	}, [heroSlides.length]);

	/*
	 * While config is loading.
	 */
	if (heroSlides.length === 0) {
		return (
			<>
				<div className="w-full bg-[#FBF9F7]">
					<section
						className="
							relative
							mx-4
							my-4
							aspect-[1000/375]
							overflow-hidden
							rounded-xl
							bg-[#F7D6BF]/20
							shadow-lg
							sm:mx-6
							sm:my-5
							sm:rounded-2xl
							lg:mx-8
						"
					/>
				</div>

				<HeroFeatures />
			</>
		);
	}

	const slide = heroSlides[heroIdx] ?? heroSlides[0];

	const nextSlide = () => {
		setDirection(1);

		setHeroIdx((prev) => (prev + 1) % heroSlides.length);
	};

	const previousSlide = () => {
		setDirection(-1);

		setHeroIdx((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
	};

	const goToSlide = (index: number) => {
		if (index === heroIdx) return;

		setDirection(index > heroIdx ? 1 : -1);

		setHeroIdx(index);
	};

	return (
		<>
			<div className="w-full bg-[#FBF9F7]">
				<section
					className="
						relative
						mx-4
						my-4
						aspect-[1000/375]
						overflow-hidden
						rounded-xl
						shadow-lg
						sm:mx-6
						sm:my-5
						sm:rounded-2xl
						lg:mx-8
					"
				>
					<AnimatePresence initial={false} custom={direction} mode="sync">
						<motion.div
							key={slide.id}
							custom={direction}
							variants={{
								enter: (dir: number) => ({
									x: dir > 0 ? "100%" : "-100%",
								}),

								center: {
									x: 0,
								},

								exit: (dir: number) => ({
									x: dir > 0 ? "-100%" : "100%",
								}),
							}}
							initial="enter"
							animate="center"
							exit="exit"
							transition={{
								x: {
									duration: 0.75,
									ease: [0.65, 0, 0.35, 1],
								},
							}}
							className="absolute inset-0"
						>
							<Image
								src={slide.img}
								alt={slide.title}
								fill
								loading={heroIdx === 0 ? "eager" : "lazy"}
								fetchPriority={heroIdx === 0 ? "high" : "auto"}
								sizes="(max-width: 640px) 100vw, (max-width: 1024px) calc(100vw - 48px), calc(100vw - 64px)"
								className="block h-full w-full"
								style={{
									objectFit: "fill",
								}}
							/>
						</motion.div>
					</AnimatePresence>

					{heroSlides.length > 1 && (
						<>
							<button
								type="button"
								onClick={previousSlide}
								aria-label="Previous slide"
								className="
									absolute
									left-3
									top-1/2
									z-20
									flex
									h-9
									w-9
									-translate-y-1/2
									items-center
									justify-center
									rounded-full
									border
									border-white/20
									bg-black/20
									text-2xl
									text-white
									backdrop-blur-sm
									transition-all
									duration-200
									hover:scale-105
									hover:bg-black/40
									active:scale-95
									sm:left-4
									sm:h-10
									sm:w-10
								"
							>
								‹
							</button>

							<button
								type="button"
								onClick={nextSlide}
								aria-label="Next slide"
								className="
									absolute
									right-3
									top-1/2
									z-20
									flex
									h-9
									w-9
									-translate-y-1/2
									items-center
									justify-center
									rounded-full
									border
									border-white/20
									bg-black/20
									text-2xl
									text-white
									backdrop-blur-sm
									transition-all
									duration-200
									hover:scale-105
									hover:bg-black/40
									active:scale-95
									sm:right-4
									sm:h-10
									sm:w-10
								"
							>
								›
							</button>

							<div
								className="
									absolute
									bottom-3
									left-1/2
									z-20
									flex
									-translate-x-1/2
									items-center
									gap-2
									sm:bottom-6
								"
							>
								{heroSlides.map((slideItem, index) => (
									<button
										key={slideItem.id}
										type="button"
										onClick={() => goToSlide(index)}
										aria-label={`Go to slide ${index + 1}`}
										aria-current={index === heroIdx ? "true" : undefined}
										className="
												h-2
												rounded-full
												transition-all
												duration-300
											"
										style={{
											width: index === heroIdx ? 26 : 8,

											background:
												index === heroIdx ? "white" : "rgba(255,255,255,0.45)",
										}}
									/>
								))}
							</div>
						</>
					)}
				</section>
			</div>

			<HeroFeatures />
		</>
	);
}

export function HeroFeatures() {
	return (
		<section className="w-full py-5 sm:py-6">
			<div
				className="
					grid
					grid-cols-2
					overflow-hidden
					rounded-2xl
					border-y
					border-[#2E2E2E]/10
					py-3
					lg:flex
					lg:items-center
					lg:justify-center
					lg:py-4
				"
			>
				{FEATURES.map((item, index) => {
					const Icon = item.icon;

					return (
						<div key={item.title} className="contents">
							<motion.div
								initial={{
									opacity: 0,
									y: 8,
								}}
								whileInView={{
									opacity: 1,
									y: 0,
								}}
								viewport={{
									once: true,
									amount: 0.2,
								}}
								transition={{
									duration: 0.3,
									delay: index * 0.05,
								}}
								className="
										flex
										items-center
										gap-2.5
										px-4
										py-3
										sm:px-6
										lg:flex-1
										lg:justify-center
										lg:px-7
										lg:py-1
									"
							>
								<div
									className="
											flex
											h-9
											w-9
											shrink-0
											items-center
											justify-center
											rounded-full
											bg-[#F7D6BF]/50
											text-[#85161B]
											sm:h-10
											sm:w-10
										"
								>
									<Icon size={18} strokeWidth={1.8} />
								</div>

								<div className="min-w-0">
									<div
										className="
												text-xs
												font-semibold
												text-[#2E2E2E]
												sm:text-sm
											"
									>
										{item.title}
									</div>

									<div
										className="
												mt-0.5
												text-[10px]
												text-[#2E2E2E]/50
												sm:text-xs
											"
									>
										{item.subtitle}
									</div>
								</div>
							</motion.div>

							{index < FEATURES.length - 1 && (
								<div
									aria-hidden="true"
									className="
											hidden
											h-9
											w-px
											bg-[#2E2E2E]/10
											lg:block
										"
								/>
							)}
						</div>
					);
				})}
			</div>
		</section>
	);
}
