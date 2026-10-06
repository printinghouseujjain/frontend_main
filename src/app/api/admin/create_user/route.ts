import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

/*
 * Same backend endpoint the public signup uses. With
 * command_type=admin it skips the OTP step.
 */
const BACKEND_PATH = "/api/signup";

/*
 * Fields the proxy controls itself and never takes from the client.
 */
const SERVER_CONTROLLED_FIELDS = new Set(["command_type"]);

export async function POST(request: NextRequest) {
	try {
		const cookie = request.headers.get("cookie");

		const input = await request.formData();

		/*
		 * Forward every field the frontend sent
		 * (name, email, phone, password, reseller, credit, ...).
		 */
		const backendFormData = new FormData();

		backendFormData.append("command_type", "admin");

		for (const [key, value] of input.entries()) {
			if (SERVER_CONTROLLED_FIELDS.has(key)) continue;

			if (typeof value === "string") {
				/*
				 * Never trim passwords — spaces may be intentional.
				 */
				backendFormData.append(key, key === "password" ? value : value.trim());
			}
		}

		/*
		 * Log field NAMES only — never values — so passwords
		 * don't end up in server logs.
		 */
		console.log(
			"ADMIN CREATE USER - forwarding fields:",
			Array.from(backendFormData.keys()),
		);

		const response = await fetch(`${API_URL}${BACKEND_PATH}`, {
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
			data = {
				message: text || "Invalid response from signup server.",
			};
		}

		console.log("ADMIN CREATE USER - backend status:", response.status);

		return NextResponse.json(data, { status: response.status });
	} catch (error) {
		console.error("ADMIN CREATE USER PROXY ERROR:", error);

		return NextResponse.json(
			{
				message: "Unable to create account.",
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
