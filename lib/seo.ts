import { site, socials } from "@/lib/content";

/**
 * Structured data (JSON-LD, schema.org) that tells search engines and AI
 * answers who this site belongs to: one Person, known by two names, with the
 * same profiles everywhere. Google uses it to connect the site, the name and
 * the GitHub/LinkedIn profiles into one "entity". Check it at
 * https://validator.schema.org/ or https://search.google.com/test/rich-results
 */

export const personId = `${site.url}/#person`;
const websiteId = `${site.url}/#website`;

export const person = {
  "@type": "Person",
  "@id": personId,
  name: site.fullName,
  alternateName: site.brand,
  url: `${site.url}/`,
  image: `${site.url}/images/portrait.webp`,
  description: site.description,
  knowsAbout: [
    "Cloud security",
    "Amazon Web Services",
    "Oracle Cloud Infrastructure",
    "Linux server administration",
    "DevSecOps",
    "Security monitoring",
    "Wazuh",
    "Infrastructure as code",
  ],
  sameAs: socials.map((s) => s.href),
};

export const siteGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": websiteId,
      url: `${site.url}/`,
      name: site.brand,
      alternateName: site.fullName,
      description: site.description,
      inLanguage: "en",
      publisher: { "@id": personId },
    },
    person,
  ],
};

/**
 * Serialise for a <script type="application/ld+json"> tag. Escaping "<" stops
 * any value containing "</script>" from ending the tag early (an XSS trick),
 * as the Next.js JSON-LD guide recommends.
 */
export function jsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
