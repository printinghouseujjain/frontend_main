import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

/*
 * ADMIN — LIST ALL ORDERS
 *
 * Uses the existing backend /api/orders endpoint with
 * command_type=admin.
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
   GET — LIST ALL ORDERS
───────────────────────────────────────── */

export async function GET(request: NextRequest) {
	try {
		const cookie = request.headers.get("cookie");
		const clientIp = getClientIp(request);

		const backendFormData = new FormData();

		backendFormData.append("command_type", "admin");

		console.log("=================================");
		console.log("ADMIN ORDERS PROXY");
		console.log("Has Cookie:", Boolean(cookie));
		console.log("Client IP:", clientIp || "unknown");
		console.log("=================================");

		const response = await fetch(`${API_URL}/api/orders`, {
			method: "POST",
			headers: getForwardHeaders(request, cookie),
			body: backendFormData,
			cache: "no-store",
		});

		const text = await response.text();

		let data: unknown;

		try {
			data = text ? JSON.parse(text) : {};
		} catch {
			console.error("INVALID ADMIN ORDERS RESPONSE:", text);

			data = {
				message: text || "Invalid response from orders server.",
			};
		}

		console.log("Backend Admin Orders Status:", response.status);

		console.log("Backend Admin Orders Response:", data);

		const nextResponse = NextResponse.json(data, {
			status: response.status,
		});

		forwardSetCookies(response, nextResponse);

		console.log("Admin Orders Response Cookies Forwarded.");

		return nextResponse;
	} catch (error) {
		console.error("Admin orders proxy error:", error);

		return NextResponse.json(
			{
				status: 500,
				message: "Unable to connect to orders server.",
			},
			{
				status: 500,
			},
		);
	}
}
