import { NextRequest, NextResponse } from "next/server";

const INIT_API_URL = "https://api.api.printinghouseujjain.in/api/init";

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
 * CLEAR ADMIN COOKIE
 * -------------------------------------------------------
 */
function clearAdminAuthCookie(response: NextResponse) {
	response.cookies.set({
		name: "admin_auth",
		value: "",
		expires: new Date(0),
		maxAge: 0,
		path: "/",
		httpOnly: true,
		secure: true,
		sameSite: "none",
	});
}

/*
 * -------------------------------------------------------
 * REDIRECT TO LOGIN
 * -------------------------------------------------------
 */
function redirectToLogin(request: NextRequest) {
	const response = NextResponse.redirect(new URL("/login", request.url));

	clearAdminAuthCookie(response);

	return response;
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
 * CHECK ADMIN COOKIE DELETION
 * -------------------------------------------------------
 */
function hasDeletedAdminAuth(setCookies: string[]): boolean {
	return setCookies.some((cookieHeader) =>
		/admin_auth=deleted(?:;|,|$)/i.test(cookieHeader),
	);
}

/*
 * -------------------------------------------------------
 * FORWARD BACKEND COOKIES
 * -------------------------------------------------------
 */
function forwardSetCookies(response: NextResponse, setCookies: string[]) {
	for (const cookieHeader of setCookies) {
		response.headers.append("Set-Cookie", cookieHeader);
	}
}

/*
 * =======================================================
 * PROXY
 * =======================================================
 */
export async function proxy(request: NextRequest) {
	const pathname = request.nextUrl.pathname;

	/*
	 * =====================================================
	 * ADMIN AUTHENTICATION
	 * =====================================================
	 */
	if (pathname === "/admin" || pathname.startsWith("/admin/")) {
		try {
			const cookie = request.headers.get("cookie");

			const clientIp = getClientIp(request);

			console.log("========================================");

			console.log("ADMIN PROXY REQUEST:", pathname);

			console.log("ADMIN REQUEST HAS COOKIE:", !!cookie);

			console.log("ADMIN CLIENT IP:", clientIp || "UNKNOWN");

			/*
			 * ------------------------------------------------
			 * NO COOKIE
			 * ------------------------------------------------
			 */
			if (!cookie) {
				console.log("ADMIN: No cookies found.");

				return redirectToLogin(request);
			}

			/*
			 * ------------------------------------------------
			 * CALL BACKEND /api/init
			 * ------------------------------------------------
			 */
			const response = await fetch(INIT_API_URL, {
				method: "GET",

				headers: {
					Cookie: cookie,

					Accept: "application/json",

					/*
					 * Forward the original
					 * browser IP.
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

			console.log("ADMIN INIT STATUS:", response.status);

			/*
			 * ------------------------------------------------
			 * READ SET-COOKIE
			 * ------------------------------------------------
			 */
			const setCookies = getSetCookies(response);

			console.log("ADMIN INIT SET-COOKIE:", setCookies);

			/*
			 * ------------------------------------------------
			 * BACKEND DELETED ADMIN COOKIE
			 * ------------------------------------------------
			 */
			if (hasDeletedAdminAuth(setCookies)) {
				console.log("ADMIN: Backend returned admin_auth=deleted.");

				return redirectToLogin(request);
			}

			/*
			 * ------------------------------------------------
			 * BACKEND HTTP ERROR
			 * ------------------------------------------------
			 */
			if (!response.ok) {
				console.log("ADMIN: /api/init returned HTTP error.");

				return redirectToLogin(request);
			}

			/*
			 * ------------------------------------------------
			 * READ RESPONSE
			 * ------------------------------------------------
			 */
			const text = await response.text();

			let data: any = {};

			try {
				data = text ? JSON.parse(text) : {};
			} catch {
				console.error("ADMIN: Invalid JSON from /api/init:", text);

				return redirectToLogin(request);
			}

			console.log("ADMIN INIT RESPONSE:", data);

			console.log("ADMIN LOGIN STATUS:", data?.login_status);

			console.log("ADMIN TYPE:", data?.type);

			/*
			 * ------------------------------------------------
			 * ADMIN CHECK
			 * ------------------------------------------------
			 */
			const isAdmin = data?.login_status === true && data?.type === "admin";

			console.log("ADMIN AUTHENTICATED:", isAdmin);

			/*
			 * ------------------------------------------------
			 * INVALID ADMIN SESSION
			 * ------------------------------------------------
			 */
			if (!isAdmin) {
				console.log("ADMIN: Invalid admin session.");

				return redirectToLogin(request);
			}

			/*
			 * ------------------------------------------------
			 * VALID ADMIN
			 * ------------------------------------------------
			 */
			console.log("ADMIN: Valid admin session.");

			const nextResponse = NextResponse.next();

			/*
			 * Forward cookies generated by
			 * the backend.
			 */
			forwardSetCookies(nextResponse, setCookies);

			console.log("ADMIN: Request allowed.");

			console.log("========================================");

			return nextResponse;
		} catch (error) {
			console.error("ADMIN AUTHENTICATION ERROR:", error);

			return redirectToLogin(request);
		}
	}

	/*
	 * =====================================================
	 * OTHER ROUTES
	 * =====================================================
	 */

	if (process.env.NODE_ENV !== "production") {
		return NextResponse.next();
	}

	return NextResponse.next();
}

/*
 * =======================================================
 * MATCHER
 * =======================================================
 */
export const config = {
	matcher: [
		"/admin/:path*",
		"/cart/:path*",
		"/orders/:path*",
		"/order-tracking/:path*",
	],
};
