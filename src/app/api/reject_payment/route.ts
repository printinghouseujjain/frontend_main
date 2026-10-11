import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

type RejectBody = {
	order_id?: string | number;
	notes?: string;
};

export async function POST(request: NextRequest) {
	try {
		const body = (await request.json().catch(() => ({}))) as RejectBody;
		const orderId = String(body.order_id ?? "").trim();
		const notes = String(body.notes ?? "").trim();

		if (!orderId) {
			return NextResponse.json(
				{ message: "order_id is required." },
				{ status: 400 },
			);
		}

		const backendFormData = new FormData();
		backendFormData.append("command_type", "admin");
		backendFormData.append("order_id", orderId);

		if (notes) {
			backendFormData.append("notes", notes);
		}

		const cookie = request.headers.get("cookie");

		const response = await fetch(`${API_URL}/api/reject_payment`, {
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
				message: text || "Invalid response from reject payment server.",
			};
		}

		return NextResponse.json(data, { status: response.status });
	} catch (error) {
		console.error("Reject payment proxy error:", error);

		return NextResponse.json(
			{ message: "Unable to reject this payment." },
			{ status: 500 },
		);
	}
}
