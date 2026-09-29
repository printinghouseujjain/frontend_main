"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */

interface ApiCategory {
	id: number;
	name: string;
	icon_path: string;
}

interface Category {
	id: string;
	title: string;
	slug: string;
	image: string;
}

/* ─────────────────────────────────────────
   API CONFIG
───────────────────────────────────────── */

const IMAGE_URL = "https://api.printinghouseujjain.in/assets/categories/";

/* ─────────────────────────────────────────
   CATEGORY SECTION
───────────────────────────────────────── */

export default function CategorySection() {
	const [categories, setCategories] = useState<Category[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");

	/* ─────────────────────────────────────
	   FETCH CATEGORIES
	───────────────────────────────────── */

	useEffect(() => {
		const fetchCategories = async () => {
			try {
				setIsLoading(true);
				setError("");

				const response = await fetch("/api/categories", {
					method: "GET",
					cache: "no-store",
				});

				if (!response.ok) {
					throw new Error("Failed to fetch categories");
				}

				const data = await response.json();

				console.log("Categories API response:", data);

				if (!Array.isArray(data.categories)) {
					throw new Error("Invalid categories response");
				}

				const formattedCategories: Category[] = (
					data.categories as ApiCategory[]
				).map((category) => ({
					id: String(category.id),

					title: category.name,

					slug: category.name
						.toLowerCase()
						.trim()
						.replace(/\s+/g, "-")
						.replace(/[^a-z0-9-]/g, ""),

					image: `${IMAGE_URL}${category.icon_path}`,
				}));

				setCategories(formattedCategories);
			} catch (error) {
				console.error("Failed to fetch categories:", error);
				setError("Unable to load categories.");
			} finally {
				setIsLoading(false);
			}
		};

		fetchCategories();
	}, []);

	return (
		<section className="w-full py-10 sm:py-12 lg:py-16">
			{/* ─────────────────────────────────
			    HEADER
			───────────────────────────────── */}

			<div className="mb-7 sm:mb-9">
				<div className="mb-3 flex items-center gap-3">
					<span className="h-px w-8 bg-[#85161B]" />

					<span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#85161B]">
						Explore
					</span>

					<span className="h-px w-8 bg-[#85161B]" />
				</div>

				<h2
					className="
						font-serif
						text-3xl
						font-semibold
						leading-tight
						tracking-[-0.02em]
						text-foreground
						sm:text-4xl
						lg:text-[40px]
					"
				>
					Shop by Category
				</h2>

				<p
					className="
						mt-2
						max-w-xl
						text-sm
						leading-6
						text-foreground/50
						sm:text-[15px]
					"
				>
					Find something thoughtful for every person, occasion and special
					moment.
				</p>
			</div>

			{/* ─────────────────────────────────
			    MAIN CATEGORY AREA
			───────────────────────────────── */}

			<div
				className="
					relative
					overflow-hidden
					border
					border-[#E8DDD6]
					bg-[#FBF7F3]
					rounded-tl-[28px]
					rounded-tr-[28px]
					rounded-bl-[6px]
					rounded-br-[6px]
					p-4
					sm:p-5
					lg:p-6
				"
			>
				{/* SUBTLE DECORATIVE LINE */}

				<div
					className="
						pointer-events-none
						absolute
						left-1/2
						top-0
						h-px
						w-24
						-translate-x-1/2
						bg-[#C9A39A]
					"
				/>

				{/* ─────────────────────────────
				    LOADING
				───────────────────────────── */}

				{isLoading && (
					<div
						className="
							grid
							grid-cols-2
							gap-3
							sm:grid-cols-3
							sm:gap-4
							md:grid-cols-4
							lg:grid-cols-5
							xl:grid-cols-6
							2xl:grid-cols-7
						"
					>
						{Array.from({ length: 7 }).map((_, index) => (
							<div
								key={index}
								className="
									overflow-hidden
									border
									border-[#E8DED8]
									bg-white
									rounded-tl-[50%]
									rounded-tr-[50%]
									rounded-bl-none
									rounded-br-none
								"
							>
								<div
									className="
										aspect-[1.05/1]
										w-full
										animate-pulse
										bg-[#EEE8E4]
									"
								/>

								<div className="flex h-11 items-center justify-center px-2">
									<div className="h-3 w-16 animate-pulse rounded bg-[#EEE8E4]" />
								</div>
							</div>
						))}
					</div>
				)}

				{/* ─────────────────────────────
				    ERROR
				───────────────────────────── */}

				{!isLoading && error && (
					<div
						role="alert"
						className="
							border
							border-red-200
							bg-red-50
							px-5
							py-5
							text-sm
							text-red-700
							rounded-tl-xl
							rounded-tr-xl
						"
					>
						{error}
					</div>
				)}

				{/* ─────────────────────────────
				    CATEGORIES GRID
				───────────────────────────── */}

				{!isLoading && !error && categories.length > 0 && (
					<div
						className="
							grid
							grid-cols-2
							gap-3
							sm:grid-cols-3
							sm:gap-4
							md:grid-cols-4
							lg:grid-cols-5
							xl:grid-cols-6
							2xl:grid-cols-7
						"
					>
						{categories.map((category) => (
							<Link
								key={category.id}
								href={`/shop?category=${encodeURIComponent(category.id)}`}
								aria-label={`Shop ${category.title}`}
								className="
									group
									min-w-0
									overflow-hidden
									border
									border-[#E3D7D0]
									bg-white
									text-center
									outline-none
									rounded-tl-[50%]
									rounded-tr-[50%]
									rounded-bl-none
									rounded-br-none
									transition-all
									duration-300
									ease-out
									hover:-translate-y-1
									hover:border-[#CDAEA5]
									hover:shadow-[0_14px_30px_rgba(87,45,35,0.10)]
									focus-visible:ring-2
									focus-visible:ring-[#85161B]/40
									focus-visible:ring-offset-2
								"
							>
								{/* ─────────────────────
								    IMAGE
								───────────────────── */}

								<div
									className="
										relative
										aspect-[1.08/1]
										w-full
										overflow-hidden
										bg-[#F2EAE4]
										rounded-tl-[50%]
										rounded-tr-[50%]
										rounded-bl-none
										rounded-br-none
									"
								>
									<Image
										src={category.image}
										alt={category.title}
										fill
										sizes="
											(max-width: 640px) 50vw,
											(max-width: 768px) 33vw,
											(max-width: 1024px) 25vw,
											(max-width: 1280px) 20vw,
											15vw
										"
										className="
											object-cover
											transition-transform
											duration-500
											ease-out
											group-hover:scale-[1.045]
										"
									/>

								</div>

								{/* ─────────────────────
								    CATEGORY TITLE
								───────────────────── */}

								<div
									className="
										flex
										min-h-[44px]
										items-center
										justify-center
										bg-white
										px-2.5
										py-2
									"
								>
									<h3
										className="
											w-full
											overflow-hidden
											text-ellipsis
											whitespace-nowrap
											text-[11px]
											font-semibold
											leading-4
											tracking-[-0.01em]
											text-[#292321]
											transition-colors
											duration-200
											group-hover:text-[#85161B]
											sm:text-xs
											md:text-[13px]
										"
										title={category.title}
									>
										{category.title}
									</h3>
								</div>
							</Link>
						))}
					</div>
				)}

				{/* ─────────────────────────────
				    EMPTY STATE
				───────────────────────────── */}

				{!isLoading && !error && categories.length === 0 && (
					<div
						className="
							border
							border-[#E4D9D2]
							bg-white
							px-5
							py-12
							text-center
							rounded-tl-[50%]
							rounded-tr-[50%]
						"
					>
						<div
							className="
								mx-auto
								flex
								h-12
								w-12
								items-center
								justify-center
								rounded-full
								bg-[#85161B]/10
								text-[#85161B]
							"
						>
							<svg
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.7"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-hidden="true"
							>
								<rect x="3" y="3" width="18" height="18" rx="2" />
								<path d="M3 9h18" />
								<path d="M9 21V9" />
							</svg>
						</div>

						<p className="mt-4 text-sm font-medium text-foreground/70">
							No categories available.
						</p>

						<p className="mt-1 text-xs text-foreground/40">
							Please check back again later.
						</p>
					</div>
				)}
			</div>
		</section>
	);
}
