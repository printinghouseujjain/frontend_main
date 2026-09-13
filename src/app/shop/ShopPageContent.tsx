"use client";

import React, { useEffect, useMemo, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import ProductCard from "../../components/ProductCard";

import { CartProvider } from "../../context/CartContext";

import {
	Search,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	SlidersHorizontal,
	X,
} from "lucide-react";

/* =========================================================
   CONSTANTS
========================================================= */

const API_URL = "/api/shop-data";

const PRODUCT_IMAGE_URL = "https://api.printinghouseujjain.in/assets/products/";

const PRODUCTS_PER_PAGE = 8;

/* =========================================================
   API TYPES
========================================================= */

interface ApiCategory {
	id: number;
	name: string;
	icon_path: string;
}

interface ApiOccasion {
	id: number;
	name: string;
	icon_path: string;
}

interface ApiProduct {
	id: number;
	name: string;
	description?: string | null;
	varients?: string | null;
	primary_photo_path?: string | null;
	other_photos_paths?: string | null;
	market_price?: string | number | null;
	selling_price?: string | number | null;
	reseller_price?: string | number | null;
	category_ids?: string | null;
	occasion_ids?: string | null;
	in_stock?: string | null;
	sold?: number;

	/*
	 * Backend normally returns this as a JSON string:
	 *
	 * '["text:10:Enter your custom name"]'
	 *
	 * But we also support an already parsed array.
	 */
	customize_reqs?: string | string[] | null;

	keywords?: string | null;
	created_at?: string;
	delivery?: string | number | null;
}

/* =========================================================
   FRONTEND PRODUCT TYPE
========================================================= */

interface Product {
	id: string;
	name: string;
	price: number;
	original: number;
	image: string;
	categoryIds: number[];
	occasionIds: number[];
	categoryNames: string[];
	occasionNames: string[];
	description: string;
	inStock: boolean;

	customizeReqs: string | string[] | null;
}

/* =========================================================
   SORT OPTIONS
========================================================= */

const SORT_OPTIONS = [
	"Featured",
	"Price: Low to High",
	"Price: High to Low",
	"Name: A-Z",
];

/* =========================================================
   HELPERS
========================================================= */

function parseIds(value?: string | null): number[] {
	if (!value) {
		return [];
	}

	try {
		const parsed = JSON.parse(value);

		if (!Array.isArray(parsed)) {
			return [];
		}

		return parsed.map((id) => Number(id)).filter((id) => !Number.isNaN(id));
	} catch {
		return [];
	}
}

function createSlug(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/&/g, "and")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/* =========================================================
   SHOP PAGE
========================================================= */

export default function ShopPage() {
	const router = useRouter();
	const searchParams = useSearchParams();

	/* =====================================================
	   URL FILTERS
	===================================================== */

	const categoryFromUrl = searchParams.get("category");

	const occasionFromUrl = searchParams.get("occasion");

	const searchFromUrl = searchParams.get("search");

	/* =====================================================
	   API DATA
	===================================================== */

	const [categories, setCategories] = useState<ApiCategory[]>([]);

	const [occasions, setOccasions] = useState<ApiOccasion[]>([]);

	const [products, setProducts] = useState<Product[]>([]);

	const [loading, setLoading] = useState(true);

	const [error, setError] = useState("");

	/* =====================================================
	   FILTER STATE
	===================================================== */

	const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

	const [selectedOccasions, setSelectedOccasions] = useState<number[]>([]);

	const [search, setSearch] = useState("");

	const [sortOpen, setSortOpen] = useState(false);

	const [sort, setSort] = useState("Featured");

	const [currentPage, setCurrentPage] = useState(1);

	const [filtersOpen, setFiltersOpen] = useState(false);

	/* =====================================================
	   FETCH SHOP DATA
	===================================================== */

	useEffect(() => {
		const fetchShopData = async () => {
			try {
				setLoading(true);
				setError("");

				const response = await fetch(API_URL, {
					method: "GET",
					cache: "no-store",
				});

				if (!response.ok) {
					throw new Error("Failed to fetch shop data");
				}

				const data = await response.json();

				console.log("Shop API response:", data);

				/* =================================================
				   CATEGORIES
				================================================= */

				const apiCategories: ApiCategory[] = Array.isArray(data.categories)
					? data.categories
					: [];

				setCategories(apiCategories);

				/* =================================================
				   OCCASIONS
				================================================= */

				const apiOccasions: ApiOccasion[] = Array.isArray(data.occasions)
					? data.occasions
					: [];

				setOccasions(apiOccasions);

				/* =================================================
				   PRODUCTS
				================================================= */

				const apiProducts: ApiProduct[] = Array.isArray(data.products)
					? data.products
					: [];

				console.log("Raw API products:", apiProducts);

				const formattedProducts: Product[] = apiProducts.map((product) => {
					const categoryIds = parseIds(product.category_ids);

					const occasionIds = parseIds(product.occasion_ids);

					const description =
						typeof product.description === "string"
							? product.description.trim()
							: "";

					/*
					 * IMPORTANT:
					 *
					 * Preserve customize_reqs.
					 *
					 * Backend examples:
					 *
					 * "[\"text:10:Enter your custom name\"]"
					 *
					 * "[\"photo:Upload Photo\",\"text:8:CustomText (optional)\"]"
					 */

					const customizeReqs = Array.isArray(product.customize_reqs)
						? product.customize_reqs
						: typeof product.customize_reqs === "string"
							? product.customize_reqs
							: null;

					console.log(
						`Product "${product.name}" customization requirements:`,
						customizeReqs,
					);

					return {
						id: String(product.id),

						name: product.name || "Untitled Product",

						price: Number(product.selling_price) || 0,

						original: Number(product.market_price) || 0,

						image: product.primary_photo_path
							? PRODUCT_IMAGE_URL + product.primary_photo_path
							: "",

						categoryIds,

						occasionIds,

						categoryNames: categoryIds
							.map(
								(id) =>
									apiCategories.find((category) => category.id === id)?.name ||
									"",
							)
							.filter(Boolean),

						occasionNames: occasionIds
							.map(
								(id) =>
									apiOccasions.find((occasion) => occasion.id === id)?.name ||
									"",
							)
							.filter(Boolean),

						description,

						inStock: product.in_stock === "available",

						customizeReqs,
					};
				});

				console.log("Formatted products:", formattedProducts);

				setProducts(formattedProducts);
			} catch (error) {
				console.error("Failed to fetch shop data:", error);

				setError("Unable to load products. Please try again.");
			} finally {
				setLoading(false);
			}
		};

		fetchShopData();
	}, []);

	/* =====================================================
	   SYNC CATEGORY URL
	===================================================== */

	useEffect(() => {
		if (!categoryFromUrl || categories.length === 0) {
			setSelectedCategories([]);
			return;
		}

		const selectedIds = categoryFromUrl
			.split(",")
			.map((slug) => slug.trim().toLowerCase())
			.map((slug) => {
				const category = categories.find(
					(item) => createSlug(item.name) === slug,
				);

				return category?.id;
			})
			.filter((id): id is number => typeof id === "number");

		setSelectedCategories(selectedIds);

		setCurrentPage(1);
	}, [categoryFromUrl, categories]);

	/* =====================================================
	   SYNC OCCASION URL
	===================================================== */

	useEffect(() => {
		if (!occasionFromUrl || occasions.length === 0) {
			setSelectedOccasions([]);
			return;
		}

		const selectedIds = occasionFromUrl
			.split(",")
			.map((slug) => slug.trim().toLowerCase())
			.map((slug) => {
				const occasion = occasions.find(
					(item) => createSlug(item.name) === slug,
				);

				return occasion?.id;
			})
			.filter((id): id is number => typeof id === "number");

		setSelectedOccasions(selectedIds);

		setCurrentPage(1);
	}, [occasionFromUrl, occasions]);

	/* =====================================================
	   SYNC SEARCH URL
	===================================================== */

	useEffect(() => {
		setSearch(searchFromUrl || "");

		setCurrentPage(1);
	}, [searchFromUrl]);

	/* =====================================================
	   CATEGORY CHANGE
	===================================================== */

	const handleCategoryChange = (categoryId: number) => {
		let updatedCategories: number[];

		if (selectedCategories.includes(categoryId)) {
			updatedCategories = selectedCategories.filter((id) => id !== categoryId);
		} else {
			updatedCategories = [...selectedCategories, categoryId];
		}

		setSelectedCategories(updatedCategories);

		setCurrentPage(1);

		const selectedSlugs = updatedCategories
			.map((id) => categories.find((category) => category.id === id))
			.filter(Boolean)
			.map((category) => createSlug(category!.name));

		const params = new URLSearchParams(searchParams.toString());

		if (selectedSlugs.length === 0) {
			params.delete("category");
		} else {
			params.set("category", selectedSlugs.join(","));
		}

		router.push(`/shop${params.toString() ? `?${params.toString()}` : ""}`);
	};

	/* =====================================================
	   OCCASION CHANGE
	===================================================== */

	const handleOccasionChange = (occasionId: number) => {
		let updatedOccasions: number[];

		if (selectedOccasions.includes(occasionId)) {
			updatedOccasions = selectedOccasions.filter((id) => id !== occasionId);
		} else {
			updatedOccasions = [...selectedOccasions, occasionId];
		}

		setSelectedOccasions(updatedOccasions);

		setCurrentPage(1);

		const selectedSlugs = updatedOccasions
			.map((id) => occasions.find((occasion) => occasion.id === id))
			.filter(Boolean)
			.map((occasion) => createSlug(occasion!.name));

		const params = new URLSearchParams(searchParams.toString());

		if (selectedSlugs.length === 0) {
			params.delete("occasion");
		} else {
			params.set("occasion", selectedSlugs.join(","));
		}

		router.push(`/shop${params.toString() ? `?${params.toString()}` : ""}`);
	};

	/* =====================================================
	   SHOP SEARCH
	===================================================== */

	const handleShopSearch = (e: React.FormEvent) => {
		e.preventDefault();

		const trimmedSearch = search.trim();

		const params = new URLSearchParams(searchParams.toString());

		if (trimmedSearch) {
			params.set("search", trimmedSearch);
		} else {
			params.delete("search");
		}

		setCurrentPage(1);

		router.push(`/shop${params.toString() ? `?${params.toString()}` : ""}`);
	};

	/* =====================================================
	   SEARCH INPUT CHANGE
	===================================================== */

	const handleSearchChange = (value: string) => {
		setSearch(value);
	};

	/* =====================================================
	   CLEAR SEARCH
	===================================================== */

	const clearSearch = () => {
		const params = new URLSearchParams(searchParams.toString());

		params.delete("search");

		setSearch("");
		setCurrentPage(1);

		router.push(`/shop${params.toString() ? `?${params.toString()}` : ""}`);
	};

	/* =====================================================
	   FILTER + SEARCH + SORT
	===================================================== */

	const filteredProducts = useMemo(() => {
		return products
			.filter((product) => {
				const matchesCategory =
					selectedCategories.length === 0 ||
					selectedCategories.some((categoryId) =>
						product.categoryIds.includes(categoryId),
					);

				const matchesOccasion =
					selectedOccasions.length === 0 ||
					selectedOccasions.some((occasionId) =>
						product.occasionIds.includes(occasionId),
					);

				const searchText = search.toLowerCase().trim();

				const matchesSearch =
					!searchText ||
					product.name.toLowerCase().includes(searchText) ||
					product.description.toLowerCase().includes(searchText);

				return matchesCategory && matchesOccasion && matchesSearch;
			})
			.sort((a, b) => {
				if (sort === "Price: Low to High") {
					return a.price - b.price;
				}

				if (sort === "Price: High to Low") {
					return b.price - a.price;
				}

				if (sort === "Name: A-Z") {
					return a.name.localeCompare(b.name);
				}

				return 0;
			});
	}, [products, selectedCategories, selectedOccasions, search, sort]);

	/* =====================================================
	   PAGINATION
	===================================================== */

	const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);

	const paginatedProducts = filteredProducts.slice(
		(currentPage - 1) * PRODUCTS_PER_PAGE,
		currentPage * PRODUCTS_PER_PAGE,
	);

	/* =====================================================
	   RESET PAGINATION
	===================================================== */

	useEffect(() => {
		setCurrentPage(1);
	}, [selectedCategories, selectedOccasions, search, sort]);

	/* =====================================================
	   KEEP PAGE VALID
	===================================================== */

	useEffect(() => {
		if (totalPages > 0 && currentPage > totalPages) {
			setCurrentPage(totalPages);
		}
	}, [currentPage, totalPages]);

	/* =====================================================
	   CLEAR FILTERS
	===================================================== */

	const clearFilters = () => {
		setSearch("");
		setSelectedCategories([]);
		setSelectedOccasions([]);
		setSort("Featured");
		setSortOpen(false);
		setCurrentPage(1);

		router.push("/shop");
	};

	/* =====================================================
	   PAGINATION
	===================================================== */

	const goToPage = (page: number) => {
		if (page < 1 || page > totalPages) {
			return;
		}

		setCurrentPage(page);

		window.scrollTo({
			top: 0,
			behavior: "smooth",
		});
	};

	/* =====================================================
	   FILTER COUNT
	===================================================== */

	const activeFilterCount =
		selectedCategories.length + selectedOccasions.length;

	/* =====================================================
	   TITLE
	===================================================== */

	const selectedCategoryNames = selectedCategories
		.map((id) => categories.find((category) => category.id === id)?.name)
		.filter(Boolean);

	const selectedOccasionNames = selectedOccasions
		.map((id) => occasions.find((occasion) => occasion.id === id)?.name)
		.filter(Boolean);

	/* =====================================================
	   RENDER
	===================================================== */

	return (
		<CartProvider>
			<main
				className="min-h-screen bg-[#FBF9F7] pt-[112px]
					sm:pt-[120px]"
			>
				{/* HERO */}

				<section className="border-b border-[#E8DED7] bg-white">
					<div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
						<div className="max-w-2xl">
							<p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#85161B]">
								Printing House Collection
							</p>

							<h1 className="text-3xl font-bold tracking-tight text-[#2E2E2E] sm:text-4xl lg:text-5xl">
								Find something <span className="text-[#85161B]">special.</span>
							</h1>

							<p className="mt-4 max-w-xl text-sm leading-7 text-[#2E2E2E]/60 sm:text-base">
								Discover personalized gifts, thoughtful keepsakes, and
								custom-made products for every occasion.
							</p>
						</div>
					</div>
				</section>

				{/* SHOP CONTENT */}

				<section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
					{/* MOBILE FILTER */}

					<div className="mb-5 flex items-center justify-between lg:hidden">
						<p className="text-sm text-[#2E2E2E]/55">
							{filteredProducts.length}{" "}
							{filteredProducts.length === 1 ? "product" : "products"}
						</p>

						<button
							type="button"
							onClick={() => setFiltersOpen(true)}
							className="inline-flex items-center gap-2 rounded-xl border border-[#DED6D0] bg-white px-4 py-2.5 text-sm font-medium text-[#2E2E2E] transition hover:border-[#85161B]/40"
						>
							<SlidersHorizontal size={16} />
							Filters
							{activeFilterCount > 0 && (
								<span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#85161B] px-1 text-[10px] font-bold text-white">
									{activeFilterCount}
								</span>
							)}
						</button>
					</div>

					<div className="flex flex-col gap-7 lg:flex-row lg:items-start">
						{/* DESKTOP FILTERS */}

						<aside className="hidden w-64 shrink-0 lg:block">
							<CategoryFilters
								categories={categories}
								occasions={occasions}
								selectedCategories={selectedCategories}
								selectedOccasions={selectedOccasions}
								onCategoryChange={handleCategoryChange}
								onOccasionChange={handleOccasionChange}
								onClear={clearFilters}
							/>
						</aside>

						{/* PRODUCTS */}

						<div className="min-w-0 flex-1">
							{/* TOOLBAR */}

							<div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
								<div className="shrink-0">
									<h2 className="text-xl font-semibold text-[#2E2E2E]">
										{selectedCategoryNames.length > 0
											? selectedCategoryNames.join(", ")
											: selectedOccasionNames.length > 0
												? selectedOccasionNames.join(", ")
												: search
													? `Search results for "${search}"`
													: "All Products"}
									</h2>

									<p className="mt-1 text-sm text-[#2E2E2E]/50">
										{filteredProducts.length}{" "}
										{filteredProducts.length === 1 ? "product" : "products"}
									</p>
								</div>

								{/* SEARCH + SORT */}

								<div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:items-center">
									<form
										onSubmit={handleShopSearch}
										className="flex min-w-0 flex-1 items-center rounded-xl border border-[#DED6D0] bg-white px-3.5 transition focus-within:border-[#85161B] focus-within:ring-2 focus-within:ring-[#85161B]/10 sm:w-72 sm:flex-none lg:w-80"
									>
										<Search
											size={18}
											className="mr-2.5 shrink-0 text-[#2E2E2E]/40"
										/>

										<input
											type="search"
											value={search}
											onChange={(e) => handleSearchChange(e.target.value)}
											placeholder="Search products..."
											className="min-w-0 w-full bg-transparent py-2.5 text-sm text-[#2E2E2E] outline-none placeholder:text-[#2E2E2E]/35"
										/>

										{search && (
											<button
												type="button"
												onClick={clearSearch}
												aria-label="Clear search"
												className="ml-2 shrink-0 text-[#2E2E2E]/40 transition hover:text-[#85161B]"
											>
												<X size={16} />
											</button>
										)}
									</form>

									{/* SORT */}

									<div className="relative self-start sm:self-auto">
										<button
											type="button"
											onClick={() => setSortOpen((value) => !value)}
											className="flex items-center gap-2 rounded-xl border border-[#DED6D0] bg-white px-4 py-2.5 text-sm font-medium text-[#2E2E2E] transition hover:border-[#85161B]/40"
										>
											<span className="hidden sm:inline">Sort:</span>

											{sort}

											<ChevronDown
												size={16}
												className={`transition-transform ${
													sortOpen ? "rotate-180" : ""
												}`}
											/>
										</button>

										{sortOpen && (
											<>
												<button
													type="button"
													aria-label="Close sort menu"
													className="fixed inset-0 z-10 cursor-default"
													onClick={() => setSortOpen(false)}
												/>

												<div className="absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-xl border border-[#E8DED7] bg-white p-1.5 shadow-xl">
													{SORT_OPTIONS.map((option) => (
														<button
															type="button"
															key={option}
															onClick={() => {
																setSort(option);

																setSortOpen(false);
															}}
															className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
																sort === option
																	? "bg-[#F7D6BF]/40 font-medium text-[#85161B]"
																	: "text-[#2E2E2E]/70 hover:bg-[#FBF9F7]"
															}`}
														>
															{option}
														</button>
													))}
												</div>
											</>
										)}
									</div>
								</div>
							</div>

							{/* LOADING */}

							{loading ? (
								<div className="flex min-h-[350px] items-center justify-center rounded-3xl border border-[#E8DED7] bg-white">
									<div className="text-sm text-[#2E2E2E]/50">
										Loading products...
									</div>
								</div>
							) : error ? (
								<div className="flex min-h-[350px] flex-col items-center justify-center rounded-3xl border border-[#E8DED7] bg-white px-5 text-center">
									<h3 className="text-lg font-semibold text-[#2E2E2E]">
										Unable to load products
									</h3>

									<p className="mt-2 text-sm text-[#2E2E2E]/50">{error}</p>

									<button
										type="button"
										onClick={() => window.location.reload()}
										className="mt-5 rounded-xl bg-[#85161B] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#721318]"
									>
										Try again
									</button>
								</div>
							) : paginatedProducts.length > 0 ? (
								<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-7 xl:grid-cols-3">
									{paginatedProducts.map((product) => (
										<ProductCard
											key={product.id}
											item={{
												id: product.id,
												name: product.name,
												price: product.price,
												original: product.original,
												image: product.image,
												description: product.description,

												/*
												 * IMPORTANT:
												 *
												 * Pass the raw customization
												 * requirement data through.
												 */
												customizeReqs: product.customizeReqs,
											}}
											showOriginal
										/>
									))}
								</div>
							) : (
								<div className="flex min-h-[350px] flex-col items-center justify-center rounded-3xl border border-dashed border-[#DED6D0] bg-white px-5 text-center">
									<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F7D6BF]/40">
										<Search size={24} className="text-[#85161B]" />
									</div>

									<h3 className="text-lg font-semibold text-[#2E2E2E]">
										No products found
									</h3>

									<p className="mt-2 max-w-sm text-sm text-[#2E2E2E]/50">
										Try changing your search or selecting another category.
									</p>

									<button
										type="button"
										onClick={clearFilters}
										className="mt-5 rounded-full bg-[#85161B] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#721318]"
									>
										Clear filters
									</button>
								</div>
							)}

							{/* PAGINATION */}

							{totalPages > 1 && (
								<div className="mt-10 flex flex-col items-center gap-4 border-t border-[#E8DED7] pt-7 sm:flex-row sm:justify-between">
									<p className="text-sm text-[#2E2E2E]/50">
										Showing{" "}
										<span className="font-medium text-[#2E2E2E]">
											{(currentPage - 1) * PRODUCTS_PER_PAGE + 1}
										</span>{" "}
										–{" "}
										<span className="font-medium text-[#2E2E2E]">
											{Math.min(
												currentPage * PRODUCTS_PER_PAGE,
												filteredProducts.length,
											)}
										</span>{" "}
										of{" "}
										<span className="font-medium text-[#2E2E2E]">
											{filteredProducts.length}
										</span>
									</p>

									<div className="flex items-center gap-1.5">
										<button
											type="button"
											onClick={() => goToPage(currentPage - 1)}
											disabled={currentPage === 1}
											aria-label="Previous page"
											className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#DED6D0] bg-white text-[#2E2E2E] transition hover:border-[#85161B]/40 hover:text-[#85161B] disabled:cursor-not-allowed disabled:opacity-40"
										>
											<ChevronLeft size={17} />
										</button>

										<div className="flex items-center gap-1.5">
											{Array.from(
												{
													length: totalPages,
												},
												(_, index) => index + 1,
											).map((page) => (
												<button
													type="button"
													key={page}
													onClick={() => goToPage(page)}
													className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium transition ${
														currentPage === page
															? "bg-[#85161B] text-white"
															: "border border-[#DED6D0] bg-white text-[#2E2E2E]/70 hover:border-[#85161B]/40 hover:text-[#85161B]"
													}`}
												>
													{page}
												</button>
											))}
										</div>

										<button
											type="button"
											onClick={() => goToPage(currentPage + 1)}
											disabled={currentPage === totalPages}
											aria-label="Next page"
											className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#DED6D0] bg-white text-[#2E2E2E] transition hover:border-[#85161B]/40 hover:text-[#85161B] disabled:cursor-not-allowed disabled:opacity-40"
										>
											<ChevronRight size={17} />
										</button>
									</div>
								</div>
							)}
						</div>
					</div>
				</section>

				{/* MOBILE FILTER DRAWER */}

				{filtersOpen && (
					<div className="fixed inset-0 z-50 lg:hidden">
						<button
							type="button"
							aria-label="Close filters"
							onClick={() => setFiltersOpen(false)}
							className="absolute inset-0 bg-black/30"
						/>

						<div className="absolute right-0 top-0 h-full w-[85%] max-w-sm overflow-y-auto bg-[#FBF9F7] shadow-2xl">
							<div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E8DED7] bg-white px-5 py-4">
								<div>
									<h2 className="font-semibold text-[#2E2E2E]">Filters</h2>

									<p className="mt-0.5 text-xs text-[#2E2E2E]/45">
										Refine your products
									</p>
								</div>

								<button
									type="button"
									onClick={() => setFiltersOpen(false)}
									className="flex h-9 w-9 items-center justify-center rounded-lg text-[#2E2E2E]/50 transition hover:bg-[#FBF9F7] hover:text-[#85161B]"
								>
									<X size={19} />
								</button>
							</div>

							<div className="p-5">
								<CategoryFilters
									categories={categories}
									occasions={occasions}
									selectedCategories={selectedCategories}
									selectedOccasions={selectedOccasions}
									onCategoryChange={handleCategoryChange}
									onOccasionChange={handleOccasionChange}
									onClear={clearFilters}
								/>

								<button
									type="button"
									onClick={() => setFiltersOpen(false)}
									className="mt-5 w-full rounded-xl bg-[#85161B] py-3 text-sm font-semibold text-white transition hover:bg-[#721318]"
								>
									Show {filteredProducts.length} products
								</button>
							</div>
						</div>
					</div>
				)}
			</main>
		</CartProvider>
	);
}

/* =========================================================
   CATEGORY + OCCASION FILTERS
========================================================= */

function CategoryFilters({
	categories,
	occasions,
	selectedCategories,
	selectedOccasions,
	onCategoryChange,
	onOccasionChange,
	onClear,
}: {
	categories: ApiCategory[];
	occasions: ApiOccasion[];
	selectedCategories: number[];
	selectedOccasions: number[];
	onCategoryChange: (id: number) => void;
	onOccasionChange: (id: number) => void;
	onClear: () => void;
}) {
	const hasFilters =
		selectedCategories.length > 0 || selectedOccasions.length > 0;

	return (
		<div className="rounded-2xl border border-[#E8DED7] bg-white p-5">
			<div className="flex items-start justify-between gap-3">
				<div>
					<h3 className="text-sm font-semibold text-[#2E2E2E]">Filters</h3>

					<p className="mt-1 text-xs text-[#2E2E2E]/45">Refine your products</p>
				</div>

				{hasFilters && (
					<button
						type="button"
						onClick={onClear}
						className="text-xs font-medium text-[#85161B] hover:underline"
					>
						Clear
					</button>
				)}
			</div>

			<div className="my-5 border-t border-[#E8DED7]" />

			{/* CATEGORIES */}

			<div>
				<h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2E2E2E]/50">
					Category
				</h4>

				<div className="mt-4 space-y-3.5">
					{categories.map((category) => {
						const checked = selectedCategories.includes(category.id);

						return (
							<label
								key={category.id}
								className="group flex cursor-pointer items-center gap-3"
							>
								<input
									type="checkbox"
									checked={checked}
									onChange={() => onCategoryChange(category.id)}
									className="h-4 w-4 cursor-pointer rounded border-[#DED6D0] accent-[#85161B] focus:ring-[#85161B]/20"
								/>

								<span
									className={`text-sm transition-colors ${
										checked
											? "font-medium text-[#85161B]"
											: "text-[#2E2E2E]/70 group-hover:text-[#85161B]"
									}`}
								>
									{category.name}
								</span>
							</label>
						);
					})}
				</div>
			</div>

			{/* OCCASIONS */}

			{occasions.length > 0 && (
				<>
					<div className="my-6 border-t border-[#E8DED7]" />

					<div>
						<h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2E2E2E]/50">
							Occasion
						</h4>

						<div className="mt-4 space-y-3.5">
							{occasions.map((occasion) => {
								const checked = selectedOccasions.includes(occasion.id);

								return (
									<label
										key={occasion.id}
										className="group flex cursor-pointer items-center gap-3"
									>
										<input
											type="checkbox"
											checked={checked}
											onChange={() => onOccasionChange(occasion.id)}
											className="h-4 w-4 cursor-pointer rounded border-[#DED6D0] accent-[#85161B] focus:ring-[#85161B]/20"
										/>

										<span
											className={`text-sm transition-colors ${
												checked
													? "font-medium text-[#85161B]"
													: "text-[#2E2E2E]/70 group-hover:text-[#85161B]"
											}`}
										>
											{occasion.name}
										</span>
									</label>
								);
							})}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
