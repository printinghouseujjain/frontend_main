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
   BUILD FORWARD HEADERS
───────────────────────────────────────── */

function getForwardHeaders(request: NextRequest): Headers {
	const headers = new Headers();

	const cookie = request.headers.get("cookie");
	const authorization = request.headers.get("authorization");
	const clientIp = getClientIp(request);

	headers.set("Accept", "application/json");

	if (cookie) {
		headers.set("Cookie", cookie);
	}

	if (authorization) {
		headers.set("Authorization", authorization);
	}

	if (clientIp) {
		headers.set("X-Forwarded-For", clientIp);
		headers.set("X-Real-IP", clientIp);
	}

	return headers;
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
		for (const cookie of headers.getSetCookie()) {
			nextResponse.headers.append("set-cookie", cookie);
		}

		return;
	}

	const setCookie = sourceResponse.headers.get("set-cookie");

	if (setCookie) {
		nextResponse.headers.set("set-cookie", setCookie);
	}
}

/*
 * ADMIN — LIST CATEGORIES (GET)
 * ADMIN — CREATE/EDIT/DELETE CATEGORIES (POST)
 *
 * Supports:
 * mode=new
 * mode=edit
 * mode=delete
 */

/* ─────────────────────────────────────────
   GET — LIST CATEGORIES
───────────────────────────────────────── */

export async function GET(request: NextRequest) {
	try {
		const cookie = request.headers.get("cookie");
		const clientIp = getClientIp(request);

		/* =========================================================
		   BUILD BACKEND REQUEST
		========================================================= */

		const backendFormData = new FormData();

		backendFormData.append("command_type", "admin");

		console.log("=================================");
		console.log("ADMIN CATEGORIES PROXY (GET)");
		console.log("Has Cookie:", cookie);
		console.log("Client IP:", clientIp || "unknown");
		console.log("=================================");

		const response = await fetch(`${API_URL}/api/categories`, {
			method: "POST",
			headers: getForwardHeaders(request),
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
			console.error("INVALID CATEGORIES RESPONSE:", text);

			data = {
				message: text || "Invalid response from categories server.",
			};
		}

		console.log("Backend Categories Status:", response.status);
		console.log("Backend Categories Response:", data);

		/* =========================================================
		   RETURN RESPONSE TO FRONTEND
		========================================================= */

		const nextResponse = NextResponse.json(data, {
			status: response.status,
			headers: {
				"Cache-Control": "no-store",
			},
		});

		/* =========================================================
		   FORWARD BACKEND COOKIES
		========================================================= */

		forwardSetCookies(response, nextResponse);

		return nextResponse;
	} catch (error) {
		console.error("Admin categories proxy error:", error);

		return NextResponse.json(
			{
				status: 500,
				message: "Unable to connect to categories server.",
			},
			{
				status: 500,
			},
		);
	}
}

/* ─────────────────────────────────────────
   POST — CREATE / EDIT / DELETE CATEGORIES
───────────────────────────────────────── */

export async function POST(request: NextRequest) {
	try {
		const cookie = request.headers.get("cookie");
		const contentType = request.headers.get("content-type");
		const clientIp = getClientIp(request);

		/* =========================================================
		   READ INCOMING REQUEST
		========================================================= */

		let backendFormData: FormData;

		if (contentType?.includes("application/x-www-form-urlencoded")) {
			const text = await request.text();

			backendFormData = new FormData();

			const params = new URLSearchParams(text);

			for (const [key, value] of params) {
				backendFormData.append(key, value);
			}

			backendFormData.set("command_type", "admin");
		} else if (contentType?.includes("multipart/form-data")) {
			backendFormData = await request.formData();

			backendFormData.set("command_type", "admin");
		} else {
			const body = await request.json();

			backendFormData = new FormData();

			for (const [key, value] of Object.entries(body)) {
				if (value instanceof File) {
					backendFormData.append(key, value);
				} else if (Array.isArray(value)) {
					for (const item of value) {
						backendFormData.append(`${key}[]`, String(item));
					}
				} else if (value !== null && value !== undefined) {
					backendFormData.append(key, String(value));
				}
			}

			backendFormData.set("command_type", "admin");
		}

		const mode = backendFormData.get("mode");

		console.log("=================================");
		console.log("ADMIN CATEGORIES PROXY (POST)");
		console.log("Mode:", mode);
		console.log("Has Cookie:", Boolean(cookie));
		console.log(
			"Has Authorization:",
			Boolean(request.headers.get("authorization")),
		);
		console.log("Client IP:", clientIp || "unknown");
		console.log("=================================");

		/* =========================================================
		   FORWARD TO BACKEND
		========================================================= */

		const response = await fetch(`${API_URL}/api/categories`, {
			method: "POST",
			headers: getForwardHeaders(request),
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
			console.error("INVALID CATEGORIES RESPONSE:", text);

			data = {
				message: text || "Invalid response from categories server.",
			};
		}

		console.log("Backend Categories Status:", response.status);
		console.log("Backend Categories Response:", data);

		/* =========================================================
		   RETURN RESPONSE TO FRONTEND
		========================================================= */

		const nextResponse = NextResponse.json(data, {
			status: response.status,
			headers: {
				"Cache-Control": "no-store",
			},
		});

		/* =========================================================
		   FORWARD BACKEND COOKIES
		========================================================= */

		forwardSetCookies(response, nextResponse);

		return nextResponse;
	} catch (error) {
		console.error("Admin categories proxy error:", error);

		return NextResponse.json(
			{
				status: 500,
				message: "Unable to process categories request.",
			},
			{
				status: 500,
			},
		);
	}
}
