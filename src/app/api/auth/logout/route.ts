import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

export async function POST(request: NextRequest) {
	try {
		const cookie = request.headers.get("cookie");

		const response = await fetch(`${API_URL}/api/logout`, {
			method: "POST",
			headers: {
				Accept: "application/json",
				...(cookie ? { Cookie: cookie } : {}),
			},
			cache: "no-store",
		});

		const text = await response.text();

		let data: unknown;

		try {
			data = text ? JSON.parse(text) : {};
		} catch {
			data = {
				message: text || "Invalid response from logout server.",
			};
		}

		console.log("BACKEND LOGOUT RESPONSE:", data);

		const nextResponse = NextResponse.json(data, {
			status: response.status,
		});

		const setCookie = response.headers.get("set-cookie");

		if (setCookie) {
			nextResponse.headers.set("set-cookie", setCookie);
		}

		return nextResponse;
	} catch (error) {
		console.error("Logout proxy error:", error);

		return NextResponse.json(
			{
				message: "Unable to connect to logout server.",
			},
			{
				status: 500,
			},
		);
	}
}
