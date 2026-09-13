import { NextRequest, NextResponse } from "next/server";
const API_URL = "https://api.printinghouseujjain.in";

export async function GET(request: NextRequest) {
	try {
		const cookie = request.headers.get("cookie");

		const response = await fetch(`${API_URL}/api/orders`, {
			method: "GET",
			headers: {
				Accept: "application/json",
				...(cookie ? { Cookie: cookie } : {}),
			},

			cache: "no-store",
		});

		const text = await response.text();

		let data: unknown;

		try {
			data = text ? JSON.parse(text) : {};
		} catch {
			console.error("INVALID ORDERS RESPONSE:", text);

			data = {
				message: text || "Invalid response from orders server.",
			};
		}

		console.log("BACKEND ORDERS RESPONSE:", data);

		const nextResponse = NextResponse.json(data, {
			status: response.status,
		});

		const setCookie = response.headers.get("set-cookie");

		if (setCookie) {
			nextResponse.headers.set("set-cookie", setCookie);
		}

		return nextResponse;
	} catch (error) {
		console.error("Orders proxy error:", error);

		return NextResponse.json(
			{
				message: "Unable to connect to orders server.",
			},
			{
				status: 500,
			},
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const cookie = request.headers.get("cookie");
		const formData = await request.formData();
		const orderId = formData.get("order_id");

		if (typeof orderId !== "string" || !orderId.trim()) {
			return NextResponse.json(
				{ message: "order_id is required." },
				{ status: 400 },
			);
		}

		const backendFormData = new FormData();
		backendFormData.append("order_id", orderId.trim());

		const response = await fetch(`${API_URL}/api/orders`, {
			method: "POST",
			headers: {
				Accept: "application/json",
				...(cookie ? { Cookie: cookie } : {}),
			},
			body: backendFormData,
			cache: "no-store",
		});

		const text = await response.text();
		let data: unknown;

		try {
			data = text ? JSON.parse(text) : {};
		} catch {
			data = {
				message: text || "Invalid response from orders server.",
			};
		}

		const nextResponse = NextResponse.json(data, {
			status: response.status,
		});

		const setCookie = response.headers.get("set-cookie");

		if (setCookie) {
			nextResponse.headers.set("set-cookie", setCookie);
		}

		return nextResponse;
	} catch (error) {
		console.error("Order detail proxy error:", error);

		return NextResponse.json(
			{ message: "Unable to connect to orders server." },
			{ status: 500 },
		);
	}
}