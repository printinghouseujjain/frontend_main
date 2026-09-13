export const SITE_BASE_URL =
	"https://api.printinghouseujjain.in";

export const SITE_CONFIG_URL =
	"https://api.printinghouseujjain.in/assets/config.json";

export const SITE_CONFIG_PROXY =
	"/api/site-config";

export type SiteReview = {
	name: string;
	description: string;
	photos: string[];
	timestamp: string;
	star_count: number;
};

export type SiteConfig = {
	strip: string[];

	hero: string[];

	popup: {
		enabled: boolean;
		image: string;
	};

	reviews: SiteReview[];
};

/**
 * Converts a relative asset path from config.json
 * into a complete URL.
 *
 * Example:
 *
 * assets/main.png
 *
 * becomes:
 *
 * https://api.printinghouseujjain.in/assets/main.png
 */
export function assetUrl(
	path: string | null | undefined,
): string {
	if (!path) {
		return "";
	}

	if (/^https?:\/\//i.test(path)) {
		return path;
	}

	return `${SITE_BASE_URL}/${path.replace(
		/^\/+/,
		"",
	)}`;
}

/**
 * Fetch the live config through our own
 * Next.js API route.
 *
 * Browser:
 *
 * /api/site-config
 *
 * Server:
 *
 * https://api.printinghouseujjain.in/assets/config.json
 */
let configPromise: Promise<SiteConfig> | null =
	null;

export async function fetchSiteConfig(): Promise<SiteConfig> {
	if (!configPromise) {
		configPromise = fetch(
			SITE_CONFIG_PROXY,
			{
				cache: "no-store",
			},
		)
			.then(async (response) => {
				if (!response.ok) {
					throw new Error(
						`Failed to load site config (${response.status})`,
					);
				}

				const data =
					await response.json();

				return data as SiteConfig;
			})
			.catch((error) => {
				configPromise = null;

				throw error;
			});
	}

	return configPromise;
}