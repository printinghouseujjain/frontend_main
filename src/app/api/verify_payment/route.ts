import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		/*
		 * Only send the three Razorpay values
		 * required by your backend.
		 */

		const payload = {
			razorpay_order_id: body.razorpay_order_id,

			razorpay_signature: body.razorpay_signature,

			razorpay_payment_id: body.razorpay_payment_id,
		};

		if (
			!payload.razorpay_order_id ||
			!payload.razorpay_signature ||
			!payload.razorpay_payment_id
		) {
			return NextResponse.json(
				{
					message: "Missing Razorpay payment verification fields.",
				},
				{
					status: 400,
				},
			);
		}

		/*
		 * Forward cookies/session to backend.
		 */

		const cookie = request.headers.get("cookie");

		const response = await fetch(`${API_URL}/api/verify_payment`, {
			method: "POST",

			headers: {
				"Content-Type": "application/json",

				...(cookie
					? {
							Cookie: cookie,
						}
					: {}),
			},

			body: JSON.stringify(payload),

			cache: "no-store",
		});

		const text = await response.text();

		let data: unknown;

		try {
			data = JSON.parse(text);
		} catch {
			data = {
				message: text || "Invalid response from payment verification API.",
			};
		}

		return NextResponse.json(data, {
			status: response.status,
		});
	} catch (error) {
		console.error("Payment verification proxy error:", error);

		return NextResponse.json(
			{
				message: "Unable to connect to payment verification service.",
			},
			{
				status: 500,
			},
		);
	}
}
