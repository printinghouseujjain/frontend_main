// app/api/calc_fees/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ASSUMPTION 1: backend base URL and path. Change if your other proxy routes differ.
const BACKEND_BASE_URL =
	process.env.BACKEND_API_URL ?? "https://api.printinghouseujjain.in";

const CALC_FEES_URL = `${BACKEND_BASE_URL.replace(/\/+$/, "")}/calc_fees`;

export async function POST(request: NextRequest) {
	/* ---------- Read + validate input ---------- */

	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ status: 400, message: "Invalid request body." },
			{ status: 400 },
		);
	}

	const total = Number((body as { total?: unknown } | null)?.total);

	if (!Number.isFinite(total) || total <= 0) {
		return NextResponse.json(
			{ status: 400, message: "A valid total is required." },
			{ status: 400 },
		);
	}

	/* ---------- Forward to the backend ---------- */

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 15000);

	try {
		const cookie = request.headers.get("cookie") ?? "";

		// ASSUMPTION 2: the backend accepts JSON. If it expects form data
		// (like your admin product endpoints), use the FormData version below.
		const backendResponse = await fetch(CALC_FEES_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				...(cookie ? { Cookie: cookie } : {}),
			},
			body: JSON.stringify({ total }),
			cache: "no-store",
			signal: controller.signal,
		});

		/*
		// FormData version: replace headers/body above with:
		//   headers: { Accept: "application/json", ...(cookie ? { Cookie: cookie } : {}) },
		//   body: (() => { const f = new FormData(); f.append("total", String(total)); return f; })(),
		*/

		const text = await backendResponse.text();

		let data: unknown;

		try {
			data = JSON.parse(text);
		} catch {
			data = { message: text || "Unexpected response from server." };
		}

		const response = NextResponse.json(data, {
			status: backendResponse.status,
		});

		// Pass any session cookie updates back to the browser.
		const setCookies = backendResponse.headers.getSetCookie?.() ?? [];

		setCookies.forEach((value) => {
			response.headers.append("set-cookie", value);
		});

		return response;
	} catch (error) {
		const timedOut = error instanceof Error && error.name === "AbortError";

		console.error("calc_fees proxy failed:", error);

		return NextResponse.json(
			{
				status: timedOut ? 504 : 502,
				message: timedOut
					? "Fee calculation timed out."
					: "Unable to reach the fee service.",
			},
			{ status: timedOut ? 504 : 502 },
		);
	} finally {
		clearTimeout(timeout);
	}
}
