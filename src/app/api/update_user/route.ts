import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

/*
 * These fields are controlled by the server.
 * The client cannot override them.
 */
const SERVER_CONTROLLED_FIELDS = new Set(["command_type"]);

/*
 * Fields that are allowed to be updated.
 *
 * user_id is mandatory but is never treated as an update field.
 * command_type is always added by the server.
 */
const ALLOWED_UPDATE_FIELDS = new Set([
	"name",
	"email",
	"phone",
	"reseller",
	"reseller_toggle",
	"credit",
]);

export async function POST(request: NextRequest) {
	try {
		console.log("==================================================");
		console.log("USER UPDATE PROXY - REQUEST START");
		console.log("==================================================");

		// --------------------------------------------------
		// INCOMING REQUEST
		// --------------------------------------------------
		console.log("INCOMING REQUEST URL:", request.url);
		console.log("INCOMING REQUEST METHOD:", request.method);

		const incomingHeaders: Record<string, string> = {};

		request.headers.forEach((value, key) => {
			incomingHeaders[key] = value;
		});

		console.log("INCOMING REQUEST HEADERS:", incomingHeaders);

		const cookie = request.headers.get("cookie");

		console.log("INCOMING COOKIE:", cookie);

		// --------------------------------------------------
		// READ BODY
		// --------------------------------------------------
		const input = await request.formData();

		const incomingBody: Record<string, unknown> = {};

		for (const [key, value] of input.entries()) {
			if (value instanceof File) {
				incomingBody[key] = {
					type: "File",
					name: value.name,
					size: value.size,
					type_value: value.type,
				};
			} else {
				incomingBody[key] = value;
			}
		}

		console.log("INCOMING FORM DATA:", incomingBody);

		// --------------------------------------------------
		// VALIDATE USER ID
		// --------------------------------------------------
		const userId = input.get("user_id");

		if (!userId || typeof userId !== "string" || !userId.trim()) {
			console.error("VALIDATION ERROR: user_id is required.");

			return NextResponse.json(
				{
					message: "user_id is required.",
				},
				{ status: 400 },
			);
		}

		// --------------------------------------------------
		// BUILD BACKEND FORM DATA
		//
		// Always send:
		//   1. user_id
		//   2. command_type=admin
		//
		// Then send ONLY the fields that are actually being
		// updated.
		// --------------------------------------------------
		const backendFormData = new FormData();

		// Mandatory fields
		backendFormData.append("user_id", userId.trim());
		backendFormData.append("command_type", "admin");

		// Track whether at least one update field exists
		let hasUpdateField = false;

		for (const [key, value] of input.entries()) {
			// Never allow client to override server-controlled fields
			if (SERVER_CONTROLLED_FIELDS.has(key)) {
				continue;
			}

			// user_id has already been added above
			if (key === "user_id") {
				continue;
			}

			// Ignore fields that are not allowed to be updated
			if (!ALLOWED_UPDATE_FIELDS.has(key)) {
				continue;
			}

			hasUpdateField = true;

			if (value instanceof File) {
				backendFormData.append(key, value, value.name);
			} else {
				backendFormData.append(key, value.trim());
			}
		}

		// --------------------------------------------------
		// VALIDATE UPDATE FIELD
		// --------------------------------------------------
		if (!hasUpdateField) {
			console.error("VALIDATION ERROR: No update field provided.");

			return NextResponse.json(
				{
					message: "user_id and at least one field to update are required.",
				},
				{ status: 400 },
			);
		}

		// --------------------------------------------------
		// LOG BACKEND REQUEST BODY
		// --------------------------------------------------
		const backendBody: Record<string, unknown> = {};

		for (const [key, value] of backendFormData.entries()) {
			if (value instanceof File) {
				backendBody[key] = {
					type: "File",
					name: value.name,
					size: value.size,
					type_value: value.type,
				};
			} else {
				backendBody[key] = value;
			}
		}

		console.log("BACKEND REQUEST URL:", `${API_URL}/api/update_user`);
		console.log("BACKEND REQUEST METHOD:", "POST");

		console.log("BACKEND REQUEST HEADERS:", {
			Accept: "application/json",
			...(cookie ? { Cookie: cookie } : {}),
		});

		console.log("BACKEND REQUEST BODY:", backendBody);

		// --------------------------------------------------
		// SEND REQUEST TO BACKEND
		// --------------------------------------------------
		const response = await fetch(`${API_URL}/api/update_user`, {
			method: "POST",
			headers: {
				Accept: "application/json",
				...(cookie ? { Cookie: cookie } : {}),
			},
			body: backendFormData,
			cache: "no-store",
		});

		// --------------------------------------------------
		// RESPONSE
		// --------------------------------------------------
		console.log("==================================================");
		console.log("BACKEND RESPONSE");
		console.log("==================================================");

		console.log("RESPONSE STATUS:", response.status);
		console.log("RESPONSE STATUS TEXT:", response.statusText);
		console.log("RESPONSE OK:", response.ok);
		console.log("RESPONSE URL:", response.url);
		console.log("RESPONSE REDIRECTED:", response.redirected);
		console.log("RESPONSE TYPE:", response.type);

		// --------------------------------------------------
		// RESPONSE HEADERS
		// --------------------------------------------------
		const responseHeaders: Record<string, string> = {};

		response.headers.forEach((value, key) => {
			responseHeaders[key] = value;
		});

		console.log("RESPONSE HEADERS:", responseHeaders);

		const setCookie = response.headers.get("set-cookie");

		console.log("RESPONSE SET-COOKIE:", setCookie);

		// --------------------------------------------------
		// RESPONSE BODY
		// --------------------------------------------------
		const text = await response.text();

		console.log("RAW RESPONSE BODY:", text);

		let data: unknown;

		try {
			data = text ? JSON.parse(text) : {};

			console.log("PARSED RESPONSE BODY:", data);
		} catch (parseError) {
			console.error("RESPONSE JSON PARSE ERROR:", parseError);

			data = {
				message: text || "Invalid response from user update server.",
			};
		}

		// --------------------------------------------------
		// RETURN RESPONSE TO FRONTEND
		// --------------------------------------------------
		const nextResponse = NextResponse.json(data, {
			status: response.status,
		});

		if (setCookie) {
			nextResponse.headers.set("set-cookie", setCookie);
		}

		console.log("FRONTEND RESPONSE STATUS:", response.status);
		console.log("FRONTEND RESPONSE BODY:", data);

		console.log("==================================================");
		console.log("USER UPDATE PROXY - REQUEST END");
		console.log("==================================================");

		return nextResponse;
	} catch (error) {
		console.error("==================================================");
		console.error("USER UPDATE PROXY ERROR");
		console.error("==================================================");

		console.error("ERROR:", error);

		if (error instanceof Error) {
			console.error("ERROR NAME:", error.name);
			console.error("ERROR MESSAGE:", error.message);
			console.error("ERROR STACK:", error.stack);
		}

		return NextResponse.json(
			{
				message: "Unable to update user.",
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
