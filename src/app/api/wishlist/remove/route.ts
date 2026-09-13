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

		if (
			(typeof productId !== "string" && typeof productId !== "number") ||
			!productId
		) {
			return NextResponse.json(
				{
					message: "Missing required product id.",
				},
				{
					status: 400,
				},
			);
		}

		const backendFormData = new FormData();

		backendFormData.append("product_id", String(productId));

		console.log("FORWARDING REMOVE FROM WISHLIST:", {
			product_id: productId,
		});

		const incomingCookie = request.headers.get("cookie");

		/*
		 * NOTE: this assumes a /remove_from_wishlist endpoint exists,
		 * mirroring /add_to_wishlist. Update the path below if the
		 * real backend uses a different one (e.g. DELETE /wishlist/:id).
		 */
		const response = await fetch(`${API_URL}/remove_from_wishlist`, {
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

		console.log("BACKEND REMOVE FROM WISHLIST RESPONSE:", data);

		const nextResponse = NextResponse.json(data, {
			status: response.status,
		});

		const setCookie = response.headers.get("set-cookie");

		if (setCookie) {
			nextResponse.headers.set("set-cookie", setCookie);
		}

		return nextResponse;
	} catch (error) {
		console.error("Remove from wishlist proxy error:", error);

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
