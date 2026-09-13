import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const orderId = formData.get("order_id");
		const cartIndex = formData.get("cart_index");

		if (typeof orderId !== "string" || typeof cartIndex !== "string") {
			return NextResponse.json({ message: "order_id and cart_index are required." }, { status: 400 });
		}

		const backendFormData = new FormData();
		backendFormData.append("order_id", orderId);
		backendFormData.append("cart_index", cartIndex);

		const response = await fetch(`${API_URL}/api/delete_review`, {
			method: "POST",
			headers: {
				Accept: "application/json",
				...(request.headers.get("cookie") ? { Cookie: request.headers.get("cookie")! } : {}),
			},
			body: backendFormData,
			cache: "no-store",
		});

		const text = await response.text();
		let data: unknown;
		try {
			data = text ? JSON.parse(text) : {};
		} catch {
			data = { message: text || "Invalid delete review response." };
		}

		return NextResponse.json(data, { status: response.status });
	} catch (error) {
		console.error("Delete review proxy error:", error);
		return NextResponse.json({ message: "Unable to delete review." }, { status: 500 });
	}
}
