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
 * NORMALIZE RESELLER
 * -------------------------------------------------------
 */
function normalizeReseller(value: FormDataEntryValue | null): "yes" | "no" {
	if (value === null) {
		return "no";
	}

	const normalized = String(value).trim().toLowerCase();

	const truthy = ["yes", "true", "on", "1"];

	return truthy.includes(normalized) ? "yes" : "no";
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
 * ADMIN — CREATE ACCOUNT
 * =======================================================
 *
 * Backend:
 *
 * POST /api/sinup
 *
 * command_type=admin
 * name
 * email
 * phone
 * password
 * reseller
 */
export async function POST(request: NextRequest) {
	try {
		const cookie = request.headers.get("cookie");
		const clientIp = getClientIp(request);

		/* =====================================================
		   READ FORMDATA FROM FRONTEND
		===================================================== */

		const formData = await request.formData();

		const name = formData.get("name");
		const email = formData.get("email");
		const phone = formData.get("phone");
		const password = formData.get("password");
		const reseller = normalizeReseller(formData.get("reseller"));

		if (
			!name ||
			typeof name !== "string" ||
			!email ||
			typeof email !== "string" ||
			!phone ||
			typeof phone !== "string" ||
			!password ||
			typeof password !== "string"
		) {
			return NextResponse.json(
				{
					status: 400,
					message: "name, email, phone, and password are required.",
				},
				{
					status: 400,
				},
			);
		}

		console.log("=================================");
		console.log("ADMIN SIGNUP PROXY");
		console.log("Name:", name);
		console.log("Email:", email);
		console.log("Phone:", phone);
		console.log("Reseller:", reseller);
		console.log("Has Cookie:", Boolean(cookie));
		console.log("Client IP:", clientIp || "UNKNOWN");
		console.log("=================================");

		/* =====================================================
		   SEND FORMDATA TO BACKEND
		===================================================== */

		const backendFormData = new FormData();

		backendFormData.append("command_type", "admin");
		backendFormData.append("name", name);
		backendFormData.append("email", email);
		backendFormData.append("phone", phone);
		backendFormData.append("password", password);
		backendFormData.append("reseller", reseller);

		const response = await fetch(`${API_URL}/api/sinup`, {
			method: "POST",

			headers: {
				Accept: "application/json",

				/*
				 * Forward existing authentication cookies.
				 */
				...(cookie
					? {
							Cookie: cookie,
						}
					: {}),

				/*
				 * Forward the original browser/client IP.
				 */
				...(clientIp
					? {
							"X-Forwarded-For": clientIp,
							"X-Real-IP": clientIp,
						}
					: {}),
			},

			body: backendFormData,

			cache: "no-store",
		});

		/* =====================================================
		   READ BACKEND RESPONSE
		===================================================== */

		const text = await response.text();

		let data: unknown;

		try {
			data = text ? JSON.parse(text) : {};
		} catch {
			console.error("INVALID SIGNUP RESPONSE:", text);

			data = {
				message: text || "Invalid response from signup server.",
			};
		}

		console.log("Backend Signup Status:", response.status);
		console.log("Backend Signup Response:", data);

		/* =====================================================
		   RETURN RESPONSE TO FRONTEND
		===================================================== */

		const nextResponse = NextResponse.json(data, {
			status: response.status,
		});

		/*
		 * Forward ALL Set-Cookie headers from backend.
		 */
		const setCookies = getSetCookies(response);

		if (setCookies.length > 0) {
			console.log("Backend Signup Set-Cookie:", setCookies);

			forwardSetCookies(nextResponse, setCookies);
		}

		return nextResponse;
	} catch (error) {
		console.error("Admin signup proxy error:", error);

		return NextResponse.json(
			{
				status: 500,
				message: "Unable to connect to signup server.",
			},
			{
				status: 500,
			},
		);
	}
}
