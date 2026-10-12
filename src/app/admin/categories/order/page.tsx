"use client";

import { useCallback } from "react";
import {
	postCatalogOrder,
	SortableOrderEditor,
	type OrderItem,
} from "@/components/admin/SortableOrderEditor";

async function loadCategories(): Promise<OrderItem[]> {
	const response = await fetch("/api/admin/categories", {
		credentials: "include",
		cache: "no-store",
	});
	const data = await response.json().catch(() => ({}));

	if (!response.ok) {
		throw new Error(data?.message || "Unable to load categories.");
	}

	const list = Array.isArray(data)
		? data
		: Array.isArray(data?.categories)
			? data.categories
			: [];

	return list
		.map((item: { id?: number | string; name?: string }) => ({
			id: Number(item.id),
			name: item.name || `Category ${item.id}`,
		}))
		.filter((item: OrderItem) => Number.isInteger(item.id) && item.id > 0);
}

export default function CategoryOrderPage() {
	const loadItems = useCallback(loadCategories, []);

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
