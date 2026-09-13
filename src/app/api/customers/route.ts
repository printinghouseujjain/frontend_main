import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

/*
 * ADMIN — LIST ALL USERS
 *
 * Backend expects:
 *
 * POST /api/users
 * command_type=admin
 *
 * The frontend just calls GET on this proxy (no body needed) —
 * this route builds the command_type form field internally and
 * forwards it to the backend as a POST.
 */

export async function GET(request: NextRequest) {
	try {
		const cookie = request.headers.get("cookie");

		/* =========================================================
           BUILD BACKEND REQUEST
        ========================================================= */

		const backendFormData = new FormData();

		backendFormData.append("command_type", "admin");

		console.log("=================================");
		console.log("ADMIN USERS PROXY");
		console.log("Has Cookie:", Boolean(cookie));
		console.log("=================================");

		const response = await fetch(`${API_URL}/api/users`, {
			method: "POST",
			headers: {
				Accept: "application/json",
				...(cookie ? { Cookie: cookie } : {}),
			},
			body: backendFormData,
			cache: "no-store",
		});

		/* =========================================================
           READ BACKEND RESPONSE
        ========================================================= */

		const text = await response.text();

		let data: unknown;

		try {
			data = text ? JSON.parse(text) : {};
		} catch {
			console.error("INVALID USERS RESPONSE:", text);

			data = {
				message: text || "Invalid response from users server.",
			};
		}

		console.log("Backend Users Status:", response.status);
		console.log("Backend Users Response:", data);

		/* =========================================================
           RETURN RESPONSE TO FRONTEND
        ========================================================= */

		const nextResponse = NextResponse.json(data, {
			status: response.status,
		});

		const setCookie = response.headers.get("set-cookie");

		if (setCookie) {
			nextResponse.headers.set("set-cookie", setCookie);
		}

		return nextResponse;
	} catch (error) {
		console.error("Admin users proxy error:", error);

		return NextResponse.json(
			{
				status: 500,
				message: "Unable to connect to users server.",
			},
			{
				status: 500,
			},
		);
	}
}
