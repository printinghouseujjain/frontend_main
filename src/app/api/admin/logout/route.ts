import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

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
   POST — ADMIN LOGOUT
───────────────────────────────────────── */

export async function POST(request: NextRequest) {
	try {
		/* =====================================================
		   CREATE BACKEND FORM DATA
		===================================================== */

		const backendFormData = new FormData();

		backendFormData.append("command_type", "admin");

		/* =====================================================
		   FORWARD AUTH COOKIES + CLIENT IP
		===================================================== */

		const cookieHeader = request.headers.get("cookie");
		const clientIp = getClientIp(request);

		console.log("=================================");
		console.log("ADMIN LOGOUT PROXY");
		console.log("Has Cookie:", Boolean(cookieHeader));
		console.log("Client IP:", clientIp || "unknown");
		console.log("=================================");

		const headers: HeadersInit = {
			Accept: "application/json",

			...(cookieHeader
				? {
						Cookie: cookieHeader,
					}
				: {}),

			...(clientIp
				? {
						"X-Forwarded-For": clientIp,
						"X-Real-IP": clientIp,
					}
				: {}),
		};

		/* =====================================================
		   SEND LOGOUT REQUEST TO BACKEND
		===================================================== */

		const backendResponse = await fetch(`${API_URL}/api/logout`, {
			method: "POST",
			headers,
			body: backendFormData,
			cache: "no-store",
		});

		/* =====================================================
		   READ BACKEND RESPONSE
		===================================================== */

		const contentType = backendResponse.headers.get("content-type") || "";

		let responseData: unknown;

		if (contentType.includes("application/json")) {
			responseData = await backendResponse.json().catch(() => ({}));
		} else {
			responseData = await backendResponse.text().catch(() => "");
		}

		console.log("Backend Admin Logout Status:", backendResponse.status);

		console.log("Backend Admin Logout Response:", responseData);

		/* =====================================================
		   CREATE RESPONSE
		===================================================== */

		const response = NextResponse.json(
			{
				success: backendResponse.ok,
				message: backendResponse.ok
					? "Admin logged out successfully."
					: "Logout failed.",
				backend: responseData,
			},
			{
				status: backendResponse.ok ? 200 : backendResponse.status,
			},
		);

		/* =====================================================
		   FORWARD BACKEND SET-COOKIE HEADERS
		===================================================== */

		forwardSetCookies(backendResponse, response);

		/* =====================================================
		   RETURN RESPONSE
		===================================================== */

		return response;
	} catch (error) {
		console.error("Admin logout proxy error:", error);

		return NextResponse.json(
			{
				success: false,
				message: "Unable to logout. Please try again.",
			},
			{
				status: 500,
			},
		);
	}
}
