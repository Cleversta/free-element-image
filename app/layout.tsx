import "./globals.css";
import Script from "next/script";
import SiteFooter from "@/components/SiteFooter";
import type { Metadata } from "next";

const SITE_URL =
  process.env.SITE_URL?.replace(/\/$/, "") ||
  "https://freelementimages.site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "Freelement Images",
    template: "%s | Freelement Images",
  },

  description:
    "Build unique images from free visual elements. Choose backgrounds, trees, flowers, buildings and more, then move, resize, rotate and download your creation.",

  applicationName: "Freelement Images",

  keywords: [
    "free image creator",
    "image maker",
    "scene creator",
    "free visual elements",
    "image elements",
    "PNG elements",
    "SVG elements",
    "free graphics",
    "online image creator",
    "scene builder",
    "Freelement Images",
  ],

  creator: "Freelement Images",
  publisher: "Freelement Images",

  alternates: {
    canonical: "/",
  },

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },

  openGraph: {
    title: "Freelement Images",
    description:
      "Build unique images from free visual elements — choose a scene, add objects, customize them and download your creation.",
    url: SITE_URL,
    siteName: "Freelement Images",
    locale: "en_US",
    type: "website",

    images: [
      {
        url: "/logo.png",
        alt: "Freelement Images",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Freelement Images",
    description:
      "Build unique images from free visual elements — no prompts required.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Freelement Images",
    url: `${SITE_URL}/`,
    description:
      "Build unique images from free visual elements. Choose backgrounds and objects, customize them and download your creation.",
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Freelement Images",
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/logo.png`,
  };

  return (
    <html lang="en">
      <body>
        {/* Umami Analytics */}
        <Script
          src="https://cloud.umami.is/script.js"
          data-website-id="3fe95ba5-2c12-4bc1-9a65-4e1f9cff06de"
          strategy="afterInteractive"
        />

        {/* Website structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema),
          }}
        />

        {/* Organization / logo structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />

        {children}

        <SiteFooter />
      </body>
    </html>
  );
}