import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import StoreLayout from "@/components/StoreLayout";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
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
		images: ["https://api.printinghouseujjain.in/assets/logo.png"],
	},

	icons: {
		icon: "https://api.printinghouseujjain.in/assets/logo.png",
	},
};

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
