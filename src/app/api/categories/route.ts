export async function GET() {
	try {
		const response = await fetch(
			"https://api.printinghouseujjain.in/api/categories",
			{
				method: "GET",
				cache: "no-store",
			},
		);

		if (!response.ok) {
			return Response.json(
				{
					message: "Failed to fetch categories",
				},
				{
					status: response.status,
				},
			);
		}

		const data = await response.json();

		return Response.json(data);
	} catch (error) {
		console.error("Categories API error:", error);

		return Response.json(
			{
				message: "Unable to fetch categories",
			},
			{
				status: 500,
			},
		);
	}
}
