import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

export async function POST(request: NextRequest) {
	try {
		/*
		 * The frontend sends multipart/form-data.
		 *
		 * DO NOT use request.json() here.
		 */
		const formData = await request.formData();

		const email = formData.get("email");
		const name = formData.get("name");
		const phone = formData.get("phone");
		const password = formData.get("password");

		/*
		 * Validate that the required fields exist.
		 */
		if (
			typeof email !== "string" ||
			typeof name !== "string" ||
			typeof phone !== "string" ||
			typeof password !== "string"
		) {
			return NextResponse.json(
				{
					message: "Missing required signup fields.",
				},
				{
					status: 400,
				},
			);
		}

		/*
		 * Create a NEW FormData object for the backend.
		 *
		 * Backend expects:
		 * email
		 * Name
		 * Phone
		 * Password
		 */
		const backendFormData = new FormData();

		backendFormData.append("email", email.trim().toLowerCase());
		backendFormData.append("name", name.trim());
		backendFormData.append("phone", phone.trim());
		backendFormData.append("password", password);

		console.log("FORWARDING SIGNUP FORM DATA:", {
			email,
			Name: name,
			Phone: phone,
			Password: "[HIDDEN]",
		});

		/*
		 * Forward the FormData to the actual backend.
		 *
		 * IMPORTANT:
		 * Do NOT manually set Content-Type.
		 *
		 * fetch() automatically creates:
		 *
		 * Content-Type: multipart/form-data; boundary=...
		 */
		const response = await fetch(`${API_URL}/api/signup`, {
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
				message: text || "Invalid response from signup server.",
			};
		}

		console.log("BACKEND SIGNUP RESPONSE:", data);

		return NextResponse.json(data, {
			status: response.status,
		});
	} catch (error) {
		console.error("Signup proxy error:", error);

		return NextResponse.json(
			{
				message: "Unable to connect to signup server.",
			},
			{
				status: 500,
			},
		);
	}
}
