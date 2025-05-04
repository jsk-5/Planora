
import { Navbar } from "../components/navbar";
import { TripPlannerWrapper } from "../components/trip-planner";

import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen p-4 md:p-8">
        <TripPlannerWrapper />
      </main>
    </>
  );
}
