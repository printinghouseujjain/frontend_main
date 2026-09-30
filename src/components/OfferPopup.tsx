"use client";

import { useEffect, useState } from "react";

import { X } from "lucide-react";

import { assetUrl, fetchSiteConfig } from "./siteConfig";

/*
 * Config format:
 *
 * "popup": {
 *   "enabled": true,
 *   "image": "assets/home/popup/popup_6.png",
 *   "link": "https://www.printinghouseujjain.in/shop"
 * }
 *
 * `popup.link` is used exactly as given. Only `popup.image`
 * goes through assetUrl(), because it is a relative asset path.
 */

type PopupConfig = {
	enabled?: boolean;
	image?: string;
	link?: string;
};

/* Normalises popup.link without changing a valid absolute URL */
function resolvePopupLink(value: unknown): string {
	if (typeof value !== "string") {
		return "";
	}

	const link = value.trim();

	if (!link) {
		return "";
	}

	/* Absolute URL, used as-is */
	if (/^https?:\/\//i.test(link)) {
		return link;
	}

	/* Site-relative path, e.g. "/shop" */
	if (link.startsWith("/")) {
		return link;
	}

	/* "www.example.com/shop" without a protocol */
	if (/^www\./i.test(link)) {
		return `https://${link}`;
	}

	return "";
}

/* True when the link points to this same website (www or not) */
function isSameSite(link: string): boolean {
	if (link.startsWith("/")) {
		return true;
	}

	try {
		const target = new URL(link).hostname.replace(/^www\./i, "");

		const current = window.location.hostname.replace(/^www\./i, "");

		return target === current;
	} catch {
		return false;
	}
}

export default function OfferPopup() {
	const [isOpen, setIsOpen] = useState(false);

	const [image, setImage] = useState("");

	const [link, setLink] = useState("");

	useEffect(() => {
		let mounted = true;

		fetchSiteConfig()
			.then((config) => {
				if (!mounted) {
					return;
				}

				const popup = (config as { popup?: PopupConfig }).popup;

				const popupImage = assetUrl(popup?.image);

				setImage(popupImage);

				setLink(resolvePopupLink(popup?.link));

				setIsOpen(popup?.enabled === true && Boolean(popupImage));
			})
			.catch((error) => {
				console.error("Failed to load popup config:", error);
			});

		return () => {
			mounted = false;
		};
	}, []);

	if (!image || !isOpen) {
		return null;
	}

	/* Links to our own site open in the same tab, external ones in a new tab */
	const sameSite = link ? isSameSite(link) : false;

	return (
		<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 px-4 backdrop-blur-[2px]">
			{/*
			 * max-h caps the card so a tall offer image on a short
			 * viewport can't push the close button out of view;
			 * the image scrolls internally instead.
			 */}
			<div className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl">
				<button
					type="button"
					onClick={() => setIsOpen(false)}
					aria-label="Close offer"
					/*
					 * Inside the card, with a safe-area floor so it stays
					 * clear of notches and dynamic islands.
					 */
					className="absolute right-3 top-3 z-20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#333] shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition-all duration-200 hover:scale-110 hover:text-[#85161B] hover:shadow-[0_6px_20px_rgba(0,0,0,0.3)] active:scale-95"
					style={{
						top: "max(0.75rem, env(safe-area-inset-top))",
						right: "max(0.75rem, env(safe-area-inset-right))",
					}}
				>
					<X size={20} strokeWidth={2.2} />
				</button>

				<div className="overflow-y-auto">
					{link ? (
						<a
							href={link}
							{...(sameSite
								? { onClick: () => setIsOpen(false) }
								: { target: "_blank", rel: "noopener noreferrer" })}
						>
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src={image}
								alt="Special Offer"
								className="block h-auto w-full object-contain"
							/>
						</a>
					) : (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={image}
							alt="Special Offer"
							className="block h-auto w-full object-contain"
						/>
					)}
				</div>
			</div>
		</div>
	);
}