import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

export async function POST(request: NextRequest) {
	try {
		const incomingFormData = await request.formData();

		const formData = new FormData();

		const fields = [
			"id",
			"name",
			"phone",
			"flat_house_building",
			"road_area_colony",
			"landmark",
			"city",
			"state",
			"pincode",
		];

		for (const field of fields) {
			const value = incomingFormData.get(field);

			if (value !== null) {
				formData.append(field, String(value));
			}
		}

		const cookie = request.headers.get("cookie");

		const response = await fetch(`${API_URL}/api/update_address`, {
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
				message: text || "Invalid response from update user server.",
			};
		}

		console.log("BACKEND UPDATE USER RESPONSE:", data);

		const nextResponse = NextResponse.json(data, {
			status: response.status,
		});

		const setCookie = response.headers.get("set-cookie");

		if (setCookie) {
			nextResponse.headers.set("set-cookie", setCookie);
		}

		return nextResponse;
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
