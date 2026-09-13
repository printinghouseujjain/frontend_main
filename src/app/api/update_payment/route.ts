import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

export async function POST(request: NextRequest) {
	try {
		const body = (await request.json().catch(() => ({}))) as { order_id?: string; status?: string };
		const orderId = body.order_id?.trim();
		const status = body.status?.trim().toLowerCase();

		if (!orderId || status !== "refunded") {
			return NextResponse.json({ message: "order_id and status=refunded are required." }, { status: 400 });
		}

		const backendFormData = new FormData();
		backendFormData.append("command_type", "admin");
		backendFormData.append("order_id", orderId);
		backendFormData.append("status", "refunded");
		const cookie = request.headers.get("cookie");
		const response = await fetch(`${API_URL}/update_payment`, {
			method: "POST",
			headers: { Accept: "application/json", ...(cookie ? { Cookie: cookie } : {}) },
			body: backendFormData,
			cache: "no-store",
		});

		const text = await response.text();
		let data: unknown;
		try {
			data = text ? JSON.parse(text) : {};
		} catch {
			data = { message: text || "Invalid response from payment update server." };
		}
		return NextResponse.json(data, { status: response.status });
	} catch (error) {
		console.error("Payment update proxy error:", error);
		return NextResponse.json({ message: "Unable to update payment status." }, { status: 500 });
	}
}
