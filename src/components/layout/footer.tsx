import { Footer as GovFooter } from "@govtech-bb/react";

const FOOTER_LINKS = [
  { label: "Home", href: "/" },
  { label: "alpha.gov.bb", href: "https://alpha.gov.bb" },
  { label: "Barbados Water Authority", href: "https://barbadoswaterauthority.com/service-disruptions/" },
];

export const Footer = () => (
  <GovFooter
    copyrightText={`© ${new Date().getFullYear()} Government of Barbados`}
    links={FOOTER_LINKS}
    logoAlt="Barbados Coat of Arms"
    logoSrc="/images/coat-of-arms.png"
  />
);
