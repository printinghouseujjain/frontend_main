"use client";

import React from "react";
import Link from "next/link";

const BUSINESS_NAME = "Printing House";
const PHONE = "+91 88278 82713";
const ADDRESS =
	"52 Avantipura Chouraha, Ankpat Marg, Awantipura, Patel Nagar, Ujjain, Madhya Pradesh 456001";

const SECTIONS = [
	{ id: "shipping", title: "Shipping & Delivery Policy" },
	{ id: "cancellation", title: "Cancellation Policy" },
	{ id: "returns", title: "Return Policy" },
	{ id: "refunds", title: "Refund Policy" },
	{ id: "privacy", title: "Privacy Policy" },
	{ id: "terms", title: "Terms & Conditions" },
	{ id: "contact", title: "Contact" },
] as const;

export default function PoliciesPage() {
	return (
		<main className="min-h-screen bg-[#FBF9F7] pt-[112px] text-[#2E2E2E] sm:pt-[120px]">
			<style>{`
				@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap');
				.font-display {
					font-family: 'Fraunces', Georgia, serif;
				}
			`}</style>

			<section className="relative overflow-hidden">
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_85%_20%,#F7D6BF_0%,transparent_70%)] opacity-70" />

				<div className="relative mx-auto max-w-4xl px-5 pb-20 pt-14 sm:px-8 sm:pt-20">
					<p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#85161B]">
						{BUSINESS_NAME}
					</p>

					<h1 className="font-display mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
						Store policies
					</h1>

					<p className="mt-4 max-w-2xl text-base leading-7 text-[#2E2E2E]/65">
						These policies explain how {BUSINESS_NAME} handles orders, delivery,
						cancellations, returns, refunds, and personal information. Please
						read them carefully before placing an order. For questions, contact
						us using the details at the end of this page.
					</p>

					<nav className="mt-8 flex flex-wrap gap-2">
						{SECTIONS.map((section) => (
							<a
								key={section.id}
								href={`#${section.id}`}
								className="rounded-full border border-[#E8DED7] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#2E2E2E]/70 transition hover:border-[#85161B]/30 hover:text-[#85161B]"
							>
								{section.title}
							</a>
						))}
					</nav>

					<div className="mt-12 space-y-10">
						<section
							id="shipping"
							className="rounded-2xl border border-[#E8DED7] bg-white p-6 sm:p-8"
						>
							<h2 className="text-xl font-semibold">
								Shipping & Delivery Policy
							</h2>
							<div className="mt-4 space-y-3 text-sm leading-7 text-[#2E2E2E]/70">
								<p>
									{BUSINESS_NAME} ships customised gifts and printed products
									from Ujjain, Madhya Pradesh. Delivery timelines depend on the
									product, personalisation required, and the destination.
								</p>
								<p>
									Estimated delivery information, including any applicable
									delivery fee, is shown during checkout. Delivery fees may vary
									by product. Products marked with a delivery fee of ₹0 are
									eligible for free delivery as displayed at the time of
									purchase.
								</p>
								<p>
									We make every reasonable effort to dispatch orders on time.
									Delays may occur due to customisation, courier operations,
									weather, public holidays, or circumstances beyond our control.
									You can track your order from the Track Order page or from My
									Orders after signing in.
								</p>
								<p>
									Please ensure the delivery address and contact number are
									accurate. We are not responsible for failed delivery caused by
									incorrect or incomplete address details provided by the
									customer.
								</p>
							</div>
						</section>

						<section
							id="cancellation"
							className="rounded-2xl border border-[#E8DED7] bg-white p-6 sm:p-8"
						>
							<h2 className="text-xl font-semibold">Cancellation Policy</h2>
							<div className="mt-4 space-y-3 text-sm leading-7 text-[#2E2E2E]/70">
								<p>
									You may request cancellation while an order is still pending
									and has not been accepted for production. Once an order is
									accepted, packed, or put into customisation, cancellation may
									no longer be available because work on personalised items
									often begins immediately.
								</p>
								<p>
									{BUSINESS_NAME} may cancel an order in limited situations,
									including suspected fraud, pricing or stock errors, inability
									to fulfil a customisation request, or incomplete customer
									information. If we cancel an order for a reason on our side,
									we will inform you and process any eligible refund in
									accordance with the Refund Policy.
								</p>
							</div>
						</section>

						<section
							id="returns"
							className="rounded-2xl border border-[#E8DED7] bg-white p-6 sm:p-8"
						>
							<h2 className="text-xl font-semibold">Return Policy</h2>
							<div className="mt-4 space-y-3 text-sm leading-7 text-[#2E2E2E]/70">
								<p>
									Most products sold by {BUSINESS_NAME} are personalised or made
									to order. For this reason, returns are generally not accepted
									for change of mind, incorrect artwork supplied by the
									customer, or dissatisfaction with a design that matches the
									approved customisation.
								</p>
								<p>
									You may be eligible to request a return or replacement if the
									item received is damaged in transit, is defective, or is
									materially different from the product you ordered. Please
									contact us promptly with your order ID, clear photographs, and
									a description of the issue so we can assess the request.
								</p>
								<p>
									Approval of any return, replacement, or store credit is at the
									discretion of {BUSINESS_NAME} after review of the product
									condition and supporting information.
								</p>
							</div>
						</section>

						<section
							id="refunds"
							className="rounded-2xl border border-[#E8DED7] bg-white p-6 sm:p-8"
						>
							<h2 className="text-xl font-semibold">Refund Policy</h2>
							<div className="mt-4 space-y-3 text-sm leading-7 text-[#2E2E2E]/70">
								<p>
									Refunds are generally not available. {BUSINESS_NAME} does,
									however, consider refunds in selected eligible situations
									according to this policy and after reviewing the order.
								</p>
								<p>Eligible situations may include, without limitation:</p>
								<ul className="list-disc space-y-1 pl-5">
									<li>the product arrived damaged;</li>
									<li>an incorrect product was delivered;</li>
									<li>the product is defective in materials or workmanship;</li>
									<li>
										the store cancels an order that cannot be fulfilled; or
									</li>
									<li>
										another situation that {BUSINESS_NAME} expressly approves
										after reviewing your request.
									</li>
								</ul>
								<p>
									Refunds are not typically issued for change of mind, delays
									outside our reasonable control, or customisation that matches
									the information, files, or instructions provided by the
									customer.
								</p>
								<p>
									Where a refund is approved, the amount may be full or partial
									depending on the circumstances. Approved refunds are processed
									to the original payment method where possible. Bank or payment
									provider timelines may apply.
								</p>
							</div>
						</section>

						<section
							id="privacy"
							className="rounded-2xl border border-[#E8DED7] bg-white p-6 sm:p-8"
						>
							<h2 className="text-xl font-semibold">Privacy Policy</h2>
							<div className="mt-4 space-y-3 text-sm leading-7 text-[#2E2E2E]/70">
								<p>
									We collect information needed to process orders and support
									your account, such as name, phone number, delivery address,
									order details, and files you upload for customisation.
								</p>
								<p>
									This information is used to fulfil orders, provide customer
									support, improve our services, and communicate about your
									purchases. We do not sell your personal information. Photos
									and artwork uploaded for an order are used only to complete
									that order and are handled in line with our operational
									practices.
								</p>
								<p>
									We may share information with delivery partners, payment
									providers, and service vendors solely as needed to complete
									your transaction. Please contact us if you wish to update
									account details or ask how your information is used.
								</p>
							</div>
						</section>

						<section
							id="terms"
							className="rounded-2xl border border-[#E8DED7] bg-white p-6 sm:p-8"
						>
							<h2 className="text-xl font-semibold">Terms & Conditions</h2>
							<div className="mt-4 space-y-3 text-sm leading-7 text-[#2E2E2E]/70">
								<p>
									By browsing this website or placing an order, you agree to
									these terms and the related policies on this page. You confirm
									that the information you provide is accurate and that you have
									the right to use any text, photos, or designs submitted for
									customisation.
								</p>
								<p>
									Product images, colours, and layouts are illustrative.
									Finished personalised items may vary slightly due to printing,
									materials, and hand finishing. Prices, delivery fees, and
									offers are as displayed at checkout and may change from time
									to time.
								</p>
								<p>
									{BUSINESS_NAME} is not liable for indirect or consequential
									loss, or for issues arising from customer-supplied artwork,
									incorrect specifications, or misuse of products. Our liability
									in connection with an order is limited to the amount paid for
									that order, except where applicable law requires otherwise.
								</p>
								<p>
									These terms are governed by the laws of India. Disputes are
									subject to the jurisdiction of the courts at Ujjain, Madhya
									Pradesh, unless applicable consumer law provides otherwise.
								</p>
							</div>
						</section>

						<section
							id="contact"
							className="rounded-2xl border border-[#E8DED7] bg-white p-6 sm:p-8"
						>
							<h2 className="text-xl font-semibold">Contact</h2>
							<div className="mt-4 space-y-3 text-sm leading-7 text-[#2E2E2E]/70">
								<p>
									For policy questions, order issues, or eligible refund
									requests, please include your order ID and supporting photos
									where relevant.
								</p>
								<p>
									<strong className="font-semibold text-[#2E2E2E]">
										{BUSINESS_NAME}
									</strong>
									<br />
									{ADDRESS}
									<br />
									Phone / WhatsApp:{" "}
									<a href="tel:+918827882713" className="text-[#85161B]">
										{PHONE}
									</a>
								</p>
								<p>
									You can also visit{" "}
									<Link href="/about-us" className="font-semibold text-[#85161B]">
										About Us
									</Link>{" "}
									or{" "}
									<Link
										href="/order-tracking"
										className="font-semibold text-[#85161B]"
									>
										Track Order
									</Link>
									.
								</p>
							</div>
						</section>
					</div>
				</div>
			</section>
		</main>
	);
}
