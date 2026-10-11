import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

type RepayBody = {
	order_id?: string | number;
	payment_method?: string;
	payment_menthod?: string;
};

export async function POST(request: NextRequest) {
	try {
		const body = (await request.json().catch(() => ({}))) as RepayBody;
		const orderId = String(body.order_id ?? "").trim();
		const paymentMethod = String(
			body.payment_method ?? body.payment_menthod ?? "",
		)
			.trim()
			.toLowerCase();

		if (!orderId) {
			return NextResponse.json(
				{ message: "order_id is required." },
				{ status: 400 },
			);
		}

		if (paymentMethod !== "upi" && paymentMethod !== "razorpay") {
			return NextResponse.json(
				{ message: "payment_method must be upi or razorpay." },
				{ status: 400 },
			);
		}

		const cookie = request.headers.get("cookie");

		const response = await fetch(`${API_URL}/api/repay_payment`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				...(cookie ? { Cookie: cookie } : {}),
			},
			body: JSON.stringify({
				order_id: orderId,
				payment_method: paymentMethod,
				payment_menthod: paymentMethod,
			}),
			cache: "no-store",
		});

		const text = await response.text();
		let data: unknown;

		try {
			data = text ? JSON.parse(text) : {};
		} catch {
			data = {
				message: text || "Invalid response from repay payment service.",
			};
		}

		return NextResponse.json(data, { status: response.status });
	} catch (error) {
		console.error("Repay payment proxy error:", error);

		return NextResponse.json(
			{ message: "Unable to start repayment." },
			{ status: 500 },
		);
	}
}
