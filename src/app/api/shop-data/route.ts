import { NextResponse } from "next/server";

const API_URL = "https://api.printinghouseujjain.in";

export async function GET() {
	try {
		const [categoriesResponse, occasionsResponse, productsResponse] =
			await Promise.all([
				fetch(`${API_URL}/api/categories`, {
					cache: "no-store",
				}),

				fetch(`${API_URL}/api/occasions`, {
					cache: "no-store",
				}),

				fetch(`${API_URL}/api/products`, {
					cache: "no-store",
				}),
			]);

		if (
			!categoriesResponse.ok ||
			!occasionsResponse.ok ||
			!productsResponse.ok
		) {
			throw new Error("Failed to fetch shop data");
		}

		const [categories, occasions, products] = await Promise.all([
			categoriesResponse.json(),
			occasionsResponse.json(),
			productsResponse.json(),
		]);

		return NextResponse.json({
			categories: categories.categories || [],
			occasions: occasions.occasions || [],
			products: products.products || [],
		});
	} catch (error) {
		console.error("Shop data API error:", error);

		return NextResponse.json(
			{
				message: "Unable to load shop data",
			},
			{ status: 500 },
		);
	}
}
