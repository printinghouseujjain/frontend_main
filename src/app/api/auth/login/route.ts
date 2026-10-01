import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

/**
 * Get the original client IP.
 *
 * When the request comes through Next.js/Vercel, the backend would
 * otherwise see the server/proxy IP instead of the user's IP.
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

/**
 * Convert Headers into a plain object.
 *
 * NOTE:
 * Cookies are intentionally NOT redacted here because this
 * route is being used for debugging.
 */
function getHeadersObject(headers: Headers) {
	const result: Record<string, string> = {};

	headers.forEach((value, key) => {
		result[key] = value;
	});

	return result;
}

/**
 * Safely log FormData contents.
 *
 * Passwords are still redacted.
 */
function getFormDataDetails(formData: FormData) {
	const details: Record<string, string | string[]> = {};

	for (const [key, value] of formData.entries()) {
		const lowerKey = key.toLowerCase();

		const safeValue =
			lowerKey.includes("password") ||
			lowerKey.includes("token") ||
			lowerKey.includes("secret")
				? "[REDACTED]"
				: value instanceof File
					? `[File: ${value.name}, ${value.size} bytes, ${value.type}]`
					: String(value);

		if (details[key] === undefined) {
			details[key] = safeValue;
		} else if (Array.isArray(details[key])) {
			details[key].push(safeValue);
		} else {
			details[key] = [
				details[key] as string,
				safeValue,
			];
		}
	}

	return details;
}

export async function POST(request: NextRequest) {
	const requestStartedAt = Date.now();

	try {
		/*
		 * =====================================================================
		 * INCOMING REQUEST
		 * =====================================================================
		 */

		const clientIp = getClientIp(request);

		const incomingCookies =
			request.headers.get("cookie");

		console.log(
			"\n==================================================",
		);
		console.log(
			"LOGIN PROXY — INCOMING REQUEST",
		);
		console.log(
			"==================================================",
		);

		console.log("Method:", request.method);

		console.log(
			"URL:",
			request.url,
		);

		console.log(
			"Next URL:",
			request.nextUrl.toString(),
		);

		console.log(
			"Pathname:",
			request.nextUrl.pathname,
		);

		console.log(
			"Search Params:",
			Object.fromEntries(
				request.nextUrl.searchParams,
			),
		);

		console.log(
			"Client IP:",
			clientIp || "[not available]",
		);

		console.log(
			"User-Agent:",
			request.headers.get("user-agent") ||
				"[none]",
		);

		console.log(
			"Referer:",
			request.headers.get("referer") ||
				"[none]",
		);

		console.log(
			"Origin:",
			request.headers.get("origin") ||
				"[none]",
		);

		console.log(
			"Content-Type:",
			request.headers.get("content-type") ||
				"[none]",
		);

		console.log(
			"Content-Length:",
			request.headers.get("content-length") ||
				"[none]",
		);

		/*
		 * =====================================================================
		 * ALL INCOMING HEADERS
		 * =====================================================================
		 */

		console.log("\nIncoming Headers:");

		console.log(
			getHeadersObject(request.headers),
		);

		/*
		 * =====================================================================
		 * INCOMING COOKIES
		 * =====================================================================
		 *
		 * This prints the ACTUAL browser cookies received by
		 * the Next.js login route.
		 */

		console.log("\nIncoming Cookies:");

		if (incomingCookies) {
			console.log(incomingCookies);
		} else {
			console.log("[none]");
		}

		/*
		 * =====================================================================
		 * PARSE INDIVIDUAL INCOMING COOKIES
		 * =====================================================================
		 */

		if (incomingCookies) {
			console.log(
				"\nIncoming Cookie Details:",
			);

			const cookies = incomingCookies
				.split(";")
				.map((cookie) => cookie.trim())
				.filter(Boolean);

			cookies.forEach((cookie, index) => {
				const separatorIndex =
					cookie.indexOf("=");

				if (separatorIndex === -1) {
					console.log(
						`Cookie ${index + 1}:`,
						cookie,
					);
					return;
				}

				const name = cookie
					.slice(0, separatorIndex)
					.trim();

				const value = cookie
					.slice(separatorIndex + 1)
					.trim();

				console.log(
					`Cookie ${index + 1}:`,
					{
						name,
						value,
					},
				);
			});
		}

		/*
		 * =====================================================================
		 * READ REQUEST BODY
		 * =====================================================================
		 */

		const body = await request
			.json()
			.catch(() => null);

		console.log(
			"\n==================================================",
		);

		console.log(
			"INCOMING JSON BODY",
		);

		console.log(
			"==================================================",
		);

		if (
			body &&
			typeof body === "object"
		) {
			const safeBody = {
				...(body as Record<
					string,
					unknown
				>),
				password:
					typeof (
						body as Record<
							string,
							unknown
						>
					).password === "string"
						? "[REDACTED]"
						: (
								body as Record<
									string,
									unknown
								>
							).password,
			};

			console.log(safeBody);
		} else {
			console.log(body);
		}

		const email = body?.email;
		const password = body?.password;

		/*
		 * =====================================================================
		 * VALIDATION
		 * =====================================================================
		 */

		if (
			typeof email !== "string" ||
			typeof password !== "string"
		) {
			console.log(
				"\nLOGIN VALIDATION FAILED",
			);

			console.log(
				"Email type:",
				typeof email,
			);

			console.log(
				"Password type:",
				typeof password,
			);

			return NextResponse.json(
				{
					message:
						"Missing required login fields.",
				},
				{
					status: 400,
				},
			);
		}

		/*
		 * =====================================================================
		 * CREATE BACKEND FORMDATA
		 * =====================================================================
		 */

		const backendFormData =
			new FormData();

		const normalizedEmail =
			email.trim().toLowerCase();

		backendFormData.append(
			"email",
			normalizedEmail,
		);

		backendFormData.append(
			"password",
			password,
		);

		// console.log(
		// 	"\n==================================================",
		// );

		// console.log(
		// 	"BACKEND LOGIN REQUEST",
		// );

		// console.log(
		// 	"==================================================",
		// );

		// console.log(
		// 	"Backend URL:",
		// 	`${API_URL}/api/login`,
		// );

		// console.log(
		// 	"Backend Method:",
		// 	"POST",
		// );

		// console.log(
		// 	"Backend FormData:",
		// );

		// console.log(
		// 	getFormDataDetails(
		// 		backendFormData,
		// 	),
		// );

		// console.log(
		// 	"Forwarded Client IP:",
		// 	clientIp ||
		// 		"[not available]",
		// );

		// console.log(
		// 	"Forwarding Cookies:",
		// 	incomingCookies
		// 		? "YES"
		// 		: "NO",
		// );

		/*
		 * =====================================================================
		 * BACKEND HEADERS
		 * =====================================================================
		 */

		const backendHeaders: Record<
			string,
			string
		> = {
			Accept: "application/json",
		};

		if (incomingCookies) {
			backendHeaders.Cookie =
				incomingCookies;
		}

		if (clientIp) {
			backendHeaders[
				"X-Forwarded-For"
			] = clientIp;

			backendHeaders[
				"X-Real-IP"
			] = clientIp;
		}

		// console.log(
		// 	"\nBackend Headers:",
		// );

		// console.log(
		// 	getHeadersObject(
		// 		new Headers(
		// 			backendHeaders,
		// 		),
		// 	),
		// );

		/*
		 * =====================================================================
		 * SEND REQUEST TO BACKEND
		 * =====================================================================
		 *
		 * IMPORTANT:
		 *
		 * Do NOT manually set Content-Type.
		 *
		 * fetch() will generate the correct
		 * multipart/form-data boundary.
		 */

		const backendStartedAt =
			Date.now();

		const response = await fetch(
			`${API_URL}/api/login`,
			{
				method: "POST",
				body: backendFormData,
				headers: backendHeaders,
				cache: "no-store",
			},
		);

		const backendResponseTime =
			Date.now() -
			backendStartedAt;

		/*
		 * =====================================================================
		 * BACKEND RESPONSE
		 * =====================================================================
		 */

		const responseText =
			await response.text();

		// console.log(
		// 	"\n==================================================",
		// );

		// console.log(
		// 	"BACKEND LOGIN RESPONSE",
		// );

		// console.log(
		// 	"==================================================",
		// );

		// console.log(
		// 	"Status:",
		// 	response.status,
		// );

		// console.log(
		// 	"Status Text:",
		// 	response.statusText,
		// );

		// console.log(
		// 	"OK:",
		// 	response.ok,
		// );

		// console.log(
		// 	"Response Time:",
		// 	`${backendResponseTime} ms`,
		// );

		/*
		 * =====================================================================
		 * BACKEND RESPONSE HEADERS
		 * =====================================================================
		 */

		// console.log(
		// 	"\nBackend Response Headers:",
		// );

		console.log(
			getHeadersObject(
				response.headers,
			),
		);

		/*
		 * =====================================================================
		 * BACKEND RESPONSE BODY
		 * =====================================================================
		 */

		// console.log(
		// 	"\nBackend Response Body:",
		// );

		let data: unknown;

		try {
			data = JSON.parse(
				responseText,
			);

			// console.log(data);
		} catch {
			data = {
				message:
					responseText ||
					"Invalid response from login server.",
			};

			// console.log(data);
		}

		/*
		 * =====================================================================
		 * BACKEND SET-COOKIE
		 * =====================================================================
		 *
		 * This prints the ACTUAL Set-Cookie headers
		 * returned by the backend.
		 */

		const setCookies =
			typeof response.headers
				.getSetCookie ===
			"function"
				? response.headers.getSetCookie()
				: [];

		// console.log(
		// 	"\n==================================================",
		// );

		// console.log(
		// 	"BACKEND SET-COOKIE",
		// );

		// console.log(
		// 	"==================================================",
		// );

		// console.log(
		// 	"Set-Cookie count:",
		// 	setCookies.length,
		// );

		if (
			setCookies.length > 0
		) {
			setCookies.forEach(
				(cookie, index) => {
					console.log(
						`Set-Cookie ${
							index + 1
						}:`,
					);

					console.log(cookie);
				},
			);
		} else {
			const setCookie =
				response.headers.get(
					"set-cookie",
				);

			if (setCookie) {
				console.log(
					"Fallback Set-Cookie:",
				);

				console.log(
					setCookie,
				);
			} else {
				console.log(
					"[none]",
				);
			}
		}

		/*
		 * =====================================================================
		 * CREATE NEXT.JS RESPONSE
		 * =====================================================================
		 */

		const nextResponse =
			NextResponse.json(data, {
				status: response.status,
			});

		/*
		 * =====================================================================
		 * FORWARD ALL BACKEND SET-COOKIE HEADERS
		 * =====================================================================
		 */

		if (
			setCookies.length > 0
		) {
			for (const cookie of setCookies) {
				nextResponse.headers.append(
					"Set-Cookie",
					cookie,
				);
			}
		} else {
			const setCookie =
				response.headers.get(
					"set-cookie",
				);

			if (setCookie) {
				nextResponse.headers.set(
					"Set-Cookie",
					setCookie,
				);
			}
		}

		/*
		 * =====================================================================
		 * FINAL NEXT.JS RESPONSE
		 * =====================================================================
		 */

		// console.log(
		// 	"\n==================================================",
		// );

		// console.log(
		// 	"LOGIN PROXY — FINAL RESPONSE",
		// );

		// console.log(
		// 	"==================================================",
		// );

		// console.log(
		// 	"Status:",
		// 	response.status,
		// );

		// console.log(
		// 	"Total Request Time:",
		// 	`${Date.now() - requestStartedAt} ms`,
		// );

		// console.log(
		// 	"Response JSON:",
		// 	data,
		// );

		// console.log(
		// 	"Forwarded Set-Cookie:",
		// 	setCookies.length,
		// );

		// console.log(
		// 	"==================================================\n",
		// );

		return nextResponse;
	} catch (error) {
		/*
		 * =====================================================================
		 * ERROR
		 * =====================================================================
		 */

		console.error(
			"\n==================================================",
		);

		console.error(
			"LOGIN PROXY ERROR",
		);

		console.error(
			"==================================================",
		);

		console.error(
			"Error:",
			error,
		);

		console.error(
			"Request Time:",
			`${Date.now() - requestStartedAt} ms`,
		);

		console.error(
			"==================================================\n",
		);

		return NextResponse.json(
			{
				message:
					"Unable to connect to login server.",
			},
			{
				status: 500,
			},
		);
	}
}