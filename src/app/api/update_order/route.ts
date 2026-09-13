import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";
const ALLOWED_STATUSES = ["cancelled", "accepted", "packed", "shipped", "delivered"] as const;

type UpdateOrderBody = {
	order_id?: string;
	status?: string;
    command_type?: string;
	current_status?: string;
};

export async function POST(request: NextRequest) {
	try {
		const body = (await request.json().catch(() => ({}))) as UpdateOrderBody;
		const orderId = body.order_id?.trim();
		const status = body.status?.trim().toLowerCase();

		if (!orderId || !status) {
			return NextResponse.json({ message: "order_id and status are required." }, { status: 400 });
		}
		if (!ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
			return NextResponse.json({ message: "Invalid order status." }, { status: 400 });
		}
		if (status === "cancelled" && body.current_status && body.current_status.toLowerCase() !== "pending") {
			return NextResponse.json({ message: "An order can only be cancelled before it is accepted." }, { status: 400 });
		}

		const backendFormData = new FormData();
		backendFormData.append("command_type", "admin");
		backendFormData.append("order_id", orderId);
		backendFormData.append("status_set", status);
		const cookie = request.headers.get("cookie");
		const response = await fetch(`${API_URL}/api/update_order`, {
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
			data = { message: text || "Invalid response from order update server." };
		}
		return NextResponse.json(data, { status: response.status });
	} catch (error) {
		console.error("Order update proxy error:", error);
		return NextResponse.json({ message: "Unable to update order status." }, { status: 500 });
	}
}
