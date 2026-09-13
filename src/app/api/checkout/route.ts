import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		/*
		 * Forward the user's cookies to the backend.
		 *
		 * This is important if your cart/session is
		 * associated with cookies.
		 */

		const cookie = request.headers.get("cookie");

		const response = await fetch(`${API_URL}/api/checkout`, {
			method: "POST",

			headers: {
				"Content-Type": "application/json",

				...(cookie
					? {
							Cookie: cookie,
						}
					: {}),
			},

			body: JSON.stringify(body),

			cache: "no-store",
		});

		const text = await response.text();

		let data: unknown;

		try {
			data = JSON.parse(text);
		} catch {
			data = {
				message: text || "Invalid response from checkout API.",
			};
		}

		return NextResponse.json(data, {
			status: response.status,
		});
	} catch (error) {
		console.error("Checkout proxy error:", error);

		return NextResponse.json(
			{
				message: "Unable to connect to checkout service.",
			},
			{
				status: 500,
			},
		);
	}
}
