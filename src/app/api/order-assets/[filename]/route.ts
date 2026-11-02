import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

type RouteContext = {
	params: Promise<{ filename: string }>;
};

function getFilename(value: string): string {
	try {
		const withoutQuery = value.split("?")[0].split("#")[0];
		const path = withoutQuery.replace(/\\/g, "/");
		return decodeURIComponent(path.slice(path.lastIndexOf("/") + 1));
	} catch {
		return "";
	}
}

function containsFilename(value: unknown, filename: string): boolean {
	if (typeof value === "string") {
		return getFilename(value) === filename;
	}

	if (Array.isArray(value)) {
		return value.some((entry) => containsFilename(entry, filename));
	}

	if (value && typeof value === "object") {
		return Object.values(value).some((entry) =>
			containsFilename(entry, filename),
		);
	}

	return false;
}

function unauthorizedResponse() {
	return NextResponse.json(
		{ message: "You are not authorized to view this image." },
		{ status: 401 },
	);
}

export async function GET(request: NextRequest, context: RouteContext) {
	const cookie = request.headers.get("cookie");

	if (!cookie) {
		return unauthorizedResponse();
	}

	try {
		const { filename: encodedFilename } = await context.params;
		const filename = getFilename(encodedFilename);
		const orderId = request.nextUrl.searchParams.get("orderId")?.trim();
		const isAdminRequest = request.nextUrl.searchParams.get("admin") === "1";

		if (!filename || filename === "." || filename === ".." || !orderId) {
			return NextResponse.json(
				{ message: "A valid order ID and image filename are required." },
				{ status: 400 },
			);
		}

		const orderRequest = new FormData();
		orderRequest.append("order_id", orderId);

		if (isAdminRequest) {
			orderRequest.append("command_type", "admin");
		}

		const orderResponse = await fetch(`${API_URL}/api/orders`, {
			method: "POST",
			headers: {
				Accept: "application/json",
				Cookie: cookie,
			},
			body: orderRequest,
			cache: "no-store",
		});

		if (!orderResponse.ok) {
			return unauthorizedResponse();
		}

		const orderText = await orderResponse.text();
		let orderData: unknown;

		try {
			orderData = orderText ? JSON.parse(orderText) : null;
		} catch {
			console.error("Invalid order response while authorizing image access.");
			return NextResponse.json(
				{ message: "Unable to authorize image access." },
				{ status: 502 },
			);
		}

		if (!containsFilename(orderData, filename)) {
			return NextResponse.json(
				{ message: "Image not found for this order." },
				{ status: 404 },
			);
		}

		const imageResponse = await fetch(
			`${API_URL}/assets/uploads/${encodeURIComponent(filename)}`,
			{
				headers: { Cookie: cookie },
				cache: "no-store",
			},
		);

		if (!imageResponse.ok || !imageResponse.body) {
			return NextResponse.json(
				{ message: "Unable to load order image." },
				{ status: imageResponse.status || 502 },
			);
		}

		const responseHeaders = new Headers();
		const contentType = imageResponse.headers.get("content-type");

		if (contentType) {
			responseHeaders.set("content-type", contentType);
		}

		responseHeaders.set("cache-control", "private, no-store");
		responseHeaders.set("content-disposition", "inline");

		return new NextResponse(imageResponse.body, {
			status: 200,
			headers: responseHeaders,
		});
	} catch (error) {
		console.error("Order image proxy error:", error);

		return NextResponse.json(
			{ message: "Unable to load order image." },
			{ status: 500 },
		);
	}
}
