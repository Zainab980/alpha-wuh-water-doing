import { Link, Logo, OfficialBanner, StatusBanner, Text } from "@govtech-bb/react";
import NextLink from "next/link";

export const Header = () => (
  <div>
    <div className="bg-blue-100">
      <div className="container">
        <OfficialBanner
          className="[&>div]:px-0"
          imageAlt=""
          imageSrc="/images/coat-of-arms.png"
          showLearnMore={false}
        />
      </div>
    </div>
    <div className="bg-blue-10">
      <div className="container">
        <StatusBanner className="px-0" variant="alpha">
          <Text as="p">
            This is a new service. Your{" "}
            <Link href="https://alpha.gov.bb/tell-us" variant="secondary">
              feedback
            </Link>{" "}
            will help us make it better.
          </Text>
        </StatusBanner>
      </div>
    </div>
    <header className="relative bg-yellow-100">
      <div className="container">
        <div className="flex items-center gap-3 py-4 lg:py-6">
          <Link aria-label="Go to the water notices home" as={NextLink} href="/">
            <Logo aria-hidden="true" className="h-7 w-auto lg:h-9" />
          </Link>
        </div>
      </div>
    </header>
  </div>
);
