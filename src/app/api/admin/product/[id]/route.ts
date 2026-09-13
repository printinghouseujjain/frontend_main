import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

type RouteContext = {
	params: Promise<{ id: string }>;
};

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
   FORWARD BACKEND HEADERS
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
   POST
───────────────────────────────────────── */

export async function POST(request: NextRequest, context: RouteContext) {
	try {
		const { id } = await context.params;

		const productId = decodeURIComponent(id);
		const cookie = request.headers.get("cookie");
		const clientIp = getClientIp(request);

		if (!productId) {
			return NextResponse.json(
				{
					status: 400,
					message: "Product ID is required.",
				},
				{ status: 400 },
			);
		}

		console.log("ADMIN PRODUCT REQUEST:", {
			productId,
			clientIp,
			hasCookie: !!cookie,
		});

		const backendFormData = new FormData();

		backendFormData.append("command_type", "admin");
		backendFormData.append("product_id", productId);

		const response = await fetch(`${API_URL}/api/products`, {
			method: "POST",
			headers: getForwardHeaders(request, cookie),
			body: backendFormData,
			cache: "no-store",
		});

		const text = await response.text();
		const data = parseBackendResponse(text);

		const status = getLogicalStatus(data, response.status);

		const nextResponse = NextResponse.json(data, {
			status,
		});

		forwardSetCookies(response, nextResponse);

		return nextResponse;
	} catch (error) {
		console.error("Admin product proxy error:", error);

		return NextResponse.json(
			{
				status: 500,
				message: "Unable to load product.",
			},
			{ status: 500 },
		);
	}
}
