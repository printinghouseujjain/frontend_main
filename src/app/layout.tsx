import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { headers } from "next/headers";

import StoreLayout from "@/components/StoreLayout";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const defaultMetadata: Metadata = {
    metadataBase: new URL("https://printinghouseujjain.in"),

    title: {
        default: "Printing House Ujjain | You Think... We Create...",
        template: "%s | Printing House Ujjain",
    },

    description:
        "Shop personalized gifts, custom gifts, photo products, mugs, cushions, t-shirts and more from Printing House Ujjain. We also offer professional printing services and bulk printing solutions in Ujjain.",

    keywords: [
        "Printing House Ujjain",
        "printing house ujjain",
        "personalized gifts Ujjain",
        "custom gifts Ujjain",
        "gift shop Ujjain",
        "personalized gifts",
        "custom printing Ujjain",
        "printing services Ujjain",
        "custom t-shirts Ujjain",
        "photo frames Ujjain",
        "personalized mugs Ujjain",
        "photo gifts Ujjain",
        "custom gifts",
        "corporate gifts Ujjain",
        "bulk printing Ujjain",
        "custom printing",
        "personalized products",
    ],

    authors: [
        {
            name: "Printing House Ujjain",
        },
    ],

    creator: "Printing House Ujjain",

    applicationName: "Printing House Ujjain",

    robots: {
        index: true,
        follow: true,
    },

    openGraph: {
        type: "website",
        url: "https://printinghouseujjain.in",
        title: "Printing House Ujjain | You Think... We Create...",
        description:
            "Discover personalized gifts, custom products and professional printing services from Printing House Ujjain.",
        siteName: "Printing House Ujjain",
        locale: "en_IN",

        images: [
            {
                url: "https://api.printinghouseujjain.in/assets/logo.png",
                alt: "Printing House Ujjain",
            },
        ],
    },

    twitter: {
        card: "summary_large_image",
        title: "Printing House Ujjain | You Think... We Create...",
        description:
            "Personalized gifts, custom products and professional printing services from Printing House Ujjain.",
        images: [
            "https://api.printinghouseujjain.in/assets/logo.png",
        ],
    },
};

export async function generateMetadata(): Promise<Metadata> {
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") ?? "";

    // Only match /product/12, /product/97, etc.
    const match = pathname.match(/^\/product\/([1-9]\d*)\/?$/);

    // /product, /shop, /cart, etc. use default metadata
    if (!match) {
        return defaultMetadata;
    }

    const productId = match[1];

    try {
        const formData = new FormData();
        formData.append("product_id", productId);

        const response = await fetch(
            "https://api.printinghouseujjain.in/api/products",
            {
                method: "POST",
                body: formData,
                cache: "no-store",
            }
        );

        if (!response.ok) {
            return defaultMetadata;
        }

        const data = await response.json();

        if (
            data.status !== 200 ||
            !data.product ||
            String(data.product.id) !== productId ||
            !data.product.name
        ) {
            return defaultMetadata;
        }

        const product = data.product;

        const description =
            typeof product.description === "string" &&
                product.description.trim()
                ? product.description
                    .replace(/\s+/g, " ")
                    .trim()
                    .slice(0, 200)
                : defaultMetadata.description!;

        const image = product.primary_photo_path
            ? `https://api.printinghouseujjain.in/assets/products/${product.primary_photo_path}`
            : "https://api.printinghouseujjain.in/assets/logo.png";

        const url = `https://printinghouseujjain.in/product/${productId}`;

        return {
            ...defaultMetadata,

            title: product.name,
            description,

            openGraph: {
                ...defaultMetadata.openGraph,
                type: "website",
                url,
                title: product.name,
                description,
                images: [
                    {
                        url: image,
                        alt: product.name,
                    },
                ],
            },

            twitter: {
                ...defaultMetadata.twitter,
                card: "summary_large_image",
                title: product.name,
                description,
                images: [image],
            },
        };
    } catch {
        return defaultMetadata;
    }
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
            <body className="min-h-screen bg-[#FFF9F4]">
                {/*
					IMPORTANT:
					Do NOT put padding/margin here.

					StoreLayout handles the customer-site
					header/announcement spacing.

					/admin has its own AdminLayout and therefore
					does not inherit store spacing.
				*/}

                {children}

                <StoreLayout />
            </body>
        </html>
    );
}
