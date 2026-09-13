import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

/*
 * -------------------------------------------------------
 * GET CLIENT IP
 * -------------------------------------------------------
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

/*
 * -------------------------------------------------------
 * BUILD BACKEND HEADERS
 * -------------------------------------------------------
 */
function getBackendHeaders(
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

		/*
		 * Forward the original client IP because the backend
		 * validates admin_auth against the client's IP.
		 */
		...(clientIp
			? {
					"X-Forwarded-For": clientIp,
					"X-Real-IP": clientIp,
				}
			: {}),
	};
}

/*
 * -------------------------------------------------------
 * GET SET-COOKIE HEADERS
 * -------------------------------------------------------
 */
function getSetCookies(response: Response): string[] {
	if (typeof response.headers.getSetCookie === "function") {
		return response.headers.getSetCookie();
	}

	const setCookie = response.headers.get("set-cookie");

	return setCookie ? [setCookie] : [];
}

/*
 * -------------------------------------------------------
 * FORWARD SET-COOKIE HEADERS
 * -------------------------------------------------------
 */
function forwardSetCookies(response: NextResponse, setCookies: string[]) {
	for (const cookie of setCookies) {
		response.headers.append("Set-Cookie", cookie);
	}
}

/*
 * =======================================================
 * GET — LIST ALL USERS
 * =======================================================
 *
 * Frontend:
 *
 * GET /api/admin/users
 *
 * Backend:
 *
 * POST /api/users
 * command_type=admin
 */
export async function GET(request: NextRequest) {
	try {
		const cookie = request.headers.get("cookie");
		const clientIp = getClientIp(request);

		/*
		 * ------------------------------------------------
		 * BUILD BACKEND REQUEST
		 * ------------------------------------------------
		 */
		const backendFormData = new FormData();

		backendFormData.append("command_type", "admin");

		console.log("=================================");
		console.log("ADMIN USERS PROXY");
		console.log("METHOD: GET");
		console.log("Has Cookie:", Boolean(cookie));
		console.log("Client IP:", clientIp || "UNKNOWN");
		console.log("=================================");

		const response = await fetch(`${API_URL}/api/users`, {
			method: "POST",

			headers: getBackendHeaders(request, cookie),

			body: backendFormData,

			cache: "no-store",
		});

		/*
		 * ------------------------------------------------
		 * READ BACKEND RESPONSE
		 * ------------------------------------------------
		 */
		const text = await response.text();

		let data: unknown;

		try {
			data = text ? JSON.parse(text) : {};
		} catch {
			console.error("INVALID USERS RESPONSE:", text);

			data = {
				message: text || "Invalid response from users server.",
			};
		}

		console.log("Backend Users Status:", response.status);
		console.log("Backend Users Response:", data);

		/*
		 * ------------------------------------------------
		 * RETURN RESPONSE
		 * ------------------------------------------------
		 */
		const nextResponse = NextResponse.json(data, {
			status: response.status,
		});

		/*
		 * Forward ALL backend Set-Cookie headers.
		 */
		const setCookies = getSetCookies(response);

		if (setCookies.length > 0) {
			console.log("Backend Set-Cookie:", setCookies);

			forwardSetCookies(nextResponse, setCookies);
		}

		return nextResponse;
	} catch (error) {
		console.error("Admin users proxy error:", error);

		return NextResponse.json(
			{
				status: 500,
				message: "Unable to connect to users server.",
			},
			{
				status: 500,
			},
		);
	}
}

/*
 * =======================================================
 * POST — USER DETAIL / ADMIN USER ACTION
 * =======================================================
 *
 * Frontend:
 *
 * POST /api/admin/users
 * user_id=...
 *
 * Backend:
 *
 * POST /api/users
 * command_type=admin
 * user_id=...
 */
export async function POST(request: NextRequest) {
	try {
		const cookie = request.headers.get("cookie");
		const clientIp = getClientIp(request);

		/*
		 * ------------------------------------------------
		 * READ FRONTEND FORM DATA
		 * ------------------------------------------------
		 */
		const input = await request.formData();

		const userId = input.get("user_id");

		if (!userId || typeof userId !== "string") {
			return NextResponse.json(
				{
					message: "user_id is required.",
				},
				{
					status: 400,
				},
			);
		}

		/*
		 * ------------------------------------------------
		 * BUILD BACKEND FORM DATA
		 * ------------------------------------------------
		 */
		const backendFormData = new FormData();

		backendFormData.append("command_type", "admin");
		backendFormData.append("user_id", userId);

		console.log("=================================");
		console.log("ADMIN USER DETAIL PROXY");
		console.log("METHOD: POST");
		console.log("USER ID:", userId);
		console.log("Has Cookie:", Boolean(cookie));
		console.log("Client IP:", clientIp || "UNKNOWN");
		console.log("=================================");

		/*
		 * ------------------------------------------------
		 * CALL BACKEND
		 * ------------------------------------------------
		 */
		const response = await fetch(`${API_URL}/api/users`, {
			method: "POST",

			headers: getBackendHeaders(request, cookie),

			body: backendFormData,

			cache: "no-store",
		});

		/*
		 * ------------------------------------------------
		 * READ BACKEND RESPONSE
		 * ------------------------------------------------
		 */
		const text = await response.text();

		let data: unknown;

		try {
			data = text ? JSON.parse(text) : {};
		} catch {
			console.error("INVALID USER DETAIL RESPONSE:", text);

			data = {
				message: text || "Invalid users response.",
			};
		}

		console.log("Backend User Detail Status:", response.status);
		console.log("Backend User Detail Response:", data);

		/*
		 * ------------------------------------------------
		 * RETURN RESPONSE
		 * ------------------------------------------------
		 */
		const nextResponse = NextResponse.json(data, {
			status: response.status,
		});

		/*
		 * Forward ALL backend Set-Cookie headers.
		 */
		const setCookies = getSetCookies(response);

		if (setCookies.length > 0) {
			console.log("Backend User Detail Set-Cookie:", setCookies);

			forwardSetCookies(nextResponse, setCookies);
		}

		return nextResponse;
	} catch (error) {
		console.error("Admin user detail proxy error:", error);

		return NextResponse.json(
			{
				message: "Unable to load customer.",
			},
			{
				status: 500,
			},
		);
	}
}
