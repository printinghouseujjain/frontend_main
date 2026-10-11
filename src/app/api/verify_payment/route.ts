import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

type VerifyBody = {
	payment_method?: string;
	razorpay_order_id?: string;
	razorpay_payment_id?: string;
	razorpay_signature?: string;
	repay?: string;
};

export async function POST(request: NextRequest) {
	try {
		const body = (await request.json().catch(() => ({}))) as VerifyBody;
		const paymentMethod = body.payment_method?.trim().toLowerCase();
		const razorpayOrderId = body.razorpay_order_id?.trim();

		if (
			paymentMethod !== "razorpay" &&
			paymentMethod !== "upi" &&
			paymentMethod !== "credit"
		) {
			return NextResponse.json(
				{ message: "payment_method must be razorpay, upi, or credit." },
				{ status: 400 },
			);
		}

		if (!razorpayOrderId) {
			return NextResponse.json(
				{ message: "razorpay_order_id is required." },
				{ status: 400 },
			);
		}

		const payload: Record<string, string> = {
			payment_method: paymentMethod,
			razorpay_order_id: razorpayOrderId,
		};

		if (paymentMethod === "razorpay") {
			const paymentId = body.razorpay_payment_id?.trim();
			const signature = body.razorpay_signature?.trim();

			if (!paymentId || !signature) {
				return NextResponse.json(
					{
						message:
							"razorpay_payment_id and razorpay_signature are required for Razorpay.",
					},
					{ status: 400 },
				);
			}

			payload.razorpay_payment_id = paymentId;
			payload.razorpay_signature = signature;
		}

		payload.repay =
			body.repay?.trim().toLowerCase() === "yes" ? "yes" : "no";

		const cookie = request.headers.get("cookie");

		const response = await fetch(`${API_URL}/api/verify_payment`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(cookie ? { Cookie: cookie } : {}),
			},
			body: JSON.stringify(payload),
			cache: "no-store",
		});

		const text = await response.text();
		console.log(text);
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
