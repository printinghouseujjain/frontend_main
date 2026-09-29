import React from "react";
import type { Metadata } from "next";

import AdminNavBar from "@/components/AdminNavBar";
import AdminHeader from "@/components/AdminHeader";

export const metadata: Metadata = {
	title: "Admin — Printing House Ujjain",
};

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen bg-[#FBF9F7]">
			{/* Fixed Admin Sidebar */}
			<AdminNavBar />

			{/* Admin Content */}
			<main className="min-h-screen ml-0 lg:ml-[286px]">
				<AdminHeader />
				{children}
			</main>
		</div>
	);
}
