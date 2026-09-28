import { NextRequest, NextResponse } from "next/server";

const INIT_API_URL =
	"https://api.printinghouseujjain.in/api/init";

/*
 * =========================================================
 * GET CLIENT IP
 * =========================================================
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
 * =========================================================
 * CLEAR ADMIN COOKIE
 * =========================================================
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
 * =========================================================
 * CLEAR USER COOKIE
 * =========================================================
 */

function clearUserAuthCookie(response: NextResponse) {
	response.cookies.set({
		name: "user_auth",
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
 * =========================================================
 * CLEAR ALL AUTH COOKIES
 * =========================================================
 */

function clearAuthCookies(response: NextResponse) {
	clearAdminAuthCookie(response);
	clearUserAuthCookie(response);
}

/*
 * =========================================================
 * REDIRECT TO LOGIN
 * =========================================================
 */

function redirectToLogin(request: NextRequest) {
	const response = NextResponse.redirect(
		new URL("/login", request.url),
	);

	clearAuthCookies(response);

	return response;
}

/*
 * =========================================================
 * REDIRECT
 * =========================================================
 */

function redirectTo(
	request: NextRequest,
	path: "/login" | "/profile" | "/admin",
) {
	return NextResponse.redirect(
		new URL(path, request.url),
	);
}

/*
 * =========================================================
 * GET SET-COOKIE HEADERS
 * =========================================================
 */

function getSetCookies(response: Response): string[] {
	if (typeof response.headers.getSetCookie === "function") {
		return response.headers.getSetCookie();
	}

	const setCookie = response.headers.get("set-cookie");

	return setCookie ? [setCookie] : [];
}

/*
 * =========================================================
 * CHECK DELETED COOKIE
 * =========================================================
 */

function hasDeletedCookie(
	setCookies: string[],
	cookieName: string,
): boolean {
	const regex = new RegExp(
		`${cookieName}=deleted(?:;|,|$)`,
		"i",
	);

	return setCookies.some((cookieHeader) =>
		regex.test(cookieHeader),
	);
}

/*
 * =========================================================
 * FORWARD BACKEND COOKIES
 * =========================================================
 */

function forwardSetCookies(
	response: NextResponse,
	setCookies: string[],
) {
	for (const cookieHeader of setCookies) {
		response.headers.append(
			"Set-Cookie",
			cookieHeader,
		);
	}
}

/*
 * =========================================================
 * AUTH TYPE
 * =========================================================
 */

type AuthType =
	| "admin"
	| "user"
	| "none";

/*
 * =========================================================
 * GET AUTH STATE
 * =========================================================
 *
 * The backend /api/init is the source of truth.
 *
 * Expected response:
 *
 * {
 *   login_status: true,
 *   type: "admin"
 * }
 *
 * OR
 *
 * {
 *   login_status: true,
 *   type: "user"
 * }
 *
 * OR
 *
 * {
 *   login_status: false
 * }
 *
 * =========================================================
 */

async function getAuthState(
	request: NextRequest,
): Promise<{
	type: AuthType;
	loginStatus: boolean;
	setCookies: string[];
}> {
	const cookie = request.headers.get("cookie");

	/*
	 * No browser cookies means there is no authenticated
	 * session to validate.
	 */
	if (!cookie) {
		return {
			type: "none",
			loginStatus: false,
			setCookies: [],
		};
	}

	const clientIp = getClientIp(request);

	const response = await fetch(
		INIT_API_URL,
		{
			method: "GET",

			headers: {
				Cookie: cookie,

				Accept: "application/json",

				...(clientIp
					? {
							"X-Forwarded-For": clientIp,
							"X-Real-IP": clientIp,
						}
					: {}),
			},

			cache: "no-store",
		},
	);

	console.log(
		"AUTH INIT STATUS:",
		response.status,
	);

	const setCookies = getSetCookies(response);

	console.log(
		"AUTH INIT SET-COOKIE:",
		setCookies,
	);

	/*
	 * If backend explicitly deleted either auth cookie,
	 * treat the session as invalid.
	 */
	if (
		hasDeletedCookie(
			setCookies,
			"admin_auth",
		) ||
		hasDeletedCookie(
			setCookies,
			"user_auth",
		)
	) {
		return {
			type: "none",
			loginStatus: false,
			setCookies,
		};
	}

	/*
	 * Backend error.
	 */
	if (!response.ok) {
		throw new Error(
			`/api/init returned HTTP ${response.status}`,
		);
	}

	const text = await response.text();

	let data: any = {};

	try {
		data = text ? JSON.parse(text) : {};
	} catch {
		console.error(
			"Invalid JSON from /api/init:",
			text,
		);

		return {
			type: "none",
			loginStatus: false,
			setCookies,
		};
	}

	console.log(
		"AUTH INIT RESPONSE:",
		data,
	);

	console.log(
		"AUTH LOGIN STATUS:",
		data?.login_status,
	);

	console.log(
		"AUTH TYPE:",
		data?.type,
	);

	const loginStatus =
		data?.login_status === true;

	if (!loginStatus) {
		return {
			type: "none",
			loginStatus: false,
			setCookies,
		};
	}

	if (data?.type === "admin") {
		return {
			type: "admin",
			loginStatus: true,
			setCookies,
		};
	}

	if (data?.type === "user") {
		return {
			type: "user",
			loginStatus: true,
			setCookies,
		};
	}

	/*
	 * Logged in but unknown account type.
	 *
	 * Treat it as unauthenticated rather than granting
	 * access to a protected route.
	 */
	return {
		type: "none",
		loginStatus: false,
		setCookies,
	};
}

/*
 * =========================================================
 * PROXY
 * =========================================================
 */

export async function proxy(
	request: NextRequest,
) {
	const pathname =
		request.nextUrl.pathname;

	console.log(
		"========================================",
	);

	console.log(
		"AUTH PROXY REQUEST:",
		pathname,
	);

	/*
	 * =====================================================
	 * ONLY AUTH ROUTES
	 * =====================================================
	 *
	 * Do not run authentication checks for unrelated
	 * storefront routes.
	 */

	const isLogin =
		pathname === "/login";

	const isProfile =
		pathname === "/profile" ||
		pathname.startsWith("/profile/");

	const isAdmin =
		pathname === "/admin" ||
		pathname.startsWith("/admin/");

	if (!isLogin && !isProfile && !isAdmin) {
		return NextResponse.next();
	}

	/*
	 * =====================================================
	 * GET AUTH STATE
	 * =====================================================
	 */

	try {
		const auth = await getAuthState(
			request,
		);

		console.log(
			"AUTH TYPE:",
			auth.type,
		);

		console.log(
			"AUTH LOGIN STATUS:",
			auth.loginStatus,
		);

		/*
		 * =================================================
		 * LOGIN
		 * =================================================
		 *
		 * USER
		 *   /login -> /profile
		 *
		 * ADMIN
		 *   /login -> /admin
		 *
		 * NONE
		 *   stay on /login
		 */

		if (isLogin) {
			/*
			 * Logged in as admin.
			 */
			if (auth.type === "admin") {
				console.log(
					"LOGIN: Admin detected -> /admin",
				);

				const response = redirectTo(
					request,
					"/admin",
				);

				forwardSetCookies(
					response,
					auth.setCookies,
				);

				return response;
			}

			/*
			 * Logged in as normal user.
			 */
			if (auth.type === "user") {
				console.log(
					"LOGIN: User detected -> /profile",
				);

				const response = redirectTo(
					request,
					"/profile",
				);

				forwardSetCookies(
					response,
					auth.setCookies,
				);

				return response;
			}

			/*
			 * Not logged in.
			 *
			 * IMPORTANT:
			 * Stay at /login.
			 */
			console.log(
				"LOGIN: No authenticated session -> stay",
			);

			const response =
				NextResponse.next();

			forwardSetCookies(
				response,
				auth.setCookies,
			);

			return response;
		}

		/*
		 * =================================================
		 * PROFILE
		 * =================================================
		 *
		 * USER
		 *   stay on /profile
		 *
		 * ADMIN
		 *   /profile -> /admin
		 *
		 * NONE
		 *   /profile -> /login
		 */

		if (isProfile) {
			/*
			 * Normal user.
			 *
			 * Allow profile.
			 */
			if (auth.type === "user") {
				console.log(
					"PROFILE: Valid user -> allow",
				);

				const response =
					NextResponse.next();

				forwardSetCookies(
					response,
					auth.setCookies,
				);

				return response;
			}

			/*
			 * Admin trying to access profile.
			 */
			if (auth.type === "admin") {
				console.log(
					"PROFILE: Admin detected -> /admin",
				);

				const response = redirectTo(
					request,
					"/admin",
				);

				forwardSetCookies(
					response,
					auth.setCookies,
				);

				return response;
			}

			/*
			 * No authenticated user.
			 */
			console.log(
				"PROFILE: No session -> /login",
			);

			return redirectToLogin(request);
		}

		/*
		 * =================================================
		 * ADMIN
		 * =================================================
		 *
		 * ADMIN
		 *   stay on /admin
		 *
		 * USER
		 *   /admin -> /profile
		 *
		 * NONE
		 *   /admin -> /login
		 */

		if (isAdmin) {
			/*
			 * Valid admin.
			 *
			 * Allow admin.
			 */
			if (auth.type === "admin") {
				console.log(
					"ADMIN: Valid admin -> allow",
				);

				const response =
					NextResponse.next();

				forwardSetCookies(
					response,
					auth.setCookies,
				);

				return response;
			}

			/*
			 * Normal user trying to access admin.
			 */
			if (auth.type === "user") {
				console.log(
					"ADMIN: User detected -> /profile",
				);

				const response = redirectTo(
					request,
					"/profile",
				);

				forwardSetCookies(
					response,
					auth.setCookies,
				);

				return response;
			}

			/*
			 * No authenticated session.
			 */
			console.log(
				"ADMIN: No session -> /login",
			);

			return redirectToLogin(request);
		}

		/*
		 * Fallback.
		 */
		return NextResponse.next();
	} catch (error) {
		console.error(
			"AUTHENTICATION PROXY ERROR:",
			error,
		);

		/*
		 * If authentication cannot be verified,
		 * protected routes should not be allowed.
		 */

		if (isProfile || isAdmin) {
			return redirectToLogin(request);
		}

		/*
		 * For /login, do not create a redirect loop
		 * just because /api/init temporarily failed.
		 */
		if (isLogin) {
			return NextResponse.next();
		}

		return NextResponse.next();
	}
}

/*
 * =========================================================
 * MATCHER
 * =========================================================
 *
 * These are the routes whose authentication behavior
 * is handled by this proxy.
 *
 * =========================================================
 */

export const config = {
	matcher: [
		"/login",
		"/profile",
		"/profile/:path*",
		"/admin",
		"/admin/:path*",

		/*
		 * Existing protected routes remain matched.
		 */
		"/cart/:path*",
		"/orders/:path*",
		"/order-tracking/:path*",
	],
};