import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

export async function POST(request: NextRequest) {
	try {
		/*
		 * Frontend sends JSON:
		 * { productId }
		 */
		const body = await request.json().catch(() => null);

		const productId = body?.productId;

		if (typeof productId !== "string" || !productId) {
			return NextResponse.json(
				{
					message: "Missing required product id.",
				},
				{
					status: 400,
				},
			);
		}

		/*
		 * Backend expects FORM DATA.
		 */
		const backendFormData = new FormData();

		backendFormData.append("product_id", productId);

		console.log("FORWARDING ADD TO WISHLIST:", {
			product_id: productId,
		});

		/*
		 * Browser
		 *   ↓
		 * /api/wishlist/add
		 *   ↓
		 * https://api.printinghouseujjain.in/add_to_wishlist
		 *
		 * Forward the incoming session cookie so the backend
		 * knows which user's wishlist to add the item to.
		 */
		const incomingCookie = request.headers.get("cookie");

		const response = await fetch(`${API_URL}/api/add_to_wishlist`, {
			method: "POST",
			body: backendFormData,
			headers: {
				Accept: "application/json",
				...(incomingCookie ? { Cookie: incomingCookie } : {}),
			},
			cache: "no-store",
		});

		const text = await response.text();

		let data: unknown;

		try {
			data = JSON.parse(text);
		} catch {
			data = {
				message: text || "Invalid response from wishlist server.",
			};
		}

		console.log("BACKEND ADD TO WISHLIST RESPONSE:", data);

		const nextResponse = NextResponse.json(data, {
			status: response.status,
		});

		/*
		 * Forward any updated session cookie back to the browser.
		 */
		const setCookie = response.headers.get("set-cookie");

		if (setCookie) {
			nextResponse.headers.set("set-cookie", setCookie);
		}

		return nextResponse;
	} catch (error) {
		console.error("Add to wishlist proxy error:", error);

		return NextResponse.json(
			{
				message: "Unable to connect to wishlist server.",
			},
			{
				status: 500,
			},
		);
	}
}
