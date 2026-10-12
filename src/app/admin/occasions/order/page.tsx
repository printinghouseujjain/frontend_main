"use client";

import { useCallback } from "react";
import {
	postCatalogOrder,
	SortableOrderEditor,
	type OrderItem,
} from "@/components/admin/SortableOrderEditor";

async function loadOccasions(): Promise<OrderItem[]> {
	const response = await fetch("/api/admin/occasions", {
		credentials: "include",
		cache: "no-store",
	});
	const data = await response.json().catch(() => ({}));

	if (!response.ok) {
		throw new Error(data?.message || "Unable to load occasions.");
	}

	const list = Array.isArray(data)
		? data
		: Array.isArray(data?.occasions)
			? data.occasions
			: [];

	return list
		.map((item: { id?: number | string; name?: string }) => ({
			id: Number(item.id),
			name: item.name || `Occasion ${item.id}`,
		}))
		.filter((item: OrderItem) => Number.isInteger(item.id) && item.id > 0);
}

export default function OccasionOrderPage() {
	const loadItems = useCallback(loadOccasions, []);

	return (
		<SortableOrderEditor
			title="Occasion order"
			description="Drag occasions into the order they should appear, then save."
			backHref="/admin/occasions"
			loadItems={loadItems}
			saveOrder={(ids) => postCatalogOrder("occasions_order", ids)}
		/>
	);
}
