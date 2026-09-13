import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

/**
 * Get the original client IP.
 *
 * When the request comes through Next.js/Vercel, the backend would
 * otherwise see the server/proxy IP instead of the user's IP.
 */
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

export async function POST(request: NextRequest) {
	try {
		const body = await request.json().catch(() => null);

		const email = body?.email;
		const password = body?.password;

		if (typeof email !== "string" || typeof password !== "string") {
			return NextResponse.json(
				{
					message: "Missing required login fields.",
				},
				{
					status: 400,
				},
			);
		}

		// Get the original browser/client IP.
		const clientIp = getClientIp(request);

		// Backend expects multipart/form-data.
		const backendFormData = new FormData();

		backendFormData.append("email", email.trim().toLowerCase());
		backendFormData.append("password", password);

		/*
		 * Forward the login request to the backend.
		 *
		 * IMPORTANT:
		 * Do not manually set Content-Type here.
		 * fetch() will generate the correct multipart/form-data
		 * boundary automatically.
		 */
		const response = await fetch(`${API_URL}/api/login`, {
			method: "POST",
			body: backendFormData,
			headers: {
				Accept: "application/json",

				/*
				 * The backend admin authentication checks the client IP.
				 *
				 * X-Forwarded-For is set to the original client IP.
				 * X-Real-IP is also provided for backends that use it.
				 */
				...(clientIp
					? {
							"X-Forwarded-For": clientIp,
							"X-Real-IP": clientIp,
						}
					: {}),
			},
			cache: "no-store",
		});

		const text = await response.text();

		let data: unknown;

		try {
			data = JSON.parse(text);
		} catch {
			data = {
				message: text || "Invalid response from login server.",
			};
		}

		const nextResponse = NextResponse.json(data, {
			status: response.status,
		});

		/*
		 * Forward ALL Set-Cookie headers from the backend.
		 *
		 * This is important because the backend may return:
		 *
		 * - admin_auth
		 * - user_auth
		 * - auth_session
		 * - other authentication/session cookies
		 */
		const setCookies =
			typeof response.headers.getSetCookie === "function"
				? response.headers.getSetCookie()
				: [];

		if (setCookies.length > 0) {
			for (const cookie of setCookies) {
				nextResponse.headers.append("Set-Cookie", cookie);
			}
		} else {
			/*
			 * Fallback for environments where getSetCookie()
			 * isn't available.
			 */
			const setCookie = response.headers.get("set-cookie");

			if (setCookie) {
				nextResponse.headers.set("Set-Cookie", setCookie);
			}
		}

		return nextResponse;
	} catch (error) {
		console.error("Login proxy error:", error);

		return NextResponse.json(
			{
				message: "Unable to connect to login server.",
			},
			{
				status: 500,
			},
		);
	}
}
