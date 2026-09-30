"use client";

import CategorySection from "@/components/CategorySection";
import Hero from "../components/Hero";
import BestSellerSection from "../components/BestSellerSection";
import HowItWorks from "../components/HowItWorks";
import Features from "../components/Features";
import BulkOrderCTA from "../components/BulkOrderCTA";
import Testimonials from "../components/Testimonials";
import Container from "../components/Container";
import OfferPopup from "../components/OfferPopup";
import ExploreSocials from "@/components/ExploreSocials";
import TrackOrder from "@/components/OrderTracking";

import ShowcaseSection from "@/components/ShowCase";
import WatchAndBuy from "@/components/WatchAndBuy";
import SocialVideos from "@/components/SocialVideos";

export default function Home() {
	return (
		<>
			{/* Popup */}
			<OfferPopup />

			<main
				className="
					w-full
					px-2.5
					pt-[112px]
					sm:px-4
					sm:pt-[120px]
					md:px-6
					lg:px-8
				"
			>
				<Hero />

				<Container from="Home">
					<CategorySection />

					<BestSellerSection />

					{/* New: Config-driven showcase */}
					<ShowcaseSection />

					<HowItWorks />

					<Features />

					<BulkOrderCTA />

					{/* New: Product videos */}
					<WatchAndBuy />

					<Testimonials />

					{/* New: Config-driven social videos */}
					<SocialVideos />

					<TrackOrder />

					<ExploreSocials />
				</Container>
			</main>
		</>
	);
}
