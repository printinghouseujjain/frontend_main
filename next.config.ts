import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "api.printinghouseujjain.in",
				pathname: "/assets/**",
			},
		],
	},
};

export default nextConfig;
