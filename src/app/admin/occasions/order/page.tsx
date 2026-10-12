"use client";

import { useCallback } from "react";
import {
	buildImageUrl,
	findImageFile,
	postCatalogOrder,
	SortableOrderEditor,
	type OrderItem,
} from "@/components/admin/SortableOrderEditor";

/* ASSUMPTION: occasion pictures live in /assets/occasions/ — change if not. */
const IMAGE_BASE_URL = "https://api.printinghouseujjain.in/assets/occasions/";

async function loadOccasions(): Promise<OrderItem[]> {
	const response = await fetch("/api/admin/occasions", {
		credentials: "include",
		cache: "no-store",
	});
	const data = await response.json().catch(() => ({}));

	if (!response.ok) {
		throw new Error(data?.message || "Unable to load occasions.");
	}

	const list: Record<string, unknown>[] = Array.isArray(data)
		? data
		: Array.isArray(data?.occasions)
			? data.occasions
			: [];

	/* Temporary: shows which fields the API really sends. */
	console.log("Occasion order — first item from the API:", list[0]);

	return list
		.map((item) => ({
			id: Number(item.id),
			name: String(item.name || `Occasion ${item.id}`),
			image: buildImageUrl(IMAGE_BASE_URL, findImageFile(item)),
		}))
		.filter((item: OrderItem) => Number.isInteger(item.id) && item.id > 0);
}

export default function OccasionOrderPage() {
	const loadItems = useCallback(() => loadOccasions(), []);

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