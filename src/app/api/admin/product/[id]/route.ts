import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

type RouteContext = {
	params: Promise<{ id: string }>;
};

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
   GET AUTH COOKIES ONLY
   Required format:
   auth_session=value;admin_auth=value

   Fixed order matters to the backend: auth_session
   must always come before admin_auth, regardless of
   the order the browser sent them in.
───────────────────────────────────────── */

function getAuthCookieHeader(cookieHeader: string | null): string {
	if (!cookieHeader) return "";

	const orderedCookieNames = ["auth_session", "admin_auth"] as const;

	const cookieMap = new Map<string, string>();

	cookieHeader
		.split(";")
		.map((part) => part.trim())
		.filter(Boolean)
		.forEach((part) => {
			const separatorIndex = part.indexOf("=");

			if (separatorIndex === -1) return;

			const name = part.slice(0, separatorIndex).trim();
			const value = part.slice(separatorIndex + 1).trim();

			if (!value) return;

			cookieMap.set(name, value);
		});

	return orderedCookieNames
		.filter((name) => cookieMap.has(name))
		.map((name) => `${name}=${cookieMap.get(name)}`)
		.join(";");
}

/* ─────────────────────────────────────────
   GET FORWARD HEADERS
───────────────────────────────────────── */

function getForwardHeaders(request: NextRequest): HeadersInit {
	const incomingCookie = request.headers.get("cookie");
	const authCookieHeader = getAuthCookieHeader(incomingCookie);

	const clientIp = getClientIp(request);

	return {
		Accept: "application/json",

		/*
		 * Only these cookies are sent:
		 * auth_session=value;admin_auth=value
		 */
		...(authCookieHeader
			? {
					Cookie: authCookieHeader,
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
   POST PRODUCT REQUEST
───────────────────────────────────────── */

export async function POST(
	request: NextRequest,
	context: RouteContext,
): Promise<NextResponse> {
	try {
		const { id } = await context.params;

		const productId = decodeURIComponent(id);

		const incomingCookie = request.headers.get("cookie");
		const forwardedCookie = getAuthCookieHeader(incomingCookie);

		const clientIp = getClientIp(request);

		if (!productId) {
			return NextResponse.json(
				{
					status: 400,
					message: "Product ID is required.",
				},
				{
					status: 400,
				},
			);
		}

		console.log("ADMIN PRODUCT REQUEST:", {
			productId,
			clientIp,
			hasIncomingCookie: Boolean(incomingCookie),
			hasAuthSession: forwardedCookie.includes("auth_session="),
			hasAdminAuth: forwardedCookie.includes("admin_auth="),

			/*
			 * This prints only the allowed cookies.
			 * cart_id will never appear here.
			 */
			forwardedCookie,
		});

		/* ─────────────────────────────────────────
		   CREATE BACKEND FORM DATA
		───────────────────────────────────────── */

		const backendFormData = new FormData();

		backendFormData.append("command_type", "admin");

		backendFormData.append("product_id", productId);

		/* ─────────────────────────────────────────
		   SEND REQUEST TO BACKEND
		───────────────────────────────────────── */

		const response = await fetch(`${API_URL}/api/products`, {
			method: "POST",

			/*
			 * getForwardHeaders() sends:
			 *
			 * auth_session=value;admin_auth=value
			 *
			 * without cart_id and without a space
			 * after the semicolon.
			 */
			headers: getForwardHeaders(request),

			body: backendFormData,
			cache: "no-store",
		});

		const responseText = await response.text();

		const data = parseBackendResponse(responseText);

		const status = getLogicalStatus(data, response.status);

		const nextResponse = NextResponse.json(data, {
			status,
		});

		forwardSetCookies(response, nextResponse);

		console.log("ADMIN PRODUCT RESPONSE:", {
			productId,
			httpStatus: response.status,
			logicalStatus: status,
		});

		return nextResponse;
	} catch (error) {
		console.error("Admin product proxy error:", error);

		return NextResponse.json(
			{
				status: 500,
				message: "Unable to load product.",
			},
			{
				status: 500,
			},
		);
	}
}
