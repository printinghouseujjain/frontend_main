"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Users,
  ChevronRight,
  UserRound,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  Package,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import AdminHeader from "@/components/AdminHeader";

type User = {
  id: number;
  name: string;
  phone: string;
  email: string;
  is_reseller: string;
  is_reseller_active: string;
  credit_eligibility: string;
};

type Product = {
  id: number;
  name: string;
  description: string;
  primary_photo_path: string;
  market_price: string;
  selling_price: string;
  reseller_price: string;
  custom_reseller_price?: string | null;
  in_stock: string;
};

type Reseller = {
  user: User;
  products: Product[];
};

type ApiResponse = {
  status: number;
  message: string;
  data: Reseller[];
};

export default function ResellersPage() {
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchResellers = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch("/api/admin/resellers", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to fetch resellers.");
      }

      if (!Array.isArray(data?.data)) {
        throw new Error("Invalid reseller data received.");
      }

      setResellers(data.data);
    } catch (err) {
      console.error("Fetch resellers error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load reseller details.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchResellers();
  }, []);

  const filteredResellers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return resellers;
    }

    return resellers.filter(({ user, products }) => {
      return (
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.phone?.toLowerCase().includes(query) ||
        String(user.id).includes(query) ||
        String(products?.length || 0).includes(query)
      );
    });
  }, [resellers, search]);

  const totalAssignedProducts = resellers.reduce(
    (total, reseller) => total + (reseller.products?.length || 0),
    0,
  );

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#85161B] text-white shadow-sm">
                <Users size={20} />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                  Resellers
                </h1>
                <p className="text-sm text-gray-500">
                  Manage reseller pricing and assigned products
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void fetchResellers(true)}
            disabled={refreshing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Total Resellers
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {resellers.length}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-[#85161B]">
                <Users size={21} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Assigned Products
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {totalAssignedProducts}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-[#85161B]">
                <Package size={21} />
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reseller by name, email, phone or ID..."
              className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#85161B] focus:bg-white focus:ring-2 focus:ring-[#85161B]/10"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle size={19} className="mt-0.5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load resellers</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <RefreshCw
              size={28}
              className="mx-auto animate-spin text-[#85161B]"
            />

            <p className="mt-4 text-sm font-medium text-gray-700">
              Loading resellers...
            </p>
          </div>
        ) : filteredResellers.length === 0 ? (
          /* Empty */
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
              <Users size={25} className="text-gray-400" />
            </div>

            <h3 className="mt-4 text-base font-semibold text-gray-900">
              {search ? "No resellers found" : "No resellers available"}
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              {search
                ? "Try changing your search query."
                : "There are currently no reseller accounts."}
            </p>
          </div>
        ) : (
          /* Reseller list */
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* Desktop heading */}
            <div className="hidden border-b border-gray-200 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid md:grid-cols-[1.5fr_1.5fr_1fr_1fr_auto] md:items-center md:gap-4">
              <span>Reseller</span>
              <span>Contact</span>
              <span>Status</span>
              <span>Products</span>
              <span />
            </div>

            <div className="divide-y divide-gray-100">
              {filteredResellers.map((reseller) => {
                const { user, products } = reseller;

                const isActive =
                  String(user.is_reseller_active).toLowerCase() === "yes";

                return (
                  <Link
                    key={user.id}
                    href={`/admin/resellers/${user.id}`}
                    className="group block transition hover:bg-gray-50"
                  >
                    <div className="grid grid-cols-1 gap-4 px-5 py-5 md:grid-cols-[1.5fr_1.5fr_1fr_1fr_auto] md:items-center md:gap-4">
                      {/* User */}
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 font-semibold text-[#85161B]">
                          {user.name?.charAt(0)?.toUpperCase() || (
                            <UserRound size={18} />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-900">
                            {user.name || "Unnamed Reseller"}
                          </p>

                          <p className="mt-0.5 text-xs text-gray-500">
                            Reseller ID: #{user.id}
                          </p>
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="space-y-1.5">
                        <div className="flex min-w-0 items-center gap-2 text-sm text-gray-600">
                          <Mail
                            size={14}
                            className="shrink-0 text-gray-400"
                          />
                          <span className="truncate">{user.email}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone
                            size={14}
                            className="shrink-0 text-gray-400"
                          />
                          <span>{user.phone}</span>
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                            <CheckCircle2 size={13} />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                            <XCircle size={13} />
                            Inactive
                          </span>
                        )}
                      </div>

                      {/* Products */}
                      <div>
                        <span className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700">
                          <Package size={15} />
                          {products?.length || 0}
                        </span>
                      </div>

                      {/* Arrow */}
                      <div className="flex items-center justify-end">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition group-hover:border-[#85161B]/20 group-hover:bg-red-50 group-hover:text-[#85161B]">
                          <ChevronRight size={18} />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}