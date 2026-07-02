import { Heading, Text } from "@govtech-bb/react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { OutageExplorer } from "@/components/OutageExplorer";
import { resultFromFlash } from "@/lib/result";

export const metadata: Metadata = {
  title: "Wuh Water Doing? — Barbados water outages near you",
  description:
    "See current Barbados Water Authority outages and planned shut-offs on a map. Pick your area to find out if your water is affected and when it should be back.",
};

export default async function HomePage() {
  const flash = (await cookies()).get("flash")?.value;
  const result = resultFromFlash(flash);

  return (
    <>
      {/* Hero — yellow section */}
      <section className="border-yellow-00 border-b-4 bg-yellow-100">
        <div className="container">
          <div className="max-w-prose space-y-4 py-8">
            <Heading as="h1">Wuh water doing?</Heading>
            <Text as="p">
              When the water goes, it's hard to know if your area is affected, or
              when it's coming back. This map brings every Barbados Water
              Authority notice into one place. Pick your area to see what's
              happening near you.
            </Text>
          </div>
        </div>
      </section>

      {/* Explorer — white section */}
      <section>
        <div className="container">
          <div className="py-8">
            <OutageExplorer flash={result} />
          </div>
        </div>
      </section>
    </>
  );
}
