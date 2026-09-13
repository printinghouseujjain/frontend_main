import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

/* =========================================================
   FORWARD BACKEND SET-COOKIE HEADERS
========================================================= */

function forwardSetCookies(
	sourceResponse: Response,
	nextResponse: NextResponse,
) {
	const headers = sourceResponse.headers as Headers & {
		getSetCookie?: () => string[];
	};

	if (typeof headers.getSetCookie === "function") {
		for (const cookie of headers.getSetCookie()) {
			nextResponse.headers.append("set-cookie", cookie);
		}

		return;
	}

	const setCookie = sourceResponse.headers.get("set-cookie");

	if (setCookie) {
		nextResponse.headers.set("set-cookie", setCookie);
	}
}

/* =========================================================
   POST
========================================================= */

export async function POST(request: NextRequest) {
	try {
		const cookie = request.headers.get("cookie");

		/* =====================================================
		   READ FRONTEND FORMDATA
		===================================================== */

		const formData = await request.formData();

		const action = formData.get("action");
		const userId = formData.get("user_id");
		const productId = formData.get("product_id");
		const resellerPrice = formData.get("reseller_price");

		/* =====================================================
		   VALIDATE ACTION
		===================================================== */

		if (
			typeof action !== "string" ||
			!["add", "change", "remove"].includes(action)
		) {
			return NextResponse.json(
				{
					message: "action must be add, change, or remove.",
				},
				{
					status: 400,
				},
			);
		}

		/* =====================================================
		   VALIDATE USER ID
		===================================================== */

		if (typeof userId !== "string" || !userId.trim()) {
			return NextResponse.json(
				{
					message: "user_id is required.",
				},
				{
					status: 400,
				},
			);
		}

		/* =====================================================
		   VALIDATE PRODUCT ID
		===================================================== */

		if (typeof productId !== "string" || !productId.trim()) {
			return NextResponse.json(
				{
					message: "product_id is required.",
				},
				{
					status: 400,
				},
			);
		}

		/* =====================================================
		   ADD / CHANGE REQUIRE PRICE
		===================================================== */

		if (
			(action === "add" || action === "change") &&
			(typeof resellerPrice !== "string" || !resellerPrice.trim())
		) {
			return NextResponse.json(
				{
					message: "reseller_price is required for add and change.",
				},
				{
					status: 400,
				},
			);
		}

		/* =====================================================
		   BUILD BACKEND FORMDATA
		===================================================== */

		const backendFormData = new FormData();

		backendFormData.append("command_type", "admin");

		backendFormData.append("action", action);

		backendFormData.append("user_id", userId.trim());

		backendFormData.append("product_id", productId.trim());

		if (action === "add" || action === "change") {
			backendFormData.append(
				"reseller_price",
				(resellerPrice as string).trim(),
			);
		}

		/* =====================================================
		   LOG
		===================================================== */

		console.log("=================================");
		console.log("UPDATE RESELLER PROXY");
		console.log("Action:", action);
		console.log("User ID:", userId);
		console.log("Product ID:", productId);
		console.log("Reseller Price:", action === "remove" ? "N/A" : resellerPrice);
		console.log("Has Cookie:", Boolean(cookie));
		console.log("=================================");

		/* =====================================================
		   BACKEND REQUEST
		===================================================== */

		const response = await fetch(`${API_URL}/api/update_reseller`, {
			method: "POST",
			headers: {
				Accept: "application/json",

				...(cookie
					? {
							Cookie: cookie,
						}
					: {}),
			},
			body: backendFormData,
			cache: "no-store",
		});

		/* =====================================================
		   READ BACKEND RESPONSE
		===================================================== */

		const text = await response.text();

		let data: unknown;

		try {
			data = text ? JSON.parse(text) : {};
		} catch {
			console.error("INVALID UPDATE RESELLER RESPONSE:", text);

			data = {
				message: text || "Invalid response from reseller update server.",
			};
		}

		console.log("UPDATE RESELLER BACKEND STATUS:", response.status);

		console.log("UPDATE RESELLER BACKEND RESPONSE:", data);

		/* =====================================================
		   RETURN RESPONSE
		===================================================== */

		const nextResponse = NextResponse.json(data, {
			status: response.status,
		});

		/* =====================================================
		   FORWARD BACKEND COOKIES
		===================================================== */

		forwardSetCookies(response, nextResponse);

		return nextResponse;
	} catch (error) {
		console.error("Update reseller proxy error:", error);

		return NextResponse.json(
			{
				message: "Unable to connect to reseller update server.",
			},
			{
				status: 500,
			},
		);
	}
}
