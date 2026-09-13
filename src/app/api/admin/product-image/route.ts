import { NextRequest, NextResponse } from "next/server";

const PRODUCT_IMAGE_BASE_URL = "https://api.printinghouseujjain.in/";
const ALLOWED_HOST = "api.printinghouseujjain.in";

export async function GET(request: NextRequest) {
	const rawPath = request.nextUrl.searchParams.get("path");

	if (!rawPath) {
		return NextResponse.json(
			{ status: 400, message: "Image path is required." },
			{ status: 400 },
		);
	}

	try {
		const url = new URL(rawPath, PRODUCT_IMAGE_BASE_URL);

		if (url.hostname !== ALLOWED_HOST) {
			return NextResponse.json(
				{ status: 400, message: "Invalid image host." },
				{ status: 400 },
			);
		}

		const response = await fetch(url.toString(), {
			method: "GET",
			cache: "no-store",
		});

		if (!response.ok) {
			return NextResponse.json(
				{
					status: response.status,
					message: "Unable to load image.",
				},
				{
					status: response.status,
				},
			);
		}

		const contentType = response.headers.get("content-type") || "image/jpeg";

		const buffer = await response.arrayBuffer();

		return new NextResponse(buffer, {
			status: 200,
			headers: {
				"Content-Type": contentType,
				"Cache-Control": "no-store",
			},
		});
	} catch {
		return NextResponse.json(
			{
				status: 500,
				message: "Unable to load existing image.",
			},
			{
				status: 500,
			},
		);
	}
}
