import "./globals.css";
import SiteFooter from "@/components/SiteFooter";
export const metadata = {
  title: "Freelement Images",
  description:
    "Build unique images from free visual elements — no prompts required.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
