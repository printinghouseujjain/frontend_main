import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

/* ============================================================================
   HELPERS
============================================================================ */

async function parseResponse(response: Response): Promise<unknown> {
	const text = await response.text();

	if (!text) {
		return {};
	}

	try {
		return JSON.parse(text);
	} catch {
		return {
			message: text,
		};
	}
}

function getLogicalStatus(data: unknown, fallbackStatus: number): number {
	if (
		data &&
		typeof data === "object" &&
		"status" in data &&
		typeof (data as { status?: unknown }).status === "number"
	) {
		const status = (data as { status: number }).status;

		if (status >= 100 && status <= 599) {
			return status;
		}
	}

	if (
		data &&
		typeof data === "object" &&
		"success" in data &&
		(data as { success?: unknown }).success === false
	) {
		return fallbackStatus >= 400 ? fallbackStatus : 400;
	}

	return fallbackStatus;
}

function getMessage(data: unknown): string {
	if (
		data &&
		typeof data === "object" &&
		"message" in data &&
		typeof (data as { message?: unknown }).message === "string"
	) {
		return (data as { message: string }).message;
	}

	return "Request failed.";
}

function getForwardHeaders(request: NextRequest): Headers {
	const headers = new Headers();

	headers.set("Accept", "application/json");

	const cookie = request.headers.get("cookie");

	if (cookie) {
		headers.set("Cookie", cookie);
	}

	const authorization = request.headers.get("authorization");

	if (authorization) {
		headers.set("Authorization", authorization);
	}

	return headers;
}

function forwardSetCookie(
	sourceResponse: Response,
	nextResponse: NextResponse,
) {
	const setCookie = sourceResponse.headers.get("set-cookie");

	if (setCookie) {
		nextResponse.headers.set("set-cookie", setCookie);
	}
}

/* ============================================================================
   GET
============================================================================ */

export async function GET(request: NextRequest) {
	try {
		const productId = request.nextUrl.searchParams.get("product_id");

		const headers = getForwardHeaders(request);

		/* ----------------------------------------------------------------------
		   SINGLE PRODUCT
		---------------------------------------------------------------------- */

		if (productId) {
			const formData = new FormData();

			formData.append("product_id", productId);

			const response = await fetch(`${API_URL}/api/products`, {
				method: "POST",
				body: formData,
				headers,
				cache: "no-store",
			});

			const data = await parseResponse(response);

			const status = getLogicalStatus(data, response.status);

			const nextResponse = NextResponse.json(data, {
				status,
			});

			forwardSetCookie(response, nextResponse);

			return nextResponse;
		}

		/* ----------------------------------------------------------------------
		   ALL PRODUCTS
		---------------------------------------------------------------------- */

		const response = await fetch(`${API_URL}/api/products`, {
			method: "GET",
			headers,
			cache: "no-store",
		});

		const data = await parseResponse(response);

		const status = getLogicalStatus(data, response.status);

		const nextResponse = NextResponse.json(data, {
			status,
		});

		forwardSetCookie(response, nextResponse);

		return nextResponse;
	} catch (error) {
		console.error("Products GET proxy error:", error);

		return NextResponse.json(
			{
				status: 500,
				message: "Failed to fetch products.",
			},
			{
				status: 500,
			},
		);
	}
}

/* ============================================================================
   POST
============================================================================ */

export async function POST(request: NextRequest) {
	try {
		const contentType = request.headers.get("content-type") || "";

		/* ======================================================================
		   JSON REQUEST
		   
		   Used by:
		   - Bulk product deletion
		====================================================================== */

		if (contentType.includes("application/json")) {
			const body = await request.json();

			if (!body || typeof body !== "object") {
				return NextResponse.json(
					{
						status: 400,
						message: "Invalid request body.",
					},
					{
						status: 400,
					},
				);
			}

			const mode = body.mode;
			const commandType = body.command_type;
			const productIds = body.product_ids;

			/* ------------------------------------------------------------------
			   VALIDATE MODE
			------------------------------------------------------------------ */

			if (mode !== "delete") {
				return NextResponse.json(
					{
						status: 400,
						message: 'Invalid mode. Expected "delete".',
					},
					{
						status: 400,
					},
				);
			}

			/* ------------------------------------------------------------------
			   VALIDATE COMMAND TYPE
			------------------------------------------------------------------ */

			if (commandType !== "admin") {
				return NextResponse.json(
					{
						status: 400,
						message: 'Invalid command_type. Expected "admin".',
					},
					{
						status: 400,
					},
				);
			}

			/* ------------------------------------------------------------------
			   VALIDATE PRODUCT IDS
			------------------------------------------------------------------ */

			if (!Array.isArray(productIds) || productIds.length === 0) {
				return NextResponse.json(
					{
						status: 400,
						message: "At least one product ID is required.",
					},
					{
						status: 400,
					},
				);
			}

			/* ------------------------------------------------------------------
			   NORMALIZE IDS
			------------------------------------------------------------------ */

			const normalizedProductIds = [
				...new Set(
					productIds
						.map((id: unknown) => {
							const numericId = Number(id);

							return Number.isInteger(numericId) &&
								numericId > 0
								? numericId
								: null;
						})
						.filter(
							(id): id is number => id !== null,
						),
				),
			];

			if (normalizedProductIds.length === 0) {
				return NextResponse.json(
					{
						status: 400,
						message: "No valid product IDs were provided.",
					},
					{
						status: 400,
					},
				);
			}

			/* ------------------------------------------------------------------
			   AUTH
			------------------------------------------------------------------ */

			const cookie = request.headers.get("cookie");
			const authorization =
				request.headers.get("authorization");

			/* ------------------------------------------------------------------
			   DELETE SEQUENTIALLY
			------------------------------------------------------------------ */

			const deletedIds: number[] = [];

			const failed: {
				product_id: number;
				status: number;
				message: string;
				response: unknown;
			}[] = [];

			for (const productId of normalizedProductIds) {
				try {
					const formData = new FormData();

					formData.append("mode", "delete");
					formData.append(
						"product_id",
						String(productId),
					);
					formData.append(
						"command_type",
						"admin",
					);

					const headers: HeadersInit = {
						Accept: "application/json",
					};

					if (cookie) {
						headers.Cookie = cookie;
					}

					if (authorization) {
						headers.Authorization =
							authorization;
					}

					console.log(
						`Deleting product ${productId}...`,
					);

					const response = await fetch(
						`${API_URL}/api/products`,
						{
							method: "POST",
							body: formData,
							headers,
							cache: "no-store",
						},
					);

					const data =
						await parseResponse(response);

					const status = getLogicalStatus(
						data,
						response.status,
					);

					const succeeded =
						status >= 200 && status < 300;

					if (succeeded) {
						deletedIds.push(productId);

						console.log(
							`Product ${productId} deleted successfully.`,
						);
					} else {
						failed.push({
							product_id: productId,
							status,
							message: getMessage(data),
							response: data,
						});

						console.error(
							`Failed to delete product ${productId}:`,
							data,
						);
					}
				} catch (error) {
					console.error(
						`Delete product ${productId} failed:`,
						error,
					);

					failed.push({
						product_id: productId,
						status: 500,
						message:
							error instanceof Error
								? error.message
								: "Unknown error.",
						response: null,
					});
				}
			}

			/* ------------------------------------------------------------------
			   DELETE RESPONSE
			------------------------------------------------------------------ */

			if (failed.length === 0) {
				return NextResponse.json(
					{
						status: 200,
						success: true,
						message:
							"Products deleted successfully.",
						deleted_ids: deletedIds,
						failed: [],
					},
					{
						status: 200,
					},
				);
			}

			if (deletedIds.length > 0) {
				return NextResponse.json(
					{
						status: 207,
						success: false,
						message:
							"Some products were deleted, but some deletions failed.",
						deleted_ids: deletedIds,
						failed,
					},
					{
						status: 207,
					},
				);
			}

			return NextResponse.json(
				{
					status: 400,
					success: false,
					message:
						"Unable to delete the selected products.",
					deleted_ids: [],
					failed,
				},
				{
					status: 400,
				},
			);
		}

		/* ======================================================================
		   MULTIPART REQUEST
		   
		   Used by:
		   - Create product
		   - Edit product
		====================================================================== */

		if (
			contentType.includes("multipart/form-data") ||
			contentType.includes("application/x-www-form-urlencoded")
		) {
			/*
			 * IMPORTANT:
			 *
			 * Do NOT call request.json() here.
			 *
			 * We forward the original FormData directly to the backend.
			 */

			const formData = await request.formData();

			const headers = getForwardHeaders(request);

			console.log(
				"Forwarding multipart product request to backend...",
			);

			const response = await fetch(
				`${API_URL}/api/products`,
				{
					method: "POST",
					body: formData,
					headers,
					cache: "no-store",
				},
			);

			const data = await parseResponse(response);

			const status = getLogicalStatus(
				data,
				response.status,
			);

			console.log(
				"Backend product response:",
				status,
				data,
			);

			const nextResponse = NextResponse.json(data, {
				status,
			});

			forwardSetCookie(response, nextResponse);

			return nextResponse;
		}

		/* ======================================================================
		   UNSUPPORTED CONTENT TYPE
		====================================================================== */

		return NextResponse.json(
			{
				status: 400,
				message:
					"Unsupported request content type.",
			},
			{
				status: 400,
			},
		);
	} catch (error) {
		console.error("Products POST proxy error:", error);

		return NextResponse.json(
			{
				status: 500,
				message: "Failed to process product request.",
			},
			{
				status: 500,
			},
		);
	}
}