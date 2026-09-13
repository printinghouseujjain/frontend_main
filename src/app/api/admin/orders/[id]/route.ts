import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

type RouteContext = {
	params: Promise<{ id: string }>;
};

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
   FORWARD ORDER REQUEST
───────────────────────────────────────── */

async function forwardOrderRequest(
	request: NextRequest,
	orderId: string,
	method: "GET" | "POST",
	status?: string,
) {
	const cookie = request.headers.get("cookie");
	const clientIp = getClientIp(request);

	const backendFormData = new FormData();

	backendFormData.append("command_type", "admin");
	backendFormData.append("order_id", orderId);

	if (status) {
		backendFormData.append("order_status", status);
		backendFormData.append("status", status);
	}

	console.log("=================================");
	console.log("ADMIN ORDER REQUEST");
	console.log("Order ID:", orderId);
	console.log("Method:", method);
	console.log("Status:", status || "N/A");
	console.log("Has Cookie:", Boolean(cookie));
	console.log("Client IP:", clientIp || "unknown");
	console.log("=================================");

	const response = await fetch(`${API_URL}/api/orders`, {
		method,
		headers: getForwardHeaders(request, cookie),
		...(method === "POST"
			? {
					body: backendFormData,
				}
			: {}),
		cache: "no-store",
	});

	const text = await response.text();

	let data: unknown;

	try {
		data = text ? JSON.parse(text) : {};
	} catch {
		console.error("INVALID ADMIN ORDER RESPONSE:", text);

		data = {
			message: text || "Invalid response from orders server.",
		};
	}

	console.log("Backend Admin Order Status:", response.status);

	console.log("Backend Admin Order Response:", data);

	const nextResponse = NextResponse.json(data, {
		status: response.status,
	});

	forwardSetCookies(response, nextResponse);

	return nextResponse;
}

/* ─────────────────────────────────────────
   GET — ORDER DETAILS
───────────────────────────────────────── */

export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const { id } = await context.params;

		const orderId = decodeURIComponent(id);

		return await forwardOrderRequest(request, orderId, "POST");
	} catch (error) {
		console.error("Admin order detail proxy error:", error);

		return NextResponse.json(
			{
				message: "Unable to connect to orders server.",
			},
			{
				status: 500,
			},
		);
	}
}

/* ─────────────────────────────────────────
   PATCH — UPDATE ORDER STATUS
───────────────────────────────────────── */

export async function PATCH(request: NextRequest, context: RouteContext) {
	try {
		const { id } = await context.params;

		const body = (await request.json().catch(() => ({}))) as {
			status?: string;
		};

		const status = body.status?.trim();

		if (!status) {
			return NextResponse.json(
				{
					message: "status is required.",
				},
				{
					status: 400,
				},
			);
		}

		const orderId = decodeURIComponent(id);

		return await forwardOrderRequest(request, orderId, "POST", status);
	} catch (error) {
		console.error("Admin order status proxy error:", error);

		return NextResponse.json(
			{
				message: "Unable to update order status.",
			},
			{
				status: 500,
			},
		);
	}
}
