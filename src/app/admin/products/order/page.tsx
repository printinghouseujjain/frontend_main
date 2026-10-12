"use client";

import { useCallback } from "react";
import {
	postCatalogOrder,
	SortableOrderEditor,
	type OrderItem,
} from "@/components/admin/SortableOrderEditor";

async function loadProducts(): Promise<OrderItem[]> {
	const response = await fetch("/api/admin/products", {
		credentials: "include",
		cache: "no-store",
	});
	const data = await response.json().catch(() => ({}));

	if (!response.ok) {
		throw new Error(data?.message || "Unable to load products.");
	}

	const list = Array.isArray(data?.products) ? data.products : [];

	return list
		.map((item: { id?: number | string; name?: string }) => ({
			id: Number(item.id),
			name: item.name || `Product ${item.id}`,
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
