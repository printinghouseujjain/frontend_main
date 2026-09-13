import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

export async function POST(request: NextRequest) {
	try {
		/*
		 * The frontend sends multipart/form-data, not JSON.
		 *
		 * DO NOT use request.json() here.
		 */
		const formData = await request.formData();

		const otp = formData.get("otp");
		const transactionId = formData.get("transaction_id");

		console.log("VERIFY REQUEST FORM DATA:", {
			otp,
			transaction_id: transactionId,
		});

		if (typeof otp !== "string" || typeof transactionId !== "string") {
			return NextResponse.json(
				{
					message: "Missing required verification fields.",
				},
				{
					status: 400,
				},
			);
		}

		const response = await fetch(`${API_URL}/api/verify`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({
				otp,
				transaction_id: transactionId,
			}),
			cache: "no-store",
		});

		const text = await response.text();

		let data: unknown;

		try {
			data = JSON.parse(text);
		} catch {
			data = {
				message: text || "Invalid response from verification server.",
			};
		}

		console.log("BACKEND VERIFY RESPONSE:", data);

		/*
		 * Forward cookies from the backend.
		 *
		 * This is important if /api/verify creates the
		 * authenticated session using a Set-Cookie header.
		 */
		const nextResponse = NextResponse.json(data, {
			status: response.status,
		});

		const setCookie = response.headers.get("set-cookie");

		if (setCookie) {
			nextResponse.headers.set("set-cookie", setCookie);
		}

		return nextResponse;
	} catch (error) {
		console.error("Verify proxy error:", error);

		return NextResponse.json(
			{
				message: "Unable to connect to verification server.",
			},
			{
				status: 500,
			},
		);
	}
}
