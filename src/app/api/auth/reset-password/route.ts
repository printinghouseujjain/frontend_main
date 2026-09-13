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

		const otp = formData.get("otp");
		const transactionId = formData.get("transaction_id");
		const newPassword = formData.get("new_password");

		if (
			typeof otp !== "string" ||
			!otp.trim() ||
			typeof transactionId !== "string" ||
			!transactionId.trim() ||
			typeof newPassword !== "string" ||
			!newPassword
		) {
			return NextResponse.json(
				{
					message: "Missing required fields.",
				},
				{
					status: 400,
				},
			);
		}

		/*
		 * Backend expects FORM DATA.
		 */
		const backendFormData = new FormData();

		backendFormData.append("otp", otp.trim());
		backendFormData.append("transaction_id", transactionId.trim());
		backendFormData.append("new_password", newPassword);

		console.log("FORWARDING RESET PASSWORD REQUEST:", {
			otp: otp.trim(),
			transaction_id: transactionId.trim(),
			new_password: "[HIDDEN]",
		});

		/*
		 * Browser
		 *   ↓
		 * /api/auth/reset-password
		 *   ↓
		 * https://api.printinghouseujjain.in/api/verify
		 */

		const response = await fetch(`${API_URL}/api/verify`, {
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

		console.log("BACKEND RESET PASSWORD RESPONSE:", data);

		return NextResponse.json(data, {
			status: response.status,
		});
	} catch (error) {
		console.error("Reset password proxy error:", error);

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
