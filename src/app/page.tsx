import { Heading, Text } from "@govtech-bb/react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { OutageExplorer } from "@/components/OutageExplorer";
import { resultFromFlash } from "@/lib/result";

export const metadata: Metadata = {
  title: "Check water outages near you",
  description:
    "See current water service notices published by the Barbados Water Authority. Choose a parish or use your location to check your area.",
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
            <Text as="p" className="font-semibold text-blue-100" size="caption">
              Wuh water doing?
            </Text>
            <Heading as="h1">Check water outages near you</Heading>
            <Text as="p">
              See current water service notices published by the Barbados Water
              Authority. Choose a parish or use your location to check your area.
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
