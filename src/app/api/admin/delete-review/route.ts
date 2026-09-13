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

function getForwardHeaders(request: NextRequest): Headers {
	const headers = new Headers();

	const cookie = request.headers.get("cookie");
	const authorization = request.headers.get("authorization");
	const clientIp = getClientIp(request);

	if (cookie) {
		headers.set("cookie", cookie);
	}

	if (authorization) {
		headers.set("authorization", authorization);
	}

	if (clientIp) {
		headers.set("X-Forwarded-For", clientIp);
		headers.set("X-Real-IP", clientIp);
	}

	headers.set("Accept", "application/json");

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
		const cookies = headers.getSetCookie();

		for (const cookie of cookies) {
			nextResponse.headers.append("set-cookie", cookie);
		}

		return;
	}

	const setCookie = sourceResponse.headers.get("set-cookie");

	if (setCookie) {
		nextResponse.headers.set("set-cookie", setCookie);
	}
}

/* ─────────────────────────────────────────
   POST — DELETE REVIEW
───────────────────────────────────────── */

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();

		const reviewId = String(formData.get("review_id") ?? "").trim();

		if (!reviewId) {
			return NextResponse.json(
				{
					status: 400,
					message: "review_id is required.",
				},
				{ status: 400 },
			);
		}

		// Always enforce admin mode server-side.
		formData.set("review_id", reviewId);
		formData.set("command_type", "admin");

		const clientIp = getClientIp(request);

		console.log("=================================");
		console.log("ADMIN DELETE REVIEW PROXY");
		console.log("Review ID:", reviewId);
		console.log("Has Cookie:", Boolean(request.headers.get("cookie")));
		console.log(
			"Has Authorization:",
			Boolean(request.headers.get("authorization")),
		);
		console.log("Client IP:", clientIp || "unknown");
		console.log("=================================");

		/* =====================================================
		   SEND REQUEST TO BACKEND
		===================================================== */

		const response = await fetch(`${API_URL}/api/delete_review`, {
			method: "POST",
			body: formData,
			headers: getForwardHeaders(request),
			cache: "no-store",
		});

		/* =====================================================
		   READ BACKEND RESPONSE
		===================================================== */

		const text = await response.text();

		let data: unknown = {};

		try {
			data = text ? JSON.parse(text) : {};
		} catch {
			data = {
				message: text || "Unexpected response from server.",
			};
		}

		let status = response.status;

		if (
			data &&
			typeof data === "object" &&
			"status" in data &&
			typeof (data as { status?: unknown }).status === "number"
		) {
			status = (data as { status: number }).status;
		}

		if (status < 200 || status >= 600) {
			status = response.ok ? 200 : response.status;
		}

		/* =====================================================
		   HANDLE EMPTY RESPONSES
		===================================================== */

		if (status === 204 || status === 205) {
			const nextResponse = new NextResponse(null, {
				status,
				headers: {
					"Cache-Control": "no-store",
				},
			});

			forwardSetCookies(response, nextResponse);

			return nextResponse;
		}

		/* =====================================================
		   RETURN RESPONSE
		===================================================== */

		const nextResponse = NextResponse.json(data, {
			status,
			headers: {
				"Cache-Control": "no-store",
			},
		});

		/* =====================================================
		   FORWARD BACKEND SET-COOKIE HEADERS
		===================================================== */

		forwardSetCookies(response, nextResponse);

		return nextResponse;
	} catch (error) {
		console.error("Delete review proxy error:", error);

		return NextResponse.json(
			{
				status: 500,
				message: "Unable to delete review.",
			},
			{ status: 500 },
		);
	}
}
