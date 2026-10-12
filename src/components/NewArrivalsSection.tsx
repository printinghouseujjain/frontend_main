"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";

const PRODUCT_IMAGE_URL =
	"https://api.printinghouseujjain.in/assets/products/";

type ApiProduct = {
	id: number | string;
	name?: string;
	primary_photo_path?: string | null;
	market_price?: number | string | null;
	selling_price?: number | string | null;
	created_at?: string | null;
};

type Arrival = {
	id: string;
	name: string;
	price: number;
	original?: number;
	image: string;
};

function imageUrl(photoPath?: string | null) {
	const clean = String(photoPath ?? "")
		.trim()
		.replace(/^\/+/, "");

	if (!clean) return "";
	if (clean.startsWith("http://") || clean.startsWith("https://")) return clean;
	return `${PRODUCT_IMAGE_URL}${clean}`;
}

function rupees(value: number) {
	return `₹${value.toLocaleString("en-IN")}`;
}

function newestFirst(products: ApiProduct[]) {
	return [...products]
		.sort((left, right) => {
			const leftTime = new Date(String(left.created_at ?? "")).getTime();
			const rightTime = new Date(String(right.created_at ?? "")).getTime();

			if (
				Number.isFinite(leftTime) &&
				Number.isFinite(rightTime) &&
				leftTime !== rightTime
			) {
				return rightTime - leftTime;
			}

			return Number(right.id) - Number(left.id);
		})
		.slice(0, 8)
		.map((product): Arrival => {
			const price = Number(product.selling_price ?? 0);
			const market = Number(product.market_price ?? NaN);

			return {
				id: String(product.id),
				name: product.name || "Untitled product",
				price: Number.isFinite(price) ? price : 0,
				original:
					Number.isFinite(market) && market > price ? market : undefined,
				image: imageUrl(product.primary_photo_path),
			};
		});
}

function ArrivalCard({ item, index }: { item: Arrival; index: number }) {
	const label = String(index + 1).padStart(2, "0");

	return (
		<Link
			href={`/product/${item.id}`}
			className="group flex w-[220px] shrink-0 snap-start flex-col sm:w-[240px]"
		>
			<div className="relative aspect-square overflow-hidden rounded-2xl bg-[#F3E7DF]">
				{item.image ? (
					<img
						src={item.image}
						alt={item.name}
						className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
					/>
				) : (
					<div className="flex h-full items-center justify-center text-xs text-[#2E2E2E]/40">
						No image
					</div>
				)}
				<span className="absolute left-3 top-3 rounded-full bg-[#85161B] px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] text-white">
					{label}
				</span>
			</div>
			<div className="flex items-start justify-between gap-3 pt-3">
				<div className="min-w-0">
					<p className="line-clamp-2 text-sm font-semibold leading-5 text-[#2E2E2E] group-hover:text-[#85161B]">
						{item.name}
					</p>
					<p className="mt-1 flex items-baseline gap-2">
						<span className="text-sm font-bold text-[#85161B]">
							{rupees(item.price)}
						</span>
						{item.original !== undefined && (
							<span className="text-xs text-[#2E2E2E]/40 line-through">
								{rupees(item.original)}
							</span>
						)}
					</p>
				</div>
				<span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E8DED7] text-[#85161B] transition group-hover:bg-[#85161B] group-hover:text-white">
					<ArrowUpRight size={15} />
				</span>
			</div>
		</Link>
	);
}

export default function NewArrivalsSection() {
	const [products, setProducts] = useState<Arrival[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		let cancelled = false;

		const load = async () => {
			try {
				setLoading(true);
				setError("");

				const response = await fetch("/api/products", {
					method: "GET",
					cache: "no-store",
				});

				if (!response.ok) {
					throw new Error("Unable to load new arrivals.");
				}

				const data = await response.json();

				if (!Array.isArray(data?.products)) {
					throw new Error("Unable to load new arrivals.");
				}

				if (!cancelled) {
					setProducts(newestFirst(data.products));
				}
			} catch (loadError) {
				if (!cancelled) {
					setError(
						loadError instanceof Error
							? loadError.message
							: "Unable to load new arrivals.",
					);
					setProducts([]);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		};

		void load();

		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<section className="py-6 lg:py-8">
			<div className="overflow-hidden rounded-[28px] bg-[#85161B] text-white lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
				<div className="flex flex-col justify-between gap-6 px-6 py-7 sm:px-8 sm:py-9">
					<div>
						<p className="text-xs font-bold uppercase tracking-[0.22em] text-white/70">
							Just added
						</p>
						<h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl" style={{ color: "#FBF9F7" }}>
							New arrivals
						</h2>
						<p className="mt-3 max-w-xs text-sm leading-6 text-white/75">
							The latest prints and gifts, lined up in the order they were added.
						</p>
					</div>
					<Link
						href="/shop"
						className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#85161B] hover:bg-[#F7D6BF]"
					>
						Browse the shop
						<ArrowUpRight size={16} />
					</Link>
				</div>

				<div className="bg-[#FBF9F7] px-4 py-5 text-[#2E2E2E] sm:px-6 sm:py-7">
					{loading && (
						<div className="flex gap-4 overflow-hidden">
							{Array.from({ length: 3 }).map((_, index) => (
								<div key={index} className="w-[220px] shrink-0">
									<div className="aspect-square animate-pulse rounded-2xl bg-[#EFE6E0]" />
									<div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-[#EFE6E0]" />
								</div>
							))}
						</div>
					)}

					{!loading && error && (
						<p className="py-16 text-center text-sm text-red-600">{error}</p>
					)}

					{!loading && !error && products.length === 0 && (
						<p className="py-16 text-center text-sm text-[#2E2E2E]/50">
							No new arrivals yet.
						</p>
					)}

					{!loading && !error && products.length > 0 && (
						<div className="flex snap-x gap-4 overflow-x-auto pb-1">
							{products.map((item, index) => (
								<ArrivalCard key={item.id} item={item} index={index} />
							))}
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
