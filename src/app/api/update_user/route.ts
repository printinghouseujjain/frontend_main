import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";
const REQUIRED_FIELDS = ["user_id", "name", "email", "phone", "reseller"] as const;

export async function POST(request: NextRequest) {
	try {
		const input = await request.formData();
		const backendFormData = new FormData();
		backendFormData.append("command_type", "admin");

		for (const field of REQUIRED_FIELDS) {
			const value = input.get(field);
			if (field === "user_id" && (!value || typeof value !== "string")) {
				return NextResponse.json({ message: "user_id is required." }, { status: 400 });
			}
			if (typeof value === "string") {
				backendFormData.append(field, value.trim());
			}
		}

		const cookie = request.headers.get("cookie");
		const response = await fetch(`${API_URL}/api/update_user`, {
			method: "POST",
			headers: {
			Accept: "application/json",
			...(cookie ? { Cookie: cookie } : {}),
		},
		body: backendFormData,
		cache: "no-store",
		});

		const text = await response.text();
		let data: unknown;
		try {
			data = text ? JSON.parse(text) : {};
		} catch {
			data = { message: text || "Invalid response from user update server." };
		}

		const nextResponse = NextResponse.json(data, { status: response.status });
		const setCookie = response.headers.get("set-cookie");
		if (setCookie) nextResponse.headers.set("set-cookie", setCookie);
		return nextResponse;
	} catch (error) {
		console.error("User update proxy error:", error);
		return NextResponse.json({ message: "Unable to update user." }, { status: 500 });
	}
}
