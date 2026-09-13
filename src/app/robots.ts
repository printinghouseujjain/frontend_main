import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: [
                "/login",
                "/orders",
                "/wishlist",
                "/cart",
                "/profile",
                "/admin",
            ],
        },

        sitemap: "https://printinghouseujjain.in/sitemap.xml",
    };
}