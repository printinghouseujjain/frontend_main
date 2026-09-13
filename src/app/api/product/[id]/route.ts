import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

export async function POST(request: NextRequest) {
	try {
		/* =========================================================
		   GET USER COOKIE
		========================================================= */

		const cookie = request.headers.get("cookie");

		/* =========================================================
		   READ FORMDATA FROM FRONTEND
		========================================================= */

		const formData = await request.formData();

		const productId = formData.get("product_id");
		console.log("Product ID:", productId);

		if (!productId || typeof productId !== "string") {
			return NextResponse.json(
				{
					status: 400,
					message: "product_id is required.",
				},
				{
					status: 400,
				},
			);
		}

		console.log("=================================");
		console.log("PRODUCT PROXY");
		console.log("Product ID:", productId);
		console.log("Has Cookie:", Boolean(cookie));
		console.log("=================================");

		/* =========================================================
		   SEND FORMDATA TO BACKEND
		========================================================= */

		const backendFormData = new FormData();

		backendFormData.append("product_id", productId);

		const response = await fetch(`${API_URL}/api/products`, {
			method: "POST",
			headers: {
				Accept: "application/json",

				/*
				 * IMPORTANT:
				 *
				 * Do NOT manually set Content-Type here.
				 *
				 * fetch() automatically creates:
				 *
				 * multipart/form-data; boundary=...
				 */
				...(cookie ? { Cookie: cookie } : {}),
			},
			body: backendFormData,
			cache: "no-store",
		});

		/* =========================================================
		   READ BACKEND RESPONSE
		========================================================= */

		const text = await response.text();

		let data: unknown;

		try {
			data = text ? JSON.parse(text) : {};
		} catch {
			console.error("INVALID PRODUCT RESPONSE:", text);

			data = {
				message: text || "Invalid response from product server.",
			};
		}

		console.log("Backend Product Status:", response.status);
		console.log("Backend Product Response:", data);

		/* =========================================================
		   RETURN RESPONSE TO FRONTEND
		========================================================= */

		const nextResponse = NextResponse.json(data, {
			status: response.status,
		});

		/* =========================================================
		   FORWARD SET-COOKIE IF BACKEND RETURNS ONE
		========================================================= */

		const setCookie = response.headers.get("set-cookie");

		if (setCookie) {
			nextResponse.headers.set("set-cookie", setCookie);
		}

		return nextResponse;
	} catch (error) {
		console.error("Product proxy error:", error);

		return NextResponse.json(
			{
				status: 500,
				message: "Unable to connect to product server.",
			},
			{
				status: 500,
			},
		);
	}
}
