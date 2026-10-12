"use client";

import { useCallback } from "react";
import {
	buildImageUrl,
	findImageFile,
	postCatalogOrder,
	SortableOrderEditor,
	type OrderItem,
} from "@/components/admin/SortableOrderEditor";

/* Product pictures live in /assets/products/ */
const IMAGE_BASE_URL = "https://api.printinghouseujjain.in/assets/products/";

async function loadProducts(): Promise<OrderItem[]> {
	const response = await fetch("/api/admin/products", {
		credentials: "include",
		cache: "no-store",
	});
	const data = await response.json().catch(() => ({}));

	if (!response.ok) {
		throw new Error(data?.message || "Unable to load products.");
	}

	const list: Record<string, unknown>[] = Array.isArray(data?.products) ? data.products : [];

	/* Temporary: shows which fields the API really sends. */
	console.log("Product order — first item from the API:", list[0]);

	return list
		.map((item) => ({
			id: Number(item.id),
			name: String(item.name || `Product ${item.id}`),
			image: buildImageUrl(IMAGE_BASE_URL, findImageFile(item)),
		}))
		.filter((item: OrderItem) => Number.isInteger(item.id) && item.id > 0);
}

export default function ProductOrderPage() {
	const loadItems = useCallback(() => loadProducts(), []);

	return (
		<SortableOrderEditor
			title="Product order"
			description="Drag products into the order they should appear, then save."
			backHref="/admin/products"
			loadItems={loadItems}
			saveOrder={(ids) => postCatalogOrder("products_order", ids)}
		/>
	);
}