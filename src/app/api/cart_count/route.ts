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
   GET CART COUNT

   No body is sent to the backend — the cart
   to count is identified purely from the
   forwarded cookies, same as /api/clear_cart.

   NOTE: forwards the ENTIRE incoming Cookie
   header as-is (not a filtered whitelist),
   matching the clear_cart proxy, since this
   route needs whatever cookie your /api/cart
   family of routes relies on to identify the
   customer's cart.
───────────────────────────────────────── */

export async function GET(request: NextRequest): Promise<NextResponse> {
	try {
		const incomingCookie = request.headers.get("cookie");
		const clientIp = getClientIp(request);

		console.log("CART COUNT REQUEST:", {
			clientIp,
			hasIncomingCookie: Boolean(incomingCookie),
		});

		const response = await fetch(`${API_URL}/api/cart_count`, {
			method: "GET",

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

		console.log("CART COUNT RESPONSE:", {
			httpStatus: response.status,
			logicalStatus: status,
			data,
		});

		return NextResponse.json(data, {
			status,
		});
	} catch (error) {
		console.error("Cart count proxy error:", error);

		return NextResponse.json(
			{
				status: 500,
				message: "Unable to fetch cart count.",
			},
			{
				status: 500,
			},
		);
	}
}
