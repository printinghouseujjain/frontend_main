import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const backendFormData = new FormData();

		for (const [key, value] of formData.entries()) {
			backendFormData.append(key, value);
		}

		const response = await fetch(`${API_URL}/api/make_review`, {
			method: "POST",
			headers: {
				Accept: "application/json",
				...(request.headers.get("cookie") ? { Cookie: request.headers.get("cookie")! } : {}),
			},
			body: backendFormData,
			cache: "no-store",
		});

		const text = await response.text();
		let data: unknown;
		try {
			data = text ? JSON.parse(text) : {};
		} catch {
			data = { message: text || "Invalid review response." };
		}

		return NextResponse.json(data, { status: response.status });
	} catch (error) {
		console.error("Make review proxy error:", error);
		return NextResponse.json({ message: "Unable to submit review." }, { status: 500 });
	}
}
