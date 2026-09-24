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

const IMAGE_URL =
	"https://api.printinghouseujjain.in/assets/categories/";

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
		<section className="w-full py-12 sm:py-16 lg:py-20">
			{/* ─────────────────────────────────────
			    SECTION HEADER
			───────────────────────────────────── */}

			<div className="mb-8 flex items-end justify-between gap-4 sm:mb-10">
				<div>
					<div className="mb-3 flex items-center gap-3">
						<span className="h-px w-8 bg-[#85161B]" />

						<span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#85161B]">
							Explore
						</span>
					</div>

					<h2 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[42px]">
						Shop by Category
					</h2>

					<p className="mt-2 max-w-xl text-sm leading-6 text-foreground/55 sm:text-base">
						Discover thoughtful gifts and personalised products
						made for every occasion.
					</p>
				</div>

				{/* CATEGORY COUNT */}

				{!isLoading && !error && categories.length > 0 && (
					<div className="hidden shrink-0 rounded-full border border-[#E9DED7] bg-[#FFF9F6] px-4 py-2 text-xs font-medium text-[#85161B] sm:block">
						{categories.length}{" "}
						{categories.length === 1 ? "Category" : "Categories"}
					</div>
				)}
			</div>

			{/* ─────────────────────────────────────
			    LOADING STATE
			───────────────────────────────────── */}

			{isLoading && (
				<div
					className="
						grid
						grid-cols-2
						gap-3
						sm:grid-cols-3
						sm:gap-5
						lg:grid-cols-4
						xl:grid-cols-5
					"
				>
					{Array.from({ length: 10 }).map((_, index) => (
						<div
							key={index}
							className="
								overflow-hidden
								rounded-2xl
								border
								border-[#EEE5E0]
								bg-white
							"
						>
							<div
								className="
									aspect-square
									w-full
									animate-pulse
									bg-neutral-200
								"
							/>

							<div className="p-3 sm:p-4">
								<div className="h-4 w-3/4 animate-pulse rounded bg-neutral-200" />

								<div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-neutral-100" />
							</div>
						</div>
					))}
				</div>
			)}

			{/* ─────────────────────────────────────
			    ERROR STATE
			───────────────────────────────────── */}

			{!isLoading && error && (
				<div
					role="alert"
					className="
						rounded-2xl
						border
						border-red-200
						bg-red-50
						px-5
						py-5
						text-sm
						text-red-700
					"
				>
					{error}
				</div>
			)}

			{/* ─────────────────────────────────────
			    CATEGORIES GRID
			───────────────────────────────────── */}

			{!isLoading && !error && categories.length > 0 && (
				<div
					className="
						grid
						grid-cols-2
						gap-3
						sm:grid-cols-3
						sm:gap-5
						lg:grid-cols-4
						xl:grid-cols-5
						2xl:grid-cols-6
					"
				>
					{categories.map((category) => (
						<Link
							key={category.id}
							href={`/shop?category=${encodeURIComponent(category.id)}`}
							aria-label={`Shop ${category.title}`}
							className="
								group
								relative
								overflow-hidden
								rounded-2xl
								border
								border-[#E9DED7]
								bg-white
								outline-none
								transition-all
								duration-300
								hover:-translate-y-1
								hover:border-[#D9BDB5]
								hover:shadow-[0_12px_35px_rgba(133,22,27,0.10)]
								focus-visible:ring-2
								focus-visible:ring-[#85161B]/40
								focus-visible:ring-offset-2
							"
						>
							{/* ─────────────────────────
							    IMAGE
							───────────────────────── */}

							<div className="relative aspect-square w-full overflow-hidden bg-[#F8F3F0]">
								<Image
									src={category.image}
									alt={category.title}
									fill
									sizes="
										(max-width: 640px) 50vw,
										(max-width: 1024px) 33vw,
										(max-width: 1280px) 25vw,
										20vw
									"
									className="
										object-cover
										transition-transform
										duration-500
										ease-out
										group-hover:scale-105
									"
								/>

								{/* IMAGE OVERLAY */}

								<div
									className="
										pointer-events-none
										absolute
										inset-0
										bg-gradient-to-t
										from-black/30
										via-transparent
										to-transparent
										opacity-60
										transition-opacity
										duration-300
										group-hover:opacity-80
									"
								/>

								{/* EXPLORE BADGE */}

								<div
									className="
										absolute
										bottom-3
										right-3
										flex
										h-8
										w-8
										items-center
										justify-center
										rounded-full
										bg-white/95
										text-[#85161B]
										opacity-0
										shadow-sm
										backdrop-blur-sm
										transition-all
										duration-300
										group-hover:opacity-100
										group-hover:translate-x-0
										translate-x-2
									"
								>
									<svg
										width="15"
										height="15"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										aria-hidden="true"
									>
										<path d="M5 12h14" />
										<path d="m13 6 6 6-6 6" />
									</svg>
								</div>
							</div>

							{/* ─────────────────────────
							    CATEGORY DETAILS
							───────────────────────── */}

							<div className="px-3 py-3 sm:px-4 sm:py-4">
								<h3
									className="
										line-clamp-2
										text-center
										text-sm
										font-semibold
										leading-5
										text-foreground
										transition-colors
										duration-200
										group-hover:text-[#85161B]
										sm:text-[15px]
									"
								>
									{category.title}
								</h3>

								<p
									className="
										mt-1.5
										text-center
										text-[11px]
										font-medium
										uppercase
										tracking-[0.12em]
										text-foreground/35
										transition-colors
										duration-200
										group-hover:text-[#85161B]/60
										sm:text-xs
									"
								>
									Explore
								</p>
							</div>
						</Link>
					))}
				</div>
			)}

			{/* ─────────────────────────────────────
			    EMPTY STATE
			───────────────────────────────────── */}

			{!isLoading && !error && categories.length === 0 && (
				<div
					className="
						rounded-2xl
						border
						border-[#E9DED7]
						bg-[#FFF9F6]
						px-5
						py-12
						text-center
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
							strokeWidth="1.8"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<rect
								x="3"
								y="3"
								width="18"
								height="18"
								rx="2"
							/>
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
		</section>
	);
}