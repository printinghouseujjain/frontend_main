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
 * GET USER / ADMIN DATA
 * -------------------------------------------------------
 */
export async function GET(request: NextRequest) {
	try {
		const cookie = request.headers.get("cookie");
		const clientIp = getClientIp(request);

		console.log("========================================");
		console.log("USER API PROXY");
		console.log("HAS COOKIE:", !!cookie);
		console.log("CLIENT IP:", clientIp || "UNKNOWN");

		const response = await fetch(`${API_URL}/api/user`, {
			method: "GET",
			headers: {
				Accept: "application/json",

				/*
				 * Forward browser authentication cookies.
				 */
				...(cookie ? { Cookie: cookie } : {}),

				/*
				 * Forward the original client IP.
				 *
				 * This is important because the backend
				 * validates admin_auth against client_ip.
				 */
				...(clientIp
					? {
							"X-Forwarded-For": clientIp,
							"X-Real-IP": clientIp,
						}
					: {}),
			},
			cache: "no-store",
		});

		console.log("BACKEND USER STATUS:", response.status);

		/*
		 * ------------------------------------------------
		 * READ RESPONSE
		 * ------------------------------------------------
		 */
		const text = await response.text();

		let data: unknown;

		try {
			data = text ? JSON.parse(text) : {};
		} catch {
			console.error("INVALID USER RESPONSE:", text);

			data = {
				message: text || "Invalid response from user server.",
			};
		}

		console.log("BACKEND USER RESPONSE:", data);

		/*
		 * ------------------------------------------------
		 * FORWARD RESPONSE
		 * ------------------------------------------------
		 */
		const nextResponse = NextResponse.json(data, {
			status: response.status,
		});

		/*
		 * ------------------------------------------------
		 * FORWARD ALL SET-COOKIE HEADERS
		 * ------------------------------------------------
		 */
		const setCookies =
			typeof response.headers.getSetCookie === "function"
				? response.headers.getSetCookie()
				: [];

		if (setCookies.length > 0) {
			for (const cookieHeader of setCookies) {
				console.log("FORWARDING SET-COOKIE:", cookieHeader);

				nextResponse.headers.append(
					"Set-Cookie",
					cookieHeader,
				);
			}
		} else {
			const setCookie = response.headers.get("set-cookie");

			if (setCookie) {
				console.log("FORWARDING SET-COOKIE:", setCookie);

				nextResponse.headers.set(
					"Set-Cookie",
					setCookie,
				);
			}
		}

		console.log("========================================");

		return nextResponse;
	} catch (error) {
		console.error("User proxy error:", error);

		return NextResponse.json(
			{
				message: "Unable to connect to user server.",
			},
			{
				status: 500,
			},
		);
	}
}