"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, GripVertical, Loader2 } from "lucide-react";

export type OrderItem = {
	id: number;
	name: string;
};

export function SortableOrderEditor({
	title,
	description,
	backHref,
	loadItems,
	saveOrder,
}: {
	title: string;
	description: string;
	backHref: string;
	loadItems: () => Promise<OrderItem[]>;
	saveOrder: (ids: number[]) => Promise<void>;
}) {
	const [items, setItems] = useState<OrderItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");
	const [dragIndex, setDragIndex] = useState<number | null>(null);

	useEffect(() => {
		let cancelled = false;

		loadItems()
			.then((next) => {
				if (!cancelled) setItems(next);
			})
			.catch((loadError) => {
				if (!cancelled) {
					setError(
						loadError instanceof Error
							? loadError.message
							: "Unable to load items.",
					);
				}
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [loadItems]);

	const moveItem = (from: number, to: number) => {
		if (from === to || from < 0 || to < 0) return;

		setItems((current) => {
			const next = [...current];
			const [moved] = next.splice(from, 1);
			next.splice(to, 0, moved);
			return next;
		});
	};

	const save = async () => {
		setSaving(true);
		setError("");
		setMessage("");

		try {
			await saveOrder(items.map((item) => item.id));
			setMessage("Order saved.");
		} catch (saveError) {
			setError(
				saveError instanceof Error ? saveError.message : "Unable to save order.",
			);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#FBF9F7] px-4 py-8 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-2xl">
				<Link
					href={backHref}
					className="inline-flex items-center gap-2 text-sm font-medium text-[#2E2E2E]/60 hover:text-[#85161B]"
				>
					<ArrowLeft size={16} />
					Back
				</Link>

				<h1 className="mt-4 text-2xl font-bold text-[#2E2E2E] sm:text-3xl">
					{title}
				</h1>
				<p className="mt-2 text-sm text-[#2E2E2E]/55">{description}</p>

				{loading ? (
					<div className="mt-8 flex justify-center">
						<Loader2 className="animate-spin text-[#85161B]" />
					</div>
				) : (
					<ol className="mt-6 space-y-2">
						{items.map((item, index) => (
							<li
								key={item.id}
								draggable
								onDragStart={() => setDragIndex(index)}
								onDragOver={(event) => event.preventDefault()}
								onDrop={() => {
									if (dragIndex !== null) moveItem(dragIndex, index);
									setDragIndex(null);
								}}
								className="flex cursor-grab items-center gap-3 rounded-xl border border-[#E8DED7] bg-white px-4 py-3 active:cursor-grabbing"
							>
								<GripVertical size={16} className="text-[#2E2E2E]/35" />
								<span className="w-6 text-xs font-semibold text-[#2E2E2E]/40">
									{index + 1}
								</span>
								<span className="min-w-0 flex-1 truncate text-sm font-medium text-[#2E2E2E]">
									{item.name}
								</span>
								<span className="text-xs text-[#2E2E2E]/40">#{item.id}</span>
							</li>
						))}
					</ol>
				)}

				{error && (
					<p className="mt-4 text-sm font-medium text-red-600">{error}</p>
				)}
				{message && (
					<p className="mt-4 text-sm font-medium text-green-700">{message}</p>
				)}

				<button
					type="button"
					disabled={loading || saving || items.length === 0}
					onClick={() => void save()}
					className="mt-6 rounded-xl bg-[#85161B] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
				>
					{saving ? "Saving..." : "Save order"}
				</button>
			</div>
		</div>
	);
}

export async function postCatalogOrder(command: string, ids: number[]) {
	const body = new FormData();
	body.append("command_type", "admin");
	body.append("command", command);
	body.append("order", JSON.stringify(ids));

	const response = await fetch("/api/admin/home_content_update", {
		method: "POST",
		body,
		credentials: "include",
	});
	const data = (await response.json().catch(() => ({}))) as {
		message?: string;
		status?: number;
	};

	if (!response.ok || (typeof data.status === "number" && data.status >= 400)) {
		throw new Error(data.message || "Unable to save order.");
	}
}
