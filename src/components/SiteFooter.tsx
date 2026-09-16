"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Phone, ArrowRight } from "lucide-react";
import {
	FaInstagram,
	FaFacebookF,
	FaYoutube,
	FaWhatsapp,
} from "react-icons/fa";

interface ApiCategory {
	id: number;
	name: string;
	icon_path: string;
}

interface Category {
	id: string;
	name: string;
}

export default function SiteFooter() {
	const [categories, setCategories] = useState<Category[]>([]);
	const [isLoadingCategories, setIsLoadingCategories] = useState(true);

	/* =========================================================
	   FETCH CATEGORIES
	========================================================= */

	useEffect(() => {
		const fetchCategories = async () => {
			try {
				setIsLoadingCategories(true);

				const response = await fetch("/api/categories", {
					method: "GET",
					cache: "no-store",
				});

				if (!response.ok) {
					throw new Error("Failed to fetch categories");
				}

				const data = await response.json();

				console.log("Footer categories response:", data);

				if (!Array.isArray(data.categories)) {
					throw new Error("Invalid categories response");
				}

				const formattedCategories: Category[] = (
					data.categories as ApiCategory[]
				).map((category) => ({
					id: String(category.id),
					name: category.name,
				}));

				setCategories(formattedCategories);
			} catch (error) {
				console.error("Failed to fetch footer categories:", error);
				setCategories([]);
			} finally {
				setIsLoadingCategories(false);
			}
		};

		fetchCategories();
	}, []);

	/* =========================================================
	   SPLIT SHOP CATEGORIES
	   5 ITEMS PER COLUMN
	========================================================= */

	const categoryColumns = useMemo(() => {
		const columns: Category[][] = [];

		for (let i = 0; i < categories.length; i += 5) {
			columns.push(categories.slice(i, i + 5));
		}

		return columns;
	}, [categories]);

	return (
		<footer className="mt-20 w-full bg-[#A23939] text-white">
			<div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8 lg:py-14">
				{/* =====================================================
				    MAIN FOOTER
				===================================================== */}

				<div
					className="
						grid
						grid-cols-1
						gap-10
						sm:grid-cols-2
						lg:grid-cols-[0.9fr_2.4fr_0.9fr]
						lg:gap-x-14
						xl:gap-x-20
					"
				>
					{/* =================================================
					    BRAND
					================================================= */}

					<div className="min-w-0">
						<Link
							href="/"
							className="inline-block text-2xl font-semibold tracking-tight transition hover:text-white/90"
						>
							Printing House
						</Link>

						<p className="mt-4 max-w-xs text-sm leading-6 text-white/80">
							Personalized gifts & professional printing for every occasion.
						</p>

						{/* CONTACT */}
						<div className="mt-6 space-y-3.5 text-sm text-white/80">
							<a
								href="tel:+918827882713"
								className="group flex items-center gap-2.5 transition hover:text-white"
							>
								<Phone
									size={16}
									className="shrink-0 transition-transform group-hover:scale-105"
								/>
								<span>+91 88278 82713</span>
							</a>

							<a
								href="https://wa.me/918827882713?text=Hi"
								target="_blank"
								rel="noopener noreferrer"
								className="group flex items-center gap-2.5 transition hover:text-white"
							>
								<FaWhatsapp
									size={17}
									className="shrink-0 transition-transform group-hover:scale-105"
								/>
								<span>Chat on WhatsApp</span>
							</a>
						</div>
					</div>

					{/* =================================================
					    SHOP
					================================================= */}

					<div className="min-w-0">
						<h3
							className="mb-5 text-base font-semibold"
							style={{ color: "white" }}
						>
							Shop
						</h3>

						{/* =================================================
						    CATEGORY COLUMNS
						================================================= */}

						{isLoadingCategories ? (
							<div className="grid grid-cols-2 gap-x-8 sm:grid-cols-2 md:grid-cols-3">
								{Array.from({ length: 3 }).map((_, columnIndex) => (
									<div key={columnIndex} className="space-y-3">
										{Array.from({ length: 5 }).map((_, index) => (
											<div key={index}>
												<div className="h-4 w-28 animate-pulse rounded bg-white/10" />
											</div>
										))}
									</div>
								))}
							</div>
						) : (
							<div
								className="
									grid
									grid-cols-1
									gap-x-8
									gap-y-7
									sm:grid-cols-2
									md:grid-cols-3
								"
							>
								{categoryColumns.map((column, columnIndex) => (
									<ul
										key={columnIndex}
										className="space-y-2.5 text-sm text-white/80"
									>
										{column.map((category) => (
											<li key={category.id}>
												<Link
													href={`/shop?category=${encodeURIComponent(
														category.id,
													)}`}
													className="
														inline-flex
														items-center
														transition
														duration-200
														hover:translate-x-0.5
														hover:text-white
													"
												>
													{category.name}
												</Link>
											</li>
										))}
									</ul>
								))}
							</div>
						)}

						{/* =================================================
						    VIEW ALL
						================================================= */}

						{!isLoadingCategories && (
							<div className="mt-7">
								<Link
									href="/shop"
									className="
										group
										inline-flex
										items-center
										gap-1.5
										font-medium
										text-white
										transition
										hover:text-white/90
									"
								>
									<span>View All Products</span>

									<ArrowRight
										size={15}
										className="transition-transform duration-200 group-hover:translate-x-1"
									/>
								</Link>
							</div>
						)}
					</div>

					{/* =================================================
					    SOCIAL MEDIA
					================================================= */}

					<div className="min-w-0">
						<h3 className="mb-5 text-base font-semibold " style={{ color: "white" }}>
							Follow Us
						</h3>

						<p className="max-w-xs text-sm leading-6 text-white/75">
							Stay connected with Printing House for new products, offers and
							updates.
						</p>

						{/* SOCIAL ICONS */}
						<div className="mt-6 flex items-center gap-3">
							{/* INSTAGRAM */}
							<a
								href="https://www.instagram.com/printinghouseujjain/"
								target="_blank"
								rel="noopener noreferrer"
								aria-label="Instagram"
								className="
									flex
									h-10
									w-10
									items-center
									justify-center
									rounded-full
									bg-white/10
									transition
									duration-200
									hover:-translate-y-0.5
									hover:bg-white/20
								"
							>
								<FaInstagram size={18} />
							</a>

							{/* FACEBOOK */}
							<a
								href="https://www.facebook.com/61586784283566/"
								target="_blank"
								rel="noopener noreferrer"
								aria-label="Facebook"
								className="
									flex
									h-10
									w-10
									items-center
									justify-center
									rounded-full
									bg-white/10
									transition
									duration-200
									hover:-translate-y-0.5
									hover:bg-white/20
								"
							>
								<FaFacebookF size={17} />
							</a>

							{/* YOUTUBE */}
							<a
								href="https://www.youtube.com/@Printinghouseujjain/"
								target="_blank"
								rel="noopener noreferrer"
								aria-label="YouTube"
								className="
									flex
									h-10
									w-10
									items-center
									justify-center
									rounded-full
									bg-white/10
									transition
									duration-200
									hover:-translate-y-0.5
									hover:bg-white/20
								"
							>
								<FaYoutube size={19} />
							</a>

							{/* WHATSAPP */}
							<a
								href="https://wa.me/918827882713?text=Hi"
								target="_blank"
								rel="noopener noreferrer"
								aria-label="WhatsApp"
								className="
									flex
									h-10
									w-10
									items-center
									justify-center
									rounded-full
									bg-white/10
									transition
									duration-200
									hover:-translate-y-0.5
									hover:bg-white/20
								"
							>
								<FaWhatsapp size={19} />
							</a>
						</div>

						{/* PHONE */}
						<a
							href="tel:+918827882713"
							className="
								mt-5
								flex
								items-center
								gap-2.5
								text-sm
								text-white/80
								transition
								hover:text-white
							"
						>
							<Phone size={16} className="shrink-0" />
							<span>+91 88278 82713</span>
						</a>
					</div>
				</div>

				{/* =====================================================
				    BOTTOM FOOTER
				===================================================== */}

				<div className="mt-12 border-t border-white/20 pt-6">
					<div className="flex items-center justify-center text-center">
						<p className="text-xs text-white/65 sm:text-sm">
							© 2026 PrintingHouseUjjain — All rights reserved.
						</p>
					</div>
				</div>
			</div>
		</footer>
	);
}
