import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

export async function POST(request: NextRequest) {
	try {
		console.log("====================================");
		console.log("NEXT.JS /api/cart/add CALLED");
		console.log("====================================");

		/*
		 * Read multipart/form-data from the frontend.
		 *
		 * Product customization can contain:
		 * - text fields
		 * - customization requirements
		 * - uploaded images
		 */
		const formData = await request.formData();

		console.log("FORM DATA RECEIVED:");

		for (const [key, value] of formData.entries()) {
			if (value instanceof File) {
				console.log(
					key,
					`[File: ${value.name}, ${value.size} bytes, ${value.type}]`,
				);
			} else {
				console.log(key, value);
			}
		}

		/*
		 * Forward the user's cookies to the backend.
		 */
		const cookie = request.headers.get("cookie");

		console.log("COOKIE:", cookie ? "Present" : "Not present");

		/*
		 * Call the actual backend.
		 */
		const backendUrl = `${API_URL}/api/add_to_cart`;

		console.log("FORWARDING TO:", backendUrl);

		const response = await fetch(backendUrl, {
			method: "POST",

			headers: {
				Accept: "application/json",

				...(cookie
					? {
							Cookie: cookie,
						}
					: {}),
			},

			/*
			 * IMPORTANT:
			 *
			 * Do NOT manually set Content-Type.
			 *
			 * Since this is FormData, fetch automatically
			 * generates the multipart boundary.
			 */
			body: formData,

			cache: "no-store",
		});

		console.log("BACKEND STATUS:", response.status);
		console.log("BACKEND STATUS TEXT:", response.statusText);

		const responseText = await response.text();

		console.log("BACKEND RAW RESPONSE:", responseText);

		let data: unknown;

		try {
			data = JSON.parse(responseText);
		} catch {
			data = {
				message:
					responseText || "Invalid response from backend cart server.",
			};
		}

		/*
		 * If the backend itself returns 404,
		 * make that very clear to the frontend.
		 */
		if (!response.ok) {
			console.error(
				`Backend cart request failed: ${response.status}`,
				data,
			);

			return NextResponse.json(
				{
					success: false,
					message:
						typeof data === "object" &&
						data !== null &&
						"message" in data
							? String(
									(data as { message?: unknown }).message ??
										"Backend request failed.",
								)
							: "Backend cart request failed.",

					backendStatus: response.status,
					backendResponse: data,
				},
				{
					status: response.status,
				},
			);
		}

		/*
		 * Forward successful response.
		 */
		const nextResponse = NextResponse.json(data, {
			status: response.status,
		});

		/*
		 * Forward Set-Cookie from backend.
		 */
		const setCookie = response.headers.get("set-cookie");

		if (setCookie) {
			nextResponse.headers.set("set-cookie", setCookie);
		}

		return nextResponse;
	} catch (error) {
		console.error("====================================");
		console.error("ADD TO CART PROXY ERROR");
		console.error(error);
		console.error("====================================");

		return NextResponse.json(
			{
				success: false,
				message: "Unable to connect to cart server.",
			},
			{
				status: 500,
			},
		);
	}
}