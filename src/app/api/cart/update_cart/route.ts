import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "https://api.printinghouseujjain.in";

export async function POST(request: NextRequest) {
	try {
		/*
		 * Read incoming FormData
		 */
		const incomingFormData = await request.formData();

		const cartItemId = incomingFormData.get("cart_item_id");
		const action = incomingFormData.get("action");
		const quantity = incomingFormData.get("quantity");

		/*
		 * ---------------------------------------------------------------
		 * Validate cart_item_id
		 * ---------------------------------------------------------------
		 */

		if (typeof cartItemId !== "string" || !cartItemId.trim()) {
			return NextResponse.json(
				{
					status: 400,
					message: "cart_item_id is required.",
				},
				{ status: 400 },
			);
		}

		/*
		 * ---------------------------------------------------------------
		 * Validate action
		 * ---------------------------------------------------------------
		 */

		if (action !== "increase" && action !== "decrease" && action !== "set") {
			return NextResponse.json(
				{
					status: 400,
					message: "action must be increase, decrease, or set.",
				},
				{ status: 400 },
			);
		}

		/*
		 * ---------------------------------------------------------------
		 * Validate quantity for SET
		 * ---------------------------------------------------------------
		 */

		if (action === "set") {
			if (typeof quantity !== "string" || quantity.trim() === "") {
				return NextResponse.json(
					{
						status: 400,
						message: "quantity is required when action is set.",
					},
					{ status: 400 },
				);
			}

			const parsedQuantity = Number(quantity);

			if (!Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
				return NextResponse.json(
					{
						status: 400,
						message: "quantity must be a non-negative integer.",
					},
					{ status: 400 },
				);
			}
		}

		/*
		 * ---------------------------------------------------------------
		 * Create backend FormData
		 * ---------------------------------------------------------------
		 */

		const backendFormData = new FormData();

		backendFormData.append("cart_item_id", cartItemId);

		backendFormData.append("action", action);

		if (action === "set" && typeof quantity === "string") {
			backendFormData.append("quantity", quantity);
		}

		/*
		 * ---------------------------------------------------------------
		 * Forward cookies
		 * ---------------------------------------------------------------
		 *
		 * The backend uses the user's session/cart cookie.
		 */

		const cookie = request.headers.get("cookie");

		const response = await fetch(`${BACKEND_URL}/api/update_cart`, {
			method: "POST",

			headers: {
				...(cookie
					? {
							Cookie: cookie,
						}
					: {}),
			},

			body: backendFormData,

			cache: "no-store",
		});

		/*
		 * ---------------------------------------------------------------
		 * Parse backend response
		 * ---------------------------------------------------------------
		 */

		const contentType = response.headers.get("content-type");

		let data: unknown;

		if (contentType?.includes("application/json")) {
			data = await response.json().catch(() => ({
				status: response.status,
				message: "Invalid JSON response from backend.",
			}));
		} else {
			data = await response.text();
		}

		console.log("BACKEND /update_cart RESPONSE:", data);

		return NextResponse.json(data, {
			status: response.status,
		});
	} catch (error) {
		console.error("Update cart proxy error:", error);

		return NextResponse.json(
			{
				status: 500,
				message: "Unable to connect to cart service.",
			},
			{ status: 500 },
		);
	}
}
