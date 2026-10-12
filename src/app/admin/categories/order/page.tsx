"use client";

import { useCallback } from "react";
import {
	buildImageUrl,
	findImageFile,
	postCatalogOrder,
	SortableOrderEditor,
	type OrderItem,
} from "@/components/admin/SortableOrderEditor";

/* ASSUMPTION: category pictures live in /assets/categories/ — change if not. */
const IMAGE_BASE_URL = "https://api.printinghouseujjain.in/assets/categories/";

async function loadCategories(): Promise<OrderItem[]> {
	const response = await fetch("/api/admin/categories", {
		credentials: "include",
		cache: "no-store",
	});
	const data = await response.json().catch(() => ({}));

	if (!response.ok) {
		throw new Error(data?.message || "Unable to load categories.");
	}

	const list: Record<string, unknown>[] = Array.isArray(data)
		? data
		: Array.isArray(data?.categories)
			? data.categories
			: [];

	/* Temporary: shows which fields the API really sends. */
	console.log("Category order — first item from the API:", list[0]);

	return list
		.map((item) => ({
			id: Number(item.id),
			name: String(item.name || `Category ${item.id}`),
			image: buildImageUrl(IMAGE_BASE_URL, findImageFile(item)),
		}))
		.filter((item: OrderItem) => Number.isInteger(item.id) && item.id > 0);
}

export default function CategoryOrderPage() {
	const loadItems = useCallback(() => loadCategories(), []);

	return (
		<SortableOrderEditor
			title="Category order"
			description="Drag categories into the order they should appear, then save."
			backHref="/admin/categories"
			loadItems={loadItems}
			saveOrder={(ids) => postCatalogOrder("categories_order", ids)}
		/>
	);
}