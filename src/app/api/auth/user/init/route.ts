import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

export async function GET(request: NextRequest) {
	try {
		const cookie = request.headers.get("cookie");

		const response = await fetch(`${API_URL}/api/init`, {
			method: "GET",
			headers: {
				Accept: "application/json",
				...(cookie ? { Cookie: cookie } : {}),
			},
			cache: "no-store",
		});

		const text = await response.text();

		let data: unknown;

		try {
			data = text ? JSON.parse(text) : {};
		} catch {
			console.error("INVALID INIT RESPONSE:", text);

			data = {
				message:
					text || "Invalid response from init server.",
			};
		}

		console.log("BACKEND INIT RESPONSE:", data);

		const nextResponse = NextResponse.json(data, {
			status: response.status,
		});

		/*
		 * Get Set-Cookie headers returned by the backend.
		 */
		const setCookies =
			typeof response.headers.getSetCookie === "function"
				? response.headers.getSetCookie()
				: [];

		/*
		 * Check whether backend returned:
		 *
		 * user_auth=deleted
		 *
		 * This means the backend has invalidated the
		 * authentication session.
		 */
		const userAuthDeleted = setCookies.some((cookieHeader) => {
			return /(?:^|;\s*)user_auth=deleted(?:;|$)/i.test(
				cookieHeader,
			);
		});

		if (userAuthDeleted) {
			console.log(
				"INIT: user_auth=deleted detected. Clearing browser authentication cookie.",
			);

			/*
			 * Explicitly delete the browser-side user_auth cookie.
			 *
			 * The cookie is HttpOnly, so this must be done
			 * server-side using NextResponse.
			 */
			nextResponse.cookies.set({
				name: "user_auth",
				value: "",
				expires: new Date(0),
				maxAge: 0,
				path: "/",
				httpOnly: true,
				secure: true,
				sameSite: "lax",
			});

			return nextResponse;
		}

		/*
		 * Normal case:
		 * forward backend Set-Cookie headers.
		 */
		if (setCookies.length > 0) {
			for (const cookieHeader of setCookies) {
				nextResponse.headers.append(
					"Set-Cookie",
					cookieHeader,
				);
			}
		} else {
			/*
			 * Fallback for environments where getSetCookie()
			 * is unavailable.
			 */
			const setCookie =
				response.headers.get("set-cookie");

			if (setCookie) {
				nextResponse.headers.set(
					"Set-Cookie",
					setCookie,
				);
			}
		}

		return nextResponse;
	} catch (error) {
		console.error("Init proxy error:", error);

		return NextResponse.json(
			{
				message: "Unable to connect to init server.",
			},
			{
				status: 500,
			},
		);
	}
}