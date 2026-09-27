import { structuredData } from "@/lib/structured-data";
import "./globals.css";
import Analytics from "@/components/Analytics";
import SiteFooter from "@/components/SiteFooter";
import type { Metadata } from "next";

const SITE_URL =
  process.env.SITE_URL?.replace(/\/$/, "") || "https://freelementimages.site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "Freelement Images",
    template: "%s | Freelement Images",
  },

  description:
    "Build unique images from free visual elements. Choose backgrounds, trees, flowers, buildings and more, then move, resize, rotate and download your creation.",

  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined },

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
        url: "/social-preview.jpg",
        width: 1200,
        height: 630,
        alt: "An illustrated alpine lake landscape",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Freelement Images",
    description:
      "Build unique images from free visual elements — no prompts required.",
    images: ["/social-preview.jpg"],
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
        <Analytics />

        {/* Website structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: structuredData(websiteSchema),
          }}
        />

        {/* Organization / logo structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: structuredData(organizationSchema),
          }}
        />

        {children}

        <SiteFooter />
      </body>
    </html>
  );
}
