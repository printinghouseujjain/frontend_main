"use client";

import React from "react";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

const PHONE_DISPLAY = "+91 88278 82713";
const PHONE_TEL = "+918827882713";
const WHATSAPP_HREF = "https://wa.me/918827882713?text=Hi";
const EMAIL = "printinghouse.999@gmail.com";
const ADDRESS =
	"52 Avantipura Chouraha, Ankpat Marg, Awantipura, Patel Nagar, Ujjain, Madhya Pradesh 456001";

const ACCOUNT_LINKS = [
	{ href: "/order-tracking", label: "Track Order" },
	{ href: "/orders", label: "My Orders" },
	{ href: "/profile", label: "Profile" },
	{ href: "/login", label: "Login" },
];

const COMPANY_LINKS = [
	{ href: "/about-us", label: "About Us" },
	{ href: "/policies", label: "Policies" },
];

export default function SiteFooter() {
	const currentYear = new Date().getFullYear();

	return (
		<footer className="mt-20 w-full bg-[#A23939] text-white">
			<div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8 lg:py-14">
				<div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-10">
					<div className="min-w-0">
						<Link
							href="/"
							className="inline-block text-2xl font-semibold tracking-tight transition hover:text-white/90"
						>
							Printing House
						</Link>

						<p className="mt-4 max-w-xs text-sm leading-6 text-white/80">
							Personalized gifts & professional printing for every occasion.
						</p>
					</div>

					<div className="min-w-0">
						<h3
							className="mb-5 text-base font-semibold text-white"
							style={{ color: "white" }}
						>
							Contact
						</h3>

						<div className="space-y-3.5 text-sm text-white/80">
							<a
								href={`tel:${PHONE_TEL}`}
								className="group flex items-start gap-2.5 transition hover:text-white"
							>
								<Phone size={16} className="mt-0.5 shrink-0" />
								<span>Call · {PHONE_DISPLAY}</span>
							</a>

							<a
								href={WHATSAPP_HREF}
								target="_blank"
								rel="noopener noreferrer"
								className="group flex items-start gap-2.5 transition hover:text-white"
							>
								<FaWhatsapp size={17} className="mt-0.5 shrink-0" />
								<span>WhatsApp</span>
							</a>

							<a
								href={`mailto:${EMAIL}`}
								className="group flex items-start gap-2.5 transition hover:text-white"
							>
								<Mail size={16} className="mt-0.5 shrink-0" />
								<span>{EMAIL}</span>
							</a>

							<p className="flex items-start gap-2.5">
								<MapPin size={16} className="mt-0.5 shrink-0" />
								<span>{ADDRESS}</span>
							</p>
						</div>
					</div>

					<div className="min-w-0">
						<h3
							className="mb-5 text-base font-semibold text-white"
							style={{ color: "white" }}
						>
							Account
						</h3>

						<ul className="space-y-2.5 text-sm text-white/80">
							{ACCOUNT_LINKS.map((item) => (
								<li key={item.href}>
									<Link
										href={item.href}
										className="transition hover:text-white"
									>
										{item.label}
									</Link>
								</li>
							))}
						</ul>
					</div>

					<div className="min-w-0">
						<h3
							className="mb-5 text-base font-semibold text-white"
							style={{ color: "white" }}
						>
							Company
						</h3>

						<ul className="space-y-2.5 text-sm text-white/80">
							{COMPANY_LINKS.map((item) => (
								<li key={item.href}>
									<Link
										href={item.href}
										className="transition hover:text-white"
									>
										{item.label}
									</Link>
								</li>
							))}
						</ul>
					</div>
				</div>

				<div className="mt-12 border-t border-white/20 pt-6">
					<div className="flex items-center justify-center text-center">
						<p className="text-xs text-white/65 sm:text-sm">
							© {currentYear} Printing House. All rights reserved.
						</p>
					</div>
				</div>
			</div>
		</footer>
	);
}
