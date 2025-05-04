"use client";

import { Navbar } from "@/components/navbar";
import { TripPlanner } from "@/components/trip-planner";
import { useSearchParams } from "next/navigation";

export default function TripPlannerPage() {
  const searchParams = useSearchParams();
  const shareId = searchParams.get("share");

  return (
    <>
      <Navbar />
      <main className="min-h-screen p-4 md:p-8">
        <TripPlanner />
      </main>
    </>
  );
}
