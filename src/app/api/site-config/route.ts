import { NextResponse } from "next/server";

const CONFIG_URL =
	"https://api.printinghouseujjain.in/assets/config.json";

export async function GET() {
	try {
		const response = await fetch(CONFIG_URL, {
			cache: "no-store",
		});

		if (!response.ok) {
			return NextResponse.json(
				{
					error: `Failed to fetch site config: ${response.status}`,
				},
				{
					status: response.status,
				},
			);
		}

		const config = await response.json();

		return NextResponse.json(config, {
			status: 200,
			headers: {
				"Cache-Control":
					"no-store, no-cache, must-revalidate",
			},
		});
	} catch (error) {
		console.error(
			"Site config proxy error:",
			error,
		);

		return NextResponse.json(
			{
				error: "Unable to fetch site configuration",
			},
			{
				status: 500,
			},
		);
	}
}