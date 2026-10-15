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
   FORWARD HEADERS
───────────────────────────────────────── */

function getForwardHeaders(
	request: NextRequest,
	cookie: string | null,
): HeadersInit {
	const clientIp = getClientIp(request);

	return {
		Accept: "application/json",
		...(cookie ? { Cookie: cookie } : {}),
		...(clientIp
			? {
					"X-Forwarded-For": clientIp,
					"X-Real-IP": clientIp,
				}
			: {}),
	};
}

/* ─────────────────────────────────────────
   PARSE BACKEND RESPONSE
───────────────────────────────────────── */

async function parseBackendResponse(response: Response) {
	const text = await response.text();

	try {
		return text ? JSON.parse(text) : {};
	} catch {
		console.error("INVALID ADMIN ORDERS RESPONSE:", text);

		return {
			message: text || "Invalid response from orders server.",
		};
	}
}

/* ─────────────────────────────────────────
   GET — LIST ALL ORDERS
───────────────────────────────────────── */

export async function GET(request: NextRequest) {
	try {
		const cookie = request.headers.get("cookie");
		const backendFormData = new FormData();

		backendFormData.append("command_type", "admin");

		const mode = request.nextUrl.searchParams.get("mode")?.trim().toLowerCase();

		if (mode === "credit" || mode === "upi") {
			backendFormData.append("mode", mode);
		}

		const response = await fetch(`${API_URL}/api/orders`, {
			method: "POST",
			headers: getForwardHeaders(request, cookie),
			body: backendFormData,
			cache: "no-store",
		});

		const data = await parseBackendResponse(response);

		console.log("Backend Admin Orders GET Status:", response.status);

		return NextResponse.json(data, {
			status: response.status,
		});
	} catch (error) {
		console.error("Admin orders GET proxy error:", error);

		return NextResponse.json(
			{
				status: 500,
				message: "Unable to connect to orders server.",
			},
			{ status: 500 },
		);
	}
}

/* ─────────────────────────────────────────
   POST — FILTER ORDERS
───────────────────────────────────────── */

export async function POST(request: NextRequest) {
	try {
		const cookie = request.headers.get("cookie");
		const incomingFormData = await request.formData();

		// Forward the submitted fields without losing filters.
		const backendFormData = new FormData();

		incomingFormData.forEach((value, key) => {
			if (key !== "command_type") {
				backendFormData.append(key, value);
			}
		});

		// Always enforce the admin command for this proxy.
		backendFormData.set("command_type", "admin");

		const response = await fetch(`${API_URL}/api/orders`, {
			method: "POST",
			headers: getForwardHeaders(request, cookie),
			body: backendFormData,
			cache: "no-store",
		});

		const data = await parseBackendResponse(response);

		console.log("Backend Admin Orders POST Status:", response.status);

		return NextResponse.json(data, {
			status: response.status,
		});
	} catch (error) {
		console.error("Admin orders POST proxy error:", error);

		return NextResponse.json(
			{
				status: 500,
				message: "Unable to connect to orders server.",
			},
			{ status: 500 },
		);
	}
}
