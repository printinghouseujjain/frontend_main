import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

/*
 * ADMIN — RESET USER PASSWORD (NO OTP)
 *
 * Backend expects:
 *
 * POST /api/forget
 * email
 * new_password
 */

/* ─────────────────────────────────────────
   CLIENT IP
───────────────────────────────────────── */

function getClientIp(request: NextRequest): string {
	const forwardedFor = request.headers.get("x-forwarded-for");

	if (forwardedFor) {
		return forwardedFor.split(",")[0].trim();
	}

	const realIp = request.headers.get("x-real-ip");

	if (realIp) {
		return realIp.trim();
	}

	return "";
}

/* ─────────────────────────────────────────
   FORWARD HEADERS
───────────────────────────────────────── */

function getForwardHeaders(
	request: NextRequest,
	cookie: string | null,
): HeadersInit {
	const clientIp = getClientIp(request);

	return {
		Accept: "application/json",

		...(cookie
			? {
					Cookie: cookie,
				}
			: {}),

		...(clientIp
			? {
					"X-Forwarded-For": clientIp,
					"X-Real-IP": clientIp,
				}
			: {}),
	};
}

/* ─────────────────────────────────────────
   FORWARD ALL SET-COOKIE HEADERS
───────────────────────────────────────── */

function forwardSetCookies(
	sourceResponse: Response,
	nextResponse: NextResponse,
) {
	const headers = sourceResponse.headers as Headers & {
		getSetCookie?: () => string[];
	};

	if (typeof headers.getSetCookie === "function") {
		const cookies = headers.getSetCookie();

		for (const cookie of cookies) {
			nextResponse.headers.append("set-cookie", cookie);
		}

		return;
	}

	const setCookie = sourceResponse.headers.get("set-cookie");

	if (setCookie) {
		nextResponse.headers.set("set-cookie", setCookie);
	}
}

/* ─────────────────────────────────────────
   POST — RESET USER PASSWORD
───────────────────────────────────────── */

export async function POST(request: NextRequest) {
	try {
		const cookie = request.headers.get("cookie");
		const clientIp = getClientIp(request);

		/* =========================================================
		   READ FORMDATA FROM FRONTEND
		========================================================= */

		const formData = await request.formData();

		const email = formData.get("email");
		const newPassword = formData.get("new_password");

		if (
			!email ||
			typeof email !== "string" ||
			!newPassword ||
			typeof newPassword !== "string"
		) {
			return NextResponse.json(
				{
					status: 400,
					message: "email and new_password are required.",
				},
				{
					status: 400,
				},
			);
		}

		console.log("=================================");
		console.log("ADMIN FORGET PASSWORD PROXY");
		console.log("Email:", email);
		console.log("Has Cookie:", Boolean(cookie));
		console.log("Client IP:", clientIp || "unknown");
		console.log("=================================");

		/* =========================================================
		   SEND FORMDATA TO BACKEND
		========================================================= */

		const backendFormData = new FormData();

		backendFormData.append("command_type", "admin");

		backendFormData.append("email", email);

		backendFormData.append("new_password", newPassword);

		const response = await fetch(`${API_URL}/api/forget`, {
			method: "POST",
			headers: getForwardHeaders(request, cookie),
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
			console.error("INVALID FORGET RESPONSE:", text);

			data = {
				message: text || "Invalid response from password server.",
			};
		}

		console.log("Backend Forget Status:", response.status);

		console.log("Backend Forget Response:", data);

		/* =========================================================
		   RETURN RESPONSE TO FRONTEND
		========================================================= */

		const nextResponse = NextResponse.json(data, {
			status: response.status,
		});

		/* =========================================================
		   FORWARD BACKEND SET-COOKIE HEADERS
		========================================================= */

		forwardSetCookies(response, nextResponse);

		return nextResponse;
	} catch (error) {
		console.error("Admin forget-password proxy error:", error);

		return NextResponse.json(
			{
				status: 500,
				message: "Unable to connect to password server.",
			},
			{
				status: 500,
			},
		);
	}
}
