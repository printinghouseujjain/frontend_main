import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

export async function POST(request: NextRequest) {
	try {
		/*
		 * Frontend sends multipart/form-data.
		 *
		 * DO NOT use request.json() here.
		 */
		const formData = await request.formData();

		const email = formData.get("email");
		const newPassword = formData.get("new_password");

		if (typeof email !== "string" || !email.trim()) {
			return NextResponse.json(
				{
					message: "Email address is required.",
				},
				{
					status: 400,
				},
			);
		}

		if (typeof newPassword !== "string" || !newPassword) {
			return NextResponse.json(
				{
					message: "New password is required.",
				},
				{
					status: 400,
				},
			);
		}

		/*
		 * Backend expects FORM DATA with both fields:
		 * email
		 * new_password
		 */
		const backendFormData = new FormData();

		backendFormData.append("email", email.trim().toLowerCase());
		backendFormData.append("new_password", newPassword);

		console.log("FORWARDING FORGOT PASSWORD REQUEST:", {
			email: email.trim().toLowerCase(),
			new_password: "[HIDDEN]",
		});

		/*
		 * Browser
		 *   ↓
		 * /api/auth/forgot
		 *   ↓
		 * https://api.printinghouseujjain.in/api/forgot
		 *
		 * Backend sends an OTP to the given email and returns a
		 * transaction_id used to verify that OTP in the next step.
		 */

		const response = await fetch(`${API_URL}/api/forgot`, {
			method: "POST",
			body: backendFormData,
			headers: {
				Accept: "application/json",
			},
			cache: "no-store",
		});

		const text = await response.text();

		let data: unknown;

		try {
			data = JSON.parse(text);
		} catch {
			data = {
				message: text || "Invalid response from server.",
			};
		}

		console.log("BACKEND FORGOT PASSWORD RESPONSE:", data);

		return NextResponse.json(data, {
			status: response.status,
		});
	} catch (error) {
		console.error("Forgot password proxy error:", error);

		return NextResponse.json(
			{
				message: "Unable to connect to server.",
			},
			{
				status: 500,
			},
		);
	}
}
