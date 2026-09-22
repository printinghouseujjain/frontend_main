import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

/* ─────────────────────────────────────────
   PARSE BACKEND RESPONSE
───────────────────────────────────────── */

function parseBackendResponse(text: string): unknown {
	if (!text) {
		return {};
	}

	try {
		return JSON.parse(text);
	} catch {
		return {
			message: text,
		};
	}
}

/* ─────────────────────────────────────────
   GET LOGICAL STATUS
───────────────────────────────────────── */

function getLogicalStatus(data: unknown, fallbackStatus: number): number {
	if (
		data &&
		typeof data === "object" &&
		"status" in data &&
		typeof (data as { status?: unknown }).status === "number"
	) {
		const status = (data as { status: number }).status;

		if (status >= 100 && status <= 599) {
			return status;
		}
	}

	if (
		data &&
		typeof data === "object" &&
		"success" in data &&
		(data as { success?: unknown }).success === false
	) {
		return fallbackStatus >= 400 ? fallbackStatus : 400;
	}

	return fallbackStatus;
}

/* ─────────────────────────────────────────
   GET CLIENT IP
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
   FORWARD SET-COOKIE HEADERS
───────────────────────────────────────── */

function forwardSetCookies(
	sourceResponse: Response,
	nextResponse: NextResponse,
): void {
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
   POST CLEAR CART

   No body is sent to the backend — the cart
   to clear is identified purely from the
   forwarded cookies.

   NOTE: unlike the admin routes, this forwards
   the ENTIRE incoming Cookie header as-is rather
   than a filtered whitelist (auth_session /
   admin_auth only), since clearing a cart needs
   whatever cookie your /api/cart and
   /api/cart/update_cart routes rely on to
   identify the customer's cart (e.g. a cart_id
   or session cookie), and that isn't something
   this file has visibility into. If your other
   cart routes use a specific whitelist instead
   of forwarding everything, mirror that same
   whitelist here.
───────────────────────────────────────── */

export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		const incomingCookie = request.headers.get("cookie");
		const clientIp = getClientIp(request);

		console.log("CLEAR CART REQUEST:", {
			clientIp,
			hasIncomingCookie: Boolean(incomingCookie),
		});

		const response = await fetch(`${API_URL}/api/clear_cart`, {
			method: "POST",

			headers: {
				Accept: "application/json",

				...(incomingCookie
					? {
							Cookie: incomingCookie,
						}
					: {}),

				...(clientIp
					? {
							"X-Forwarded-For": clientIp,
							"X-Real-IP": clientIp,
						}
					: {}),
			},

			cache: "no-store",
		});

		const responseText = await response.text();

		const data = parseBackendResponse(responseText);

		const status = getLogicalStatus(data, response.status);

		const nextResponse = NextResponse.json(data, {
			status,
		});

		forwardSetCookies(response, nextResponse);

		console.log("CLEAR CART RESPONSE:", {
			httpStatus: response.status,
			logicalStatus: status,
		});

		return nextResponse;
	} catch (error) {
		console.error("Clear cart proxy error:", error);

		return NextResponse.json(
			{
				status: 500,
				message: "Unable to clear cart.",
			},
			{
				status: 500,
			},
		);
	}
}
