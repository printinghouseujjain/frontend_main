import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

type AcceptBody = {
	payment_method?: string;
	order_id?: string;
	amount?: string | number;
	utr?: string;
	name?: string;
	time?: string;
	notes?: string;
};

export async function POST(request: NextRequest) {
	try {
		const body = (await request.json().catch(() => ({}))) as AcceptBody;
		const paymentMethod = body.payment_method?.trim().toLowerCase();
		const orderId = body.order_id?.trim();
		const amount = Number(body.amount);

		if (paymentMethod !== "upi" && paymentMethod !== "credit") {
			return NextResponse.json(
				{ message: "payment_method must be upi or credit." },
				{ status: 400 },
			);
		}

		if (!orderId) {
			return NextResponse.json(
				{ message: "order_id is required." },
				{ status: 400 },
			);
		}

		if (!Number.isFinite(amount) || amount <= 0) {
			return NextResponse.json(
				{ message: "amount must be greater than 0." },
				{ status: 400 },
			);
		}

		const backendFormData = new FormData();
		backendFormData.append("command_type", "admin");
		backendFormData.append("payment_method", paymentMethod);
		backendFormData.append("order_id", orderId);
		backendFormData.append("amount", String(amount));

		const optionalFields = ["utr", "name", "time", "notes"] as const;

		for (const field of optionalFields) {
			const value = body[field]?.trim();

			if (value) {
				backendFormData.append(field, value);
			}
		}

		const cookie = request.headers.get("cookie");

		const response = await fetch(`${API_URL}/api/accept_payment`, {
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
				message: text || "Invalid response from accept payment server.",
			};
		}

		return NextResponse.json(data, { status: response.status });
	} catch (error) {
		console.error("Accept payment proxy error:", error);

		return NextResponse.json(
			{ message: "Unable to settle payment." },
			{ status: 500 },
		);
	}
}
