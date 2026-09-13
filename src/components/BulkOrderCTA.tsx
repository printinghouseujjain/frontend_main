"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Building2, Check, MessageCircle } from "lucide-react";

const BENEFITS = [
  "Custom branding",
  "Bulk pricing",
  "Premium quality",
  "Fast delivery",
];

const WHATSAPP_NUMBER = "918827882713";

export default function BulkOrderCTA() {
  const whatsappMessage =
    "Hi Printing House! I’m interested in placing a bulk/corporate order. I’d like to know more about your customization options, pricing, minimum order quantity, and delivery timelines.";

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    whatsappMessage,
  )}`;

  return (
    <section
      aria-labelledby="bulk-order-heading"
      className="py-14 sm:py-16 lg:py-20"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="grid overflow-hidden rounded-3xl bg-[#F8F5F2] lg:grid-cols-[1fr_1fr]">
          {/* IMAGE */}

          <div className="relative aspect-square overflow-hidden">
            <img
              src="https://api.printinghouseujjain.in/assets/bulk.png"
              alt="Corporate gifting products"
              loading="lazy"
              className="
								absolute
								inset-0
								h-full
								w-full
								object-cover
								transition-transform
								duration-700
								hover:scale-105
							"
            />

            {/* Category Badge */}

            <div
              className="
								absolute
								left-5
								top-5
								flex
								items-center
								gap-2
								rounded-full
								bg-white/95
								px-4
								py-2
								text-xs
								font-semibold
								text-[#2E2E2E]
								shadow-sm
								backdrop-blur-sm
								sm:left-7
								sm:top-7
							"
            >
              <Building2
                size={14}
                aria-hidden="true"
                className="text-[#85161B]"
              />

              <span>Corporate Gifting</span>
            </div>

            {/* Floating Caption */}

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="
								absolute
								bottom-5
								left-5
								right-5
								rounded-2xl
								border
								border-white/30
								bg-[#85161B]
								p-4
								text-white
								shadow-xl
								backdrop-blur-md
								sm:bottom-7
								sm:left-7
								sm:right-7
							"
            >
              <p className="text-xs font-medium text-white/60">
                Make an impression
              </p>

              <p className="mt-1 text-base font-semibold leading-snug sm:text-lg">
                Branded gifts your team will actually love.
              </p>
            </motion.div>
          </div>

          {/* CONTENT */}

          <div
            className="
							flex
							flex-col
							justify-center
							px-6
							py-10
							sm:px-9
							sm:py-12
							lg:px-12
							lg:py-14
						"
          >
            {/* Eyebrow */}

            <div
              className="
								mb-4
								flex
								items-center
								gap-2
								text-xs
								font-semibold
								uppercase
								tracking-[0.16em]
								text-[#85161B]
							"
            >
              <span aria-hidden="true" className="h-px w-7 bg-[#85161B]" />

              <span>For Businesses</span>
            </div>

            {/* Heading */}

            <h2
              id="bulk-order-heading"
              className="
								max-w-lg
								text-3xl
								font-bold
								leading-tight
								tracking-tight
								text-[#2E2E2E]
								sm:text-4xl
							"
            >
              Make your next <span className="text-[#85161B]">bulk order</span>{" "}
              memorable.
            </h2>

            {/* Description */}

            <p
              className="
								mt-4
								max-w-lg
								text-sm
								leading-7
								text-[#2E2E2E]/60
								sm:text-base
							"
            >
              From employee gifts to event merchandise, we create personalized
              products that represent your brand beautifully.
            </p>

            {/* Benefits */}

            <ul
              aria-label="Corporate gifting benefits"
              className="
								mt-7
								grid
								grid-cols-1
								gap-3
								sm:grid-cols-2
							"
            >
              {BENEFITS.map((benefit) => (
                <li
                  key={benefit}
                  className="
										flex
										items-center
										gap-2.5
										text-sm
										font-medium
										text-[#2E2E2E]/75
									"
                >
                  <span
                    aria-hidden="true"
                    className="
											flex
											h-6
											w-6
											shrink-0
											items-center
											justify-center
											rounded-full
											bg-[#F7D6BF]
											text-[#85161B]
										"
                  >
                    <Check size={13} strokeWidth={2.5} />
                  </span>

                  {benefit}
                </li>
              ))}
            </ul>

            {/* Divider */}

            <div aria-hidden="true" className="my-8 h-px bg-[#2E2E2E]/10" />

            {/* WhatsApp */}

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Contact us on WhatsApp"
                className="
									inline-flex
									items-center
									justify-center
									gap-2
									rounded-xl
									border
									border-[#2E2E2E]/15
									px-6
									py-3.5
									text-sm
									font-semibold
									text-[#2E2E2E]
									transition-all
									duration-200
									hover:bg-white
									hover:shadow-sm
									focus-visible:outline-none
									focus-visible:ring-2
									focus-visible:ring-[#85161B]
									focus-visible:ring-offset-2
								"
              >
                <MessageCircle
                  size={16}
                  aria-hidden="true"
                  className="text-[#25D366]"
                />
                WhatsApp Us
                <ArrowRight size={15} aria-hidden="true" />
              </a>
            </div>

            {/* Reassurance */}

            <p className="mt-5 text-xs text-[#2E2E2E]/40">
              Get a personalized quote based on your quantity and requirements.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
