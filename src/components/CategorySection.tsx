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

				/*
				 * Convert backend response into the format
				 * used by the UI.
				 */

				const formattedCategories: Category[] = (
					data.categories as ApiCategory[]
				).map((category) => ({
					id: String(category.id),

					title: category.name,

					/*
					 * Backend doesn't provide a slug,
					 * so we generate one from the category name.
					 */
					slug: category.name
						.toLowerCase()
						.trim()
						.replace(/\s+/g, "-")
						.replace(/[^a-z0-9-]/g, ""),

					/*
					 * Backend only provides the filename.
					 *
					 * Example:
					 * 1_2.png
					 *
					 * becomes:
					 * https://api.printinghouseujjain.in/assets/product/1_2.png
					 */
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
		<section className="w-full py-12 sm:py-14">
			{/* ─────────────────────────────────────
			    SECTION HEADING
			───────────────────────────────────── */}

			<div className="mb-8 sm:mb-10">
				<h2 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
					Shop by Category
				</h2>

				<p className="mt-2 text-sm text-foreground/60 sm:text-base">
					Find something special for every occasion.
				</p>
			</div>

			{/* ─────────────────────────────────────
			    LOADING STATE
			───────────────────────────────────── */}

			{isLoading && (
				<div className="flex gap-6 overflow-hidden px-1 pb-5">
					{Array.from({ length: 6 }).map((_, index) => (
						<div
							key={index}
							className="
								flex
								min-w-[160px]
								flex-col
								items-center
								sm:min-w-[175px]
								lg:min-w-[180px]
							"
						>
							<div
								className="
									h-[160px]
									w-[160px]
									animate-pulse
									rounded-full
									bg-neutral-200
									sm:h-[175px]
									sm:w-[175px]
									lg:h-[180px]
									lg:w-[180px]
								"
							/>

							<div
								className="
									mt-4
									h-4
									w-20
									animate-pulse
									rounded
									bg-neutral-200
								"
							/>
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
						rounded-xl
						border
						border-red-200
						bg-red-50
						px-4
						py-3
						text-sm
						text-red-700
					"
				>
					{error}
				</div>
			)}

			{/* ─────────────────────────────────────
			    CATEGORIES
			───────────────────────────────────── */}

			{!isLoading && !error && categories.length > 0 && (
				<div
					className="
						flex
						gap-6
						overflow-x-auto
						px-1
						pb-5
						snap-x
						snap-mandatory
						scrollbar-hide
					"
				>
					{categories.map((category) => (
						<Link
							key={category.id}
							href={`/shop?category=${encodeURIComponent(category.id)}`}
							aria-label={`Shop ${category.title}`}
							className="
								group
								flex
								min-w-[160px]
								flex-col
								items-center
								snap-start
								rounded-xl
								outline-none
								transition-transform
								duration-200
								hover:-translate-y-1
								focus-visible:ring-2
								focus-visible:ring-foreground/40
								sm:min-w-[175px]
								lg:min-w-[180px]
							"
						>
							{/* ─────────────────────────
							    CATEGORY IMAGE
							───────────────────────── */}

							<div
								className="
									relative
									h-[160px]
									w-[160px]
									overflow-hidden
									rounded-full
									bg-neutral-100
									transition-all
									duration-300
									group-hover:scale-[1.03]
									group-hover:shadow-lg
									sm:h-[175px]
									sm:w-[175px]
									lg:h-[180px]
									lg:w-[180px]
								"
							>
								<Image
									src={category.image}
									alt={category.title}
									fill
									sizes="
										(max-width: 640px) 160px,
										(max-width: 1024px) 175px,
										180px
									"
									className="
										object-cover
										transition-transform
										duration-500
										group-hover:scale-105
									"
								/>
							</div>

							{/* ─────────────────────────
							    CATEGORY NAME
							───────────────────────── */}

							<span
								className="
									mt-4
									text-center
									text-sm
									font-medium
									text-foreground
									transition-colors
									duration-200
									group-hover:text-foreground/70
									sm:text-base
								"
							>
								{category.title}
							</span>
						</Link>
					))}
				</div>
			)}

			{/* ─────────────────────────────────────
			    EMPTY STATE
			───────────────────────────────────── */}

			{!isLoading && !error && categories.length === 0 && (
				<div className="rounded-xl border border-[#E9DED7] bg-white px-4 py-8 text-center">
					<p className="text-sm text-foreground/50">No categories available.</p>
				</div>
			)}
		</section>
	);
}
