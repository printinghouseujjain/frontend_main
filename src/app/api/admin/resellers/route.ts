
import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

/* =========================================================
   FORWARD BACKEND SET-COOKIE HEADERS
========================================================= */

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

/* =========================================================
   GET RESELLERS
========================================================= */

export async function POST(request: NextRequest) {
	try {
		const cookie = request.headers.get("cookie");

		/* =====================================================
		   GET USER ID FROM QUERY
		===================================================== */

		const userId = request.nextUrl.searchParams.get("user_id");

		/* =====================================================
		   BUILD BACKEND FORM DATA
		===================================================== */

		const formData = new FormData();

		formData.append("command_type", "admin");

		if (userId) {
			formData.append("user_id", userId);
		}

		console.log("=================================");
		console.log("RESELLERS PROXY");
		console.log("Command Type: admin");
		console.log("User ID:", userId || "ALL");
		console.log("Has Cookie:", Boolean(cookie));
		console.log("Backend URL:", `${API_URL}/api/resellers`);
		console.log("=================================");

		/* =====================================================
		   BACKEND REQUEST
		===================================================== */

		const response = await fetch(`${API_URL}/api/resellers`, {
			method: "POST",

			headers: {
				Accept: "application/json",

				...(cookie
					? {
							Cookie: cookie,
						}
					: {}),
			},

			body: formData,

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
			console.error("INVALID RESELLERS RESPONSE:", text);

			data = {
				message: text || "Invalid response from resellers server.",
			};
		}

		console.log("RESELLERS BACKEND STATUS:", response.status);

		console.log("RESELLERS BACKEND RESPONSE:", data);

		/* =====================================================
		   RETURN RESPONSE
		===================================================== */

		const nextResponse = NextResponse.json(data, {
			status: response.status,
		});

		/* =====================================================
		   FORWARD BACKEND COOKIES
		===================================================== */

		forwardSetCookies(response, nextResponse);

		return nextResponse;
	} catch (error) {
		console.error("Resellers proxy error:", error);

		return NextResponse.json(
			{
				message: "Unable to connect to resellers server.",
			},
			{
				status: 500,
			},
		);
	}
}
