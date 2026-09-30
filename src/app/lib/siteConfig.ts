export type SiteReview = {
	name: string;
	description: string;
	photos: string[];
	timestamp: string;
	star_count: number;
};

export type SiteConfig = {
	strip?: string[];

	hero?: string[];

	showcase?: string[];

	videos?: string[];

	watch_and_buy?: Record<string, string>;

	popup?: {
		enabled?: boolean;
		image?: string;
		link?: string;
	};

	reviews?: SiteReview[];
};

export async function fetchSiteConfig(): Promise<SiteConfig> {
	const response = await fetch("/api/site-config", {
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error(`Failed to load site configuration (${response.status})`);
	}

	return response.json();
}

export function assetUrl(path: string | null | undefined): string {
	if (!path) {
		return "";
	}

	if (/^https?:\/\//i.test(path)) {
		return path;
	}

	return `https://api.printinghouseujjain.in/${path.replace(/^\/+/, "")}`;
}
