import { NextRequest, NextResponse } from "next/server";

const INIT_API_URL = "https://api.printinghouseujjain.in/api/init";

export async function GET(request: NextRequest) {
	try {
		const cookie = request.headers.get("cookie");

		if (!cookie) {
			return NextResponse.json(
				{
					status: 401,
					message: "Not authenticated",
					login_status: false,
					type: null,
				},
				{ status: 401 },
			);
		}

		const response = await fetch(INIT_API_URL, {
			method: "GET",
			headers: {
				Cookie: cookie,
				Accept: "application/json",
			},
			cache: "no-store",
		});

		const data = await response.json().catch(() => null);

		if (!data) {
			return NextResponse.json(
				{
					status: 500,
					message: "Invalid authentication response",
					login_status: false,
					type: null,
				},
				{ status: 500 },
			);
		}

		return NextResponse.json(data, {
			status: response.ok ? 200 : response.status,
		});
	} catch (error) {
		console.error("Auth init error:", error);

		return NextResponse.json(
			{
				status: 500,
				message: "Authentication verification failed",
				login_status: false,
				type: null,
			},
			{ status: 500 },
		);
	}
}
