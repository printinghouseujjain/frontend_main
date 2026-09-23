"use client";

import { useEffect, useState } from "react";

import { X } from "lucide-react";

import { assetUrl, fetchSiteConfig } from "./siteConfig";

export default function OfferPopup() {
	const [isOpen, setIsOpen] = useState(false);

	const [enabled, setEnabled] = useState(false);

	const [image, setImage] = useState("");

	useEffect(() => {
		let mounted = true;

		fetchSiteConfig()
			.then((config) => {
				if (!mounted) {
					return;
				}

				const popupEnabled = config.popup?.enabled === true;

				const popupImage = assetUrl(config.popup?.image);

				setEnabled(popupEnabled);

				setImage(popupImage);

				setIsOpen(popupEnabled && Boolean(popupImage));
			})
			.catch((error) => {
				console.error("Failed to load popup config:", error);
			});

		return () => {
			mounted = false;
		};
	}, []);

	if (!enabled || !image || !isOpen) {
		return null;
	}

	return (
		<div
			className="
                fixed
                inset-0
                z-[9999]
                flex
                items-center
                justify-center
                bg-black/55
                px-4
                backdrop-blur-[2px]
            "
		>
			{/*
			 * max-h caps the card so a tall offer image on a short
			 * (e.g. landscape mobile) viewport can't push the close
			 * button above or below the visible frame — the image
			 * scrolls internally instead.
			 */}
			<div className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl">
				<button
					type="button"
					onClick={() => setIsOpen(false)}
					aria-label="Close offer"
					/*
					 * Positioned INSIDE the card (positive inset) rather
					 * than hanging off its edge with negative offsets.
					 * The old -right-2/-top-2 overhang could get pushed
					 * past the visible viewport — or under a notch/
					 * dynamic island's safe-area cutout — on narrow or
					 * notched devices. The env(safe-area-inset-*) floor
					 * keeps it clear of that cutout on devices that have
					 * one, while never sitting closer than 0.75rem from
					 * the card edge on devices that don't.
					 */
					className="
                        absolute
                        right-3
                        top-3
                        z-20
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        bg-white
                        text-[#333]
                        shadow-[0_4px_16px_rgba(0,0,0,0.25)]
                        transition-all
                        duration-200
                        hover:scale-110
                        hover:text-[#85161B]
                        hover:shadow-[0_6px_20px_rgba(0,0,0,0.3)]
                        active:scale-95
                    "
					style={{
						top: "max(0.75rem, env(safe-area-inset-top))",
						right: "max(0.75rem, env(safe-area-inset-right))",
					}}
				>
					<X size={20} strokeWidth={2.2} />
				</button>

				<div className="overflow-y-auto">
					<img
						src={image}
						alt="Special Offer"
						className="
                            block
                            h-auto
                            w-full
                            object-contain
                        "
					/>
				</div>
			</div>
		</div>
	);
}
