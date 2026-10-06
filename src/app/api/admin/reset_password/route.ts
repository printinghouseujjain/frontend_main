import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

/*
 * ASSUMPTION: the backend "forget password" endpoint path.
 * It wasn't specified, so change this one constant if the real
 * path differs (e.g. "/api/forgot_password").
 */
const BACKEND_PATH = "/api/forgot";

/*
 * Fields the proxy controls itself and never takes from the client.
 */
const SERVER_CONTROLLED_FIELDS = new Set(["command_type"]);

export async function POST(request: NextRequest) {
	try {
		const cookie = request.headers.get("cookie");

		const input = await request.formData();

		const email = input.get("email");
		const newPassword = input.get("new_password");

		if (!email || typeof email !== "string") {
			return NextResponse.json(
				{ message: "email is required." },
				{ status: 400 },
			);
		}

		if (!newPassword || typeof newPassword !== "string") {
			return NextResponse.json(
				{ message: "new_password is required." },
				{ status: 400 },
			);
		}

		const backendFormData = new FormData();

		backendFormData.append("command_type", "admin");

		for (const [key, value] of input.entries()) {
			if (SERVER_CONTROLLED_FIELDS.has(key)) continue;

			if (typeof value === "string") {
				/*
				 * Never trim passwords — spaces may be intentional.
				 */
				backendFormData.append(
					key,
					key === "new_password" ? value : value.trim(),
				);
			}
		}

		/*
		 * Log field NAMES only — never values.
		 */
		console.log(
			"ADMIN RESET PASSWORD - forwarding fields:",
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
				message: text || "Invalid response from password reset server.",
			};
		}

		console.log("ADMIN RESET PASSWORD - backend status:", response.status);

		return NextResponse.json(data, { status: response.status });
	} catch (error) {
		console.error("ADMIN RESET PASSWORD PROXY ERROR:", error);

		return NextResponse.json(
			{
				message: "Unable to reset password.",
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
