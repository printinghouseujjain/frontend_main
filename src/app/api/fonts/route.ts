import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

/* Only font files inside assets/fonts/ — this is not an open proxy. */
const FONT_PATH = /^assets\/fonts\/[A-Za-z0-9._-]+\.(ttf|otf|woff2?)$/i;

const CONTENT_TYPES: Record<string, string> = {
	ttf: "font/ttf",
	otf: "font/otf",
	woff: "font/woff",
	woff2: "font/woff2",
};

function normalizePath(value: string): string {
	let path = value.trim();

	if (path.startsWith(`${API_URL}/`)) {
		path = path.slice(API_URL.length + 1);
	}

	return path.replace(/^\/+/, "");
}

export async function GET(request: NextRequest) {
	try {
		const path = normalizePath(request.nextUrl.searchParams.get("path") ?? "");

		if (!FONT_PATH.test(path)) {
			return NextResponse.json({ message: "Invalid font path." }, { status: 400 });
		}

		const response = await fetch(`${API_URL}/${path}`, { cache: "no-store" });

		if (!response.ok) {
			return NextResponse.json(
				{ message: "Font not found." },
				{ status: response.status === 404 ? 404 : 502 },
			);
		}

		const extension = path.split(".").pop()?.toLowerCase() ?? "ttf";

		return new NextResponse(await response.arrayBuffer(), {
			status: 200,
			headers: {
				"Content-Type": CONTENT_TYPES[extension] ?? "font/ttf",
				"Cache-Control": "public, max-age=86400",
			},
		});
	} catch (error) {
		console.error("FONT PROXY ERROR:", error);

		return NextResponse.json({ message: "Unable to load font." }, { status: 500 });
	}
}