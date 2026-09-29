"use client";

import React from "react";
import Link from "next/link";
import {
	ArrowUpRight,
	Gift,
	Heart,
	MapPin,
	Phone,
	Printer,
	Sparkles,
	Type,
	Image as ImageIcon,
	PenLine,
} from "lucide-react";

const BUSINESS_NAME = "Printing House";

const TAGLINE =
	"Personalized gifts & professional printing for every occasion.";

const PHONE = "+91 88278 82713";
const PHONE_LINK = "tel:+918827882713";

const ADDRESS =
	"52 Avantipura Chouraha, Ankpat Marg, Awantipura, Patel Nagar, Ujjain, Madhya Pradesh 456001";

const PLUS_CODE = "5QVG+XX Ujjain, Madhya Pradesh";

const GOOGLE_MAPS_LINK = "https://maps.app.goo.gl/Hyq4dH7pJr4MHyEc9";

const GOOGLE_MAP_EMBED_URL =
	"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3667.3229749241036!2d75.77482057472209!3d23.194897479053417!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3963754350ff0305%3A0xfe6d07810f1b559e!2sPrinting%20House!5e0!3m2!1sen!2sin!4v1790621641636!5m2!1sen!2sin";

const VALUES = [
	{
		number: "01",
		title: "Personal",
		description:
			"Your product should carry something that belongs to you: a name, a photo, a message.",
	},
	{
		number: "02",
		title: "Thoughtful",
		description:
			"The smallest details can change how something feels, so we pay attention to them.",
	},
	{
		number: "03",
		title: "Simple",
		description:
			"Creating something meaningful should not feel complicated, from first idea to finished product.",
	},
	{
		number: "04",
		title: "Memorable",
		description:
			"The things we make are meant to live beyond the moment they were made for.",
	},
];

const PERSONALISE_WITH = [
	{ icon: Type, label: "A name" },
	{ icon: ImageIcon, label: "A photograph" },
	{ icon: PenLine, label: "A message" },
	{ icon: Sparkles, label: "A design" },
];

export default function AboutPage() {
	return (
		<main className="min-h-screen bg-[#FBF9F7] pt-[112px] text-[#2E2E2E] sm:pt-[120px]">
			<style>{`
				@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap');

				.font-display {
					font-family: 'Fraunces', Georgia, serif;
				}
			`}</style>

			{/* =========================================================
			    HERO
			========================================================= */}
			<section className="relative overflow-hidden">
				{/* background wash */}
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_85%_20%,#F7D6BF_0%,transparent_70%)] opacity-70" />
				<div className="pointer-events-none absolute -left-40 bottom-0 h-[420px] w-[420px] rounded-full bg-[#85161B]/[0.06] blur-3xl" />

				<div className="relative mx-auto max-w-6xl px-5 pt-14 sm:px-8 sm:pt-20">
					<div className="grid items-center gap-16 pb-16 sm:pb-24 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
						{/* LEFT */}
						<div>
							<div className="flex items-center gap-3">
								<span className="h-px w-10 bg-[#85161B]" />
								<p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#85161B]">
									About {BUSINESS_NAME}
								</p>
							</div>

							<h1 className="font-display mt-7 text-[52px] font-semibold leading-[0.98] tracking-[-0.04em] sm:text-7xl lg:text-[96px]">
								Gifts that
								<br />
								carry{" "}
								<span className="relative inline-block italic text-[#85161B]">
									your story.
									<svg
										viewBox="0 0 300 12"
										className="absolute -bottom-2 left-0 h-3 w-full text-[#F7D6BF]"
										preserveAspectRatio="none"
										aria-hidden="true"
									>
										<path
											d="M2 8 C 60 1, 120 1, 180 6 S 260 10, 298 3"
											fill="none"
											stroke="currentColor"
											strokeWidth="4"
											strokeLinecap="round"
										/>
									</svg>
								</span>
							</h1>

							<p className="mt-9 max-w-lg text-lg leading-8 text-[#5A514C] sm:text-xl sm:leading-9">
								{TAGLINE}
							</p>

							<div className="mt-9 flex flex-wrap items-center gap-3">
								<Link
									href="/shop"
									className="group inline-flex items-center gap-2 rounded-full bg-[#85161B] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_28px_-10px_rgba(133,22,27,0.7)] transition hover:bg-[#6D1116]"
								>
									Explore the shop
									<ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
								</Link>

								<a
									href={PHONE_LINK}
									className="inline-flex items-center gap-2 rounded-full border border-[#DCD3CD] bg-white/70 px-6 py-3.5 text-sm font-semibold backdrop-blur transition hover:border-[#85161B] hover:text-[#85161B]"
								>
									<Phone className="h-4 w-4" />
									{PHONE}
								</a>
							</div>
						</div>

						{/* RIGHT — COLLAGE */}
						<div className="relative mx-auto h-[440px] w-full max-w-md sm:h-[500px] lg:max-w-none">
							{/* name tile */}
							<div className="absolute left-0 top-4 w-[62%] -rotate-6 rounded-[1.75rem] bg-[#85161B] p-6 text-white shadow-[0_30px_50px_-25px_rgba(133,22,27,0.8)] transition duration-500 hover:-rotate-3 sm:p-7">
								<div className="flex items-center justify-between">
									<Sparkles className="h-5 w-5 text-[#F7D6BF]" />
									<span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#F7D6BF]">
										A name
									</span>
								</div>

								<p className="font-display mt-10 text-3xl font-semibold italic leading-none tracking-[-0.02em] sm:text-4xl">
									Made for you
								</p>

								<div className="mt-6 h-px w-full bg-white/20" />
								<p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-white/50">
									Personalised gifting
								</p>
							</div>

							{/* photo frame */}
							<div className="absolute right-0 top-20 w-[50%] rotate-6 rounded-2xl bg-white p-3 pb-6 shadow-[0_30px_50px_-25px_rgba(46,46,46,0.45)] ring-1 ring-[#E8DED7] transition duration-500 hover:rotate-3 sm:top-24">
								<div className="flex aspect-square items-center justify-center rounded-xl bg-gradient-to-br from-[#F7D6BF] to-[#F3B99A]">
									<Heart className="h-9 w-9 text-[#85161B]" />
								</div>

								<p className="font-display mt-4 text-center text-base italic text-[#5A514C]">
									A photograph
								</p>
							</div>

							{/* printed card */}
							<div className="absolute bottom-6 left-[12%] w-[64%] rotate-2 rounded-[1.75rem] border border-[#E8DED7] bg-white p-6 shadow-[0_30px_50px_-25px_rgba(46,46,46,0.35)] transition duration-500 hover:rotate-0 sm:p-7">
								<div className="flex items-center gap-3">
									<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7D6BF] text-[#85161B]">
										<Printer className="h-5 w-5" />
									</div>

									<div>
										<p className="text-sm font-semibold">
											Professional printing
										</p>
										<p className="text-xs text-[#918781]">
											Designs &amp; business needs
										</p>
									</div>
								</div>
							</div>

							{/* location chip */}
							<div className="absolute -bottom-2 right-2 flex items-center gap-2.5 rounded-full border border-[#E8DED7] bg-white py-2 pl-2 pr-4 shadow-lg">
								<span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#85161B] text-white">
									<MapPin className="h-4 w-4" />
								</span>
								<span className="text-sm font-semibold">Ujjain, MP</span>
							</div>
						</div>
					</div>

					{/* INFO STRIP */}
					<div className="grid gap-px overflow-hidden rounded-t-3xl border border-b-0 border-[#E8DED7] bg-[#E8DED7] sm:grid-cols-3">
						{[
							["What we make", "Personalised gifts"],
							["And also", "Professional printing"],
							["Based in", "Ujjain, Madhya Pradesh"],
						].map(([label, value]) => (
							<div key={label} className="bg-white/80 px-6 py-5 backdrop-blur">
								<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#918781]">
									{label}
								</p>
								<p className="font-display mt-1 text-lg font-semibold tracking-[-0.01em]">
									{value}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* =========================================================
			    OUR STORY
			========================================================= */}
			<section className="bg-white">
				<div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
					<div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
						<div>
							<p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#85161B]">
								Our story
							</p>

							<h2 className="font-display mt-5 text-4xl font-semibold leading-[1.08] tracking-[-0.03em] sm:text-5xl">
								One place for ideas worth making.
							</h2>
						</div>

						<div className="space-y-6 text-base leading-8 text-[#6B625D] sm:text-lg sm:leading-9">
							<p>
								{BUSINESS_NAME} brings personalised gifting and professional
								printing together under one roof. The idea is simple: create
								something that feels like yours.
							</p>

							<p>
								From photographs and names to designs, messages and business
								requirements, we turn ideas into things people can hold, use and
								keep. A gift becomes different when it carries your story.
							</p>

							<div className="flex flex-wrap gap-2.5 pt-2">
								{PERSONALISE_WITH.map(({ icon: Icon, label }) => (
									<span
										key={label}
										className="inline-flex items-center gap-2 rounded-full border border-[#E8DED7] bg-[#FBF9F7] px-4 py-2 text-sm font-medium text-[#2E2E2E]"
									>
										<Icon className="h-4 w-4 text-[#85161B]" />
										{label}
									</span>
								))}
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* =========================================================
			    WHAT WE DO
			========================================================= */}
			<section className="bg-[#FBF9F7]">
				<div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
					<div className="max-w-2xl">
						<p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#85161B]">
							What we do
						</p>

						<h2 className="font-display mt-5 text-4xl font-semibold leading-[1.08] tracking-[-0.03em] sm:text-5xl">
							Two things, done with care.
						</h2>
					</div>

					<div className="mt-14 grid gap-5 md:grid-cols-2">
						<div className="group relative overflow-hidden rounded-[2rem] bg-[#F7D6BF] p-8 transition hover:shadow-xl sm:p-10">
							<div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/30" />

							<div className="relative">
								<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#85161B] text-white">
									<Gift className="h-6 w-6" />
								</div>

								<h3 className="font-display mt-10 text-3xl font-semibold tracking-[-0.02em]">
									Personalised gifting
								</h3>

								<p className="mt-4 max-w-sm text-base leading-7 text-[#5E534D]">
									Add your own photo, name, message or design and turn a product
									into something personal.
								</p>

								<Link
									href="/shop"
									className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#85161B]"
								>
									Browse gifts
									<ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
								</Link>
							</div>
						</div>

						<div className="group relative overflow-hidden rounded-[2rem] border border-[#E8DED7] bg-white p-8 transition hover:shadow-xl sm:p-10">
							<div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[#85161B]/[0.05]" />

							<div className="relative">
								<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F7D6BF] text-[#85161B]">
									<Printer className="h-6 w-6" />
								</div>

								<h3 className="font-display mt-10 text-3xl font-semibold tracking-[-0.02em]">
									Professional printing
								</h3>

								<p className="mt-4 max-w-sm text-base leading-7 text-[#6B625D]">
									Printing for designs, business requirements and everyday
									needs.
								</p>

								<a
									href={PHONE_LINK}
									className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#85161B]"
								>
									Talk to us about your requirement
									<ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
								</a>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* =========================================================
			    WHAT WE BELIEVE
			========================================================= */}
			<section className="bg-white">
				<div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
					<div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
						<div className="max-w-2xl">
							<p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#85161B]">
								What we believe
							</p>

							<h2 className="font-display mt-5 text-4xl font-semibold leading-[1.08] tracking-[-0.03em] sm:text-5xl">
								The details behind the{" "}
								<span className="italic text-[#85161B]">difference.</span>
							</h2>
						</div>

						<p className="max-w-sm text-base leading-8 text-[#6B625D]">
							The experience matters as much as the final product.
						</p>
					</div>

					<div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{VALUES.map((value) => (
							<div
								key={value.title}
								className="group rounded-3xl border border-[#E8DED7] bg-[#FBF9F7] p-7 transition hover:-translate-y-1 hover:border-[#85161B]/30 hover:bg-white hover:shadow-lg"
							>
								<span className="font-display text-4xl font-semibold text-[#85161B]/25 transition group-hover:text-[#85161B]">
									{value.number}
								</span>

								<h3 className="font-display mt-8 text-2xl font-semibold tracking-[-0.02em]">
									{value.title}
								</h3>

								<p className="mt-3 text-sm leading-7 text-[#6B625D]">
									{value.description}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* =========================================================
			    VISIT US
			========================================================= */}
			<section className="bg-[#FBF9F7]">
				<div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
					<div className="max-w-2xl">
						<p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#85161B]">
							Visit us
						</p>

						<h2 className="font-display mt-5 text-4xl font-semibold leading-[1.08] tracking-[-0.03em] sm:text-5xl">
							Find us in <span className="italic text-[#85161B]">Ujjain.</span>
						</h2>
					</div>

					<div className="mt-14 overflow-hidden rounded-[2rem] border border-[#E8DED7] bg-white shadow-sm lg:grid lg:grid-cols-[0.75fr_1.25fr]">
						<div className="flex flex-col justify-between p-8 sm:p-10">
							<div>
								<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7D6BF] text-[#85161B]">
									<MapPin className="h-5 w-5" />
								</div>

								<p className="font-display mt-6 text-2xl font-semibold tracking-[-0.02em]">
									{BUSINESS_NAME}
								</p>

								<p className="mt-4 text-sm leading-7 text-[#6B625D]">
									{ADDRESS}
								</p>

								<div className="mt-6 rounded-2xl bg-[#FBF9F7] px-4 py-3">
									<p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#918781]">
										Plus Code
									</p>

									<p className="mt-1 text-sm font-semibold">{PLUS_CODE}</p>
								</div>
							</div>

							<div className="mt-10 space-y-3">
								<a
									href={PHONE_LINK}
									className="flex items-center gap-3 rounded-2xl border border-[#E8DED7] px-4 py-3.5 text-sm font-semibold transition hover:border-[#85161B] hover:text-[#85161B]"
								>
									<Phone className="h-4 w-4 text-[#85161B]" />
									{PHONE}
								</a>

								<a
									href={GOOGLE_MAPS_LINK}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center justify-between rounded-2xl bg-[#85161B] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#6D1116]"
								>
									Get directions
									<ArrowUpRight className="h-4 w-4" />
								</a>
							</div>
						</div>

						<div className="min-h-[340px] border-t border-[#E8DED7] lg:min-h-[480px] lg:border-l lg:border-t-0">
							<iframe
								src={GOOGLE_MAP_EMBED_URL}
								width="100%"
								height="100%"
								style={{ border: 0 }}
								loading="lazy"
								allowFullScreen
								referrerPolicy="no-referrer-when-downgrade"
								title="Printing House location"
								className="h-full min-h-[340px] w-full lg:min-h-[480px]"
							/>
						</div>
					</div>
				</div>
			</section>

			{/* =========================================================
			    CLOSING BAND
			========================================================= */}
			<section className="px-5 pb-16 sm:px-8 sm:pb-24">
				<div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[#85161B] px-8 py-14 text-white sm:px-14 sm:py-16">
					<div className="absolute -bottom-28 -right-16 h-80 w-80 rounded-full border border-white/10" />
					<div className="absolute -bottom-12 right-10 h-48 w-48 rounded-full border border-white/10" />

					<div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
						<div>
							<h2 className="font-display max-w-xl text-3xl font-semibold leading-[1.1] tracking-[-0.03em] sm:text-5xl">
								<span style={{ color: '#FFFF' }}>Make it personal. </span>
								<span className="italic text-[#F7D6BF]">
									Make it meaningful.
								</span>
							</h2>

							<p className="mt-4 max-w-md text-base leading-7 text-white/70">
								Have an idea or a printing requirement? Call us or browse what
								we make.
							</p>
						</div>

						<div className="flex flex-col gap-3 sm:flex-row">
							<Link
								href="/shop"
								className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-[#85161B] transition hover:bg-[#F7D6BF]"
							>
								Explore the shop
								<ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
							</Link>

							<a
								href={PHONE_LINK}
								className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-6 py-3.5 text-sm font-semibold transition hover:bg-white/10"
							>
								<Phone className="h-4 w-4" />
								{PHONE}
							</a>
						</div>
					</div>
				</div>
			</section>
		</main>
	);
}
