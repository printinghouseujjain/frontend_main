"use client";

import { useEffect } from "react";

import CategorySection from "@/components/CategorySection";
import Hero from "../components/Hero";
import BestSellerSection from "../components/BestSellerSection";
import PrintingServices from "../components/PrintingServices";
import HowItWorks from "../components/HowItWorks";
import Features from "../components/Features";
import BulkOrderCTA from "../components/BulkOrderCTA";
import Testimonials from "../components/Testimonials";
import Container from "../components/Container";
import OfferPopup from "../components/OfferPopup";
import ExploreSocials from "@/components/ExploreSocials";
import TrackOrder from "@/components/OrderTracking";
// const API_URL = "https://api.printinghouseujjain.in";

export default function Home() {
	// useEffect(() => {
	//  const getCsrfToken = async () => {
	//      try {
	//          const response = await fetch(`${API_URL}/api/csrf`, {
	//              method: "GET",
	//              credentials: "include",
	//          });

	//          if (!response.ok) {
	//              throw new Error("Failed to get CSRF token");
	//          }

	//          // Get CSRF token from response header
	//          const csrfToken = response.headers.get("X-CSRF-Token");

	//          if (!csrfToken) {
	//              throw new Error("CSRF token not found in response headers");
	//          }

	//          // Store token in session storage
	//          sessionStorage.setItem("csrfToken", csrfToken);

	//          console.log("CSRF Token:", csrfToken);
	//          console.log("CSRF token stored in sessionStorage");
	//      } catch (error) {
	//          console.error("CSRF initialization failed:", error);
	//      }
	//  };

	//  getCsrfToken();
	// }, []);

	return (
		<>
			{/* Popup */}
			<OfferPopup />

			<main
				className="w-full px-2.5 sm:px-4 md:px-6 lg:px-8 pt-[112px]
                    sm:pt-[120px]"
			>
				<Hero />

				<Container from="Home">
					<CategorySection />
					<BestSellerSection />
					{/* <PrintingServices /> */}
					<HowItWorks />
					<Features />
					<BulkOrderCTA />
					<Testimonials />
					<TrackOrder />
					<ExploreSocials />
				</Container>
			</main>
		</>
	);
}
