
"use client";

import {
	useEffect,
	useMemo,
	useState,
} from "react";

import Image from "next/image";

import {
	animate,
	motion,
	useMotionValue,
} from "framer-motion";

import {
	Quote,
	BadgeCheck,
} from "lucide-react";

import {
	assetUrl,
	fetchSiteConfig,
	type SiteReview,
} from "./siteConfig";

import ImageLightbox from "./ImageLightbox";

const FALLBACK_TESTIMONIALS: SiteReview[] = [];

function TestimonialCard({
	testimonial,
}: {
	testimonial: SiteReview;
}) {
	const [lightboxSrc, setLightboxSrc] = useState("");

	const photos =
		testimonial.photos ?? [];

	const initials = testimonial.name
		.split(" ")
		.filter(Boolean)
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();

	const starCount = Math.max(
		0,
		Math.min(
			5,
			Number(testimonial.star_count) || 0,
		),
	);

	return (
		<article
			className="
				group
				relative
				flex
				h-[310px]
				w-[300px]
				shrink-0
				flex-col
				justify-between
				overflow-hidden
				rounded-2xl
				bg-white
				p-6
				shadow-sm
				transition-all
				duration-300
				hover:-translate-y-1
				hover:shadow-lg
				sm:h-[330px]
				sm:w-[340px]
				sm:p-7
				lg:h-[340px]
				lg:w-[360px]
			"
		>
			<div
				className="
					pointer-events-none
					absolute
					right-5
					top-3
					text-[#F7D6BF]
					transition-transform
					duration-300
					group-hover:scale-110
				"
			>
				<Quote size={54} strokeWidth={1.5} fill="currentColor" />
			</div>

			<div className="relative z-10 min-h-0">
				<div className="mb-3 flex items-center gap-1">
					{Array.from({
						length: starCount,
					}).map((_, starIndex) => (
						<span
							key={starIndex}
							className="
									text-sm
									text-[#D89A3D]
								"
						>
							★
						</span>
					))}
				</div>

				<p
					className="
						line-clamp-4
						whitespace-pre-line
						text-[15px]
						leading-7
						text-[#2E2E2E]/75
						sm:text-base
					"
				>
					“{testimonial.description}”
				</p>

				{photos.length > 0 && (
					<div className="mt-4 flex flex-wrap gap-2">
						{photos.map((photo, index) => {
							const src = assetUrl(photo);

							return (
								<button
									key={`${photo}-${index}`}
									type="button"
									onClick={(event) => {
										event.stopPropagation();
										setLightboxSrc(src);
									}}
									className="relative h-16 w-16 min-h-16 min-w-16 shrink-0 aspect-square overflow-hidden rounded-xl bg-[#F7D6BF]/30"
									aria-label={`Open review photo ${index + 1}`}
								>
									<Image
										src={src}
										alt={`${testimonial.name} review photo ${index + 1}`}
										fill
										sizes="64px"
										className="object-cover"
									/>
								</button>
							);
						})}
					</div>
				)}

			{lightboxSrc ? (
				<ImageLightbox
					src={lightboxSrc}
					alt={`${testimonial.name} review photo`}
					onClose={() => setLightboxSrc("")}
				/>
			) : null}
			</div>

			<div
				className="
					flex
					items-center
					gap-3
					border-t
					border-[#2E2E2E]/10
					pt-5
				"
			>
				<div
					className="
						flex
						h-11
						w-11
						shrink-0
						items-center
						justify-center
						rounded-full
						bg-[#F7D6BF]
						text-sm
						font-bold
						text-[#85161B]
					"
				>
					{initials}
				</div>

				<div className="min-w-0">
					<div
						className="
							flex
							items-center
							gap-1.5
							text-sm
							font-semibold
							text-[#2E2E2E]
						"
					>
						<span className="truncate">{testimonial.name}</span>

						<BadgeCheck
							size={15}
							className="
								shrink-0
								text-[#85161B]
							"
							fill="#F7D6BF"
						/>
					</div>

					<div
						className="
							mt-0.5
							text-xs
							text-[#2E2E2E]/50
						"
					>
						Verified customer
					</div>
				</div>
			</div>
		</article>
	);
}

export default function Testimonials() {
	const [testimonials, setTestimonials] =
		useState<SiteReview[]>(
			FALLBACK_TESTIMONIALS,
		);

	/*
	 * Keep the marquee position in a motion value.
	 *
	 * This is important because when the user hovers,
	 * we stop the current animation without changing
	 * the current x position.
	 */
	const x = useMotionValue("0%");

	/*
	 * Keep track of the currently running animation.
	 * This allows us to stop it cleanly on unmount
	 * or when the testimonials change.
	 */
	const [isPaused, setIsPaused] =
		useState(false);

	useEffect(() => {
		let mounted = true;

		fetchSiteConfig()
			.then((config) => {
				if (
					mounted &&
					Array.isArray(
						config.reviews,
					)
				) {
					setTestimonials(
						config.reviews,
					);
				}
			})
			.catch((error) => {
				console.error(
					"Failed to load review config:",
					error,
				);
			});

		return () => {
			mounted = false;
		};
	}, []);

	const marqueeTestimonials =
		useMemo(
			() => [
				...testimonials,
				...testimonials,
			],
			[testimonials],
		);

	/*
	 * Start the marquee.
	 *
	 * The important difference from the previous
	 * implementation is that we animate the existing
	 * motion value instead of starting a new
	 * ["0%", "-50%"] animation.
	 */
	useEffect(() => {
		if (testimonials.length === 0) {
			return;
		}

		const animation = animate(
			x,
			"-50%",
			{
				duration: 100,
				ease: "linear",
				repeat: Infinity,
				repeatType: "loop",
			},
		);

		return () => {
			animation.stop();
		};
	}, [
		testimonials.length,
		x,
	]);

	/*
	 * Pause without resetting the current position.
	 */
	const handleMouseEnter = () => {
		setIsPaused(true);
		x.stop();
	};

	/*
	 * Resume from the CURRENT position.
	 *
	 * We calculate the remaining distance and use
	 * the same proportional speed as the original
	 * 100 second animation.
	 */
	const handleMouseLeave = () => {
		setIsPaused(false);

		const currentX =
			x.get();

		/*
		 * Convert the current percentage position
		 * into a number.
		 *
		 * Example:
		 * "-20.5%" -> -20.5
		 */
		const currentPercentage =
			parseFloat(
				String(currentX),
			);

		const current =
			Number.isFinite(
				currentPercentage,
			)
				? currentPercentage
				: 0;

		/*
		 * Distance remaining until -50%.
		 */
		const remainingDistance =
			Math.abs(
				-50 - current,
			);

		/*
		 * Original animation covers 50 percentage
		 * points in 100 seconds.
		 *
		 * Therefore:
		 * 50 points = 100 seconds
		 * 1 point  = 2 seconds
		 */
		const remainingDuration =
			remainingDistance * 2;

		/*
		 * If we're already at the end, let the
		 * animation restart from 0 naturally.
		 */
		if (
			remainingDistance <=
			0.01
		) {
			x.set("0%");

			animate(
				x,
				"-50%",
				{
					duration: 100,
					ease: "linear",
					repeat: Infinity,
					repeatType: "loop",
				},
			);

			return;
		}

		animate(
			x,
			"-50%",
			{
				duration:
					remainingDuration,
				ease: "linear",
				repeat: Infinity,
				repeatType: "loop",
			},
		);
	};

	return (
		<section
			className="
				my-10
				overflow-hidden
				rounded-3xl
				bg-[#F7D6BF]/25
				py-12
				sm:py-14
				lg:py-16
			"
		>
			<div className="mx-auto w-full">
				<div
					className="
						mb-9
						px-5
						text-center
						sm:px-6
						lg:px-8
					"
				>
					<p
						className="
							mb-2
							text-xs
							font-semibold
							uppercase
							tracking-[0.18em]
							text-[#85161B]/70
						"
					>
						Customer love
					</p>

					<h2
						className="
							text-3xl
							font-bold
							tracking-tight
							text-[#2E2E2E]
							sm:text-4xl
						"
					>
						What our customers say
					</h2>

					<p
						className="
							mx-auto
							mt-2
							max-w-xl
							text-sm
							leading-relaxed
							text-[#2E2E2E]/60
							sm:text-base
						"
					>
						Real experiences from people who made their moments a little more
						special with us.
					</p>
				</div>

				{testimonials.length > 0 ? (
					<div
						className="relative w-full overflow-hidden"
						onMouseEnter={
							handleMouseEnter
						}
						onMouseLeave={
							handleMouseLeave
						}
					>
						{/* Left fade */}
						<div
							className="
								pointer-events-none
								absolute
								left-0
								top-0
								z-10
								h-full
								w-10
								bg-gradient-to-r
								from-[#F9E9E0]/90
								to-transparent
								sm:w-20
							"
						/>

						{/* Right fade */}
						<div
							className="
								pointer-events-none
								absolute
								right-0
								top-0
								z-10
								h-full
								w-10
								bg-gradient-to-l
								from-[#F9E9E0]/90
								to-transparent
								sm:w-20
							"
						/>

						<motion.div
							className="
								flex
								w-max
								gap-5
								px-5
								sm:gap-6
								sm:px-6
							"
							style={{
								x,
							}}
						>
							{marqueeTestimonials.map(
								(
									testimonial,
									index,
								) => (
									<TestimonialCard
										key={`${testimonial.name}-${testimonial.timestamp}-${index}`}
										testimonial={
											testimonial
										}
									/>
								),
							)}
						</motion.div>
					</div>
				) : (
					<div
						className="
							px-5
							text-center
							text-sm
							text-[#2E2E2E]/50
						"
					>
						Loading customer reviews…
					</div>
				)}

				<div className="mt-8 px-5 text-center">
					<p
						className="
							text-sm
							text-[#2E2E2E]/55
						"
					>
						Loved by customers across India
					</p>
				</div>
			</div>
		</section>
	);
}
