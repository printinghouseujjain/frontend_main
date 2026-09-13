import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

export async function GET(request: NextRequest) {
	try {
		const incomingCookie = request.headers.get("cookie");

		const backendUrl = `${API_URL}/api/wishlist`;

		console.log("=================================");
		console.log("WISHLIST PROXY");
		console.log("Backend URL:", backendUrl);
		console.log("Method: GET");
		console.log("Has Cookie:", Boolean(incomingCookie));

		const response = await fetch(backendUrl, {
			method: "GET",
			headers: {
				Accept: "application/json",

				...(incomingCookie
					? {
							Cookie: incomingCookie,
						}
					: {}),
			},
			cache: "no-store",
		});

		const text = await response.text();

		console.log("Backend Status:", response.status);
		console.log("Backend Response:", text);
		console.log("=================================");

		let data: unknown;

		try {
			data = text ? JSON.parse(text) : {};
		} catch {
			data = {
				message: text || "Invalid response from wishlist server.",
			};
		}

		/*
		 * Forward the backend response to the browser.
		 */
		const nextResponse = NextResponse.json(data, {
			status: response.status,
		});

		/*
		 * Forward any Set-Cookie header returned by
		 * the backend.
		 */
		const setCookie = response.headers.get("set-cookie");

		if (setCookie) {
			nextResponse.headers.set("set-cookie", setCookie);
		}

		return nextResponse;
	} catch (error) {
		console.error("Wishlist proxy error:", error);

		return NextResponse.json(
			{
				status: 500,
				message: "Unable to connect to wishlist server.",
				error:
					error instanceof Error
						? error.message
						: "Unknown error",
			},
			{
				status: 500,
			},
		);
	}
}

