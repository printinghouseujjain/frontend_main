import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

export async function POST(request: NextRequest) {
	try {
		const incomingFormData = await request.formData();

		const formData = new FormData();

		for (const [key, value] of incomingFormData.entries()) {
			formData.append(key, value);
		}

		const response = await fetch(`${API_URL}/api/update_user`, {
			method: "POST",
			headers: {
				Accept: "application/json",
				Cookie: request.headers.get("cookie") || "",
			},
			body: formData,
			cache: "no-store",
		});

		const text = await response.text();

		let data: unknown;

		try {
			data = text ? JSON.parse(text) : {};
		} catch {
			data = {
				message: text || "Invalid response from server.",
			};
		}

		console.log("BACKEND UPDATE USER RESPONSE:", data);

		return NextResponse.json(data, {
			status: response.status,
		});
	} catch (error) {
		console.error("Update user proxy error:", error);

		return NextResponse.json(
			{
				message: "Unable to update user.",
			},
			{
				status: 500,
			},
		);
	}
}
