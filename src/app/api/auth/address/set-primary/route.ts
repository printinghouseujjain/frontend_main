import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

export async function POST(request: NextRequest) {
	try {
		const incomingFormData = await request.formData();

		const id = incomingFormData.get("id");

		if (!id) {
			return NextResponse.json(
				{
					message: "Address ID is required.",
				},
				{
					status: 400,
				},
			);
		}

		const formData = new FormData();

		formData.append("id", String(id));

		const cookie = request.headers.get("cookie");

		const response = await fetch(`${API_URL}/api/set_primary`, {
			method: "POST",
			headers: {
				Accept: "application/json",
				...(cookie ? { Cookie: cookie } : {}),
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
				message: text || "Invalid response from set primary server.",
			};
		}

		console.log("BACKEND SET PRIMARY RESPONSE:", data);

		return NextResponse.json(data, {
			status: response.status,
		});
	} catch (error) {
		console.error("Set primary proxy error:", error);

		return NextResponse.json(
			{
				message: "Unable to set primary address.",
			},
			{
				status: 500,
			},
		);
	}
}
