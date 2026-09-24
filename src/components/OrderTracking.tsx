"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackageSearch, ArrowRight } from "lucide-react";

export default function TrackOrder() {
	const router = useRouter();

	const [orderId, setOrderId] = useState("");

	const [error, setError] = useState("");

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault();

		const trimmedOrderId = orderId.trim();

		if (!trimmedOrderId) {
			setError("Please enter your Order ID.");

			return;
		}

		setError("");

		/*
		 * ASSUMPTION: the tracking page reads the order ID from a
		 * query param, e.g. /order-tracking?order_id=1234. If the
		 * page instead expects it as a path segment
		 * (/order-tracking/1234), change this one line.
		 */
		router.push(`/order-tracking?order_id=${encodeURIComponent(trimmedOrderId)}`);
	};

	return (
		<section className="w-full bg-white py-14 sm:py-16">
			<div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
				{/* Heading */}
				<div className="text-center">
					<h2 className="text-2xl font-semibold tracking-tight text-[#241414] sm:text-3xl">
						Track your <span className="text-[#85161B]">order</span>
					</h2>

					<p className="mt-2 text-sm text-gray-500">
						Enter your Order ID to see where your order is.
					</p>
				</div>

				{/* Tracking form */}
				<form
					onSubmit={handleSubmit}
					className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:gap-2.5"
				>
					<div className="relative flex-1">
						<PackageSearch
							size={18}
							strokeWidth={1.8}
							className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
						/>

						<input
							type="text"
							value={orderId}
							onChange={(event) => {
								setOrderId(event.target.value);

								if (error) {
									setError("");
								}
							}}
							placeholder="Enter your Order ID"
							aria-label="Order ID"
							className="
								w-full
								rounded-xl
								border
								border-[#e5dbd5]
								bg-[#fff9f4]
								py-3
								pl-10
								pr-3.5
								text-sm
								text-[#241414]
								outline-none
								transition
								placeholder:text-gray-400
								focus:border-[#85161B]
								focus:ring-2
								focus:ring-[#85161B]/10
							"
						/>
					</div>

					<button
						type="submit"
						className="
							group
							inline-flex
							shrink-0
							items-center
							justify-center
							gap-2
							rounded-xl
							bg-[#85161B]
							px-5
							py-3
							text-sm
							font-semibold
							text-white
							transition-all
							hover:bg-[#721318]
							active:scale-[0.98]
						"
					>
						Track Order
						<ArrowRight
							size={16}
							className="transition-transform group-hover:translate-x-1"
						/>
					</button>
				</form>

				{error && (
					<p className="mt-3 text-center text-sm font-medium text-red-600">
						{error}
					</p>
				)}
			</div>
		</section>
	);
}