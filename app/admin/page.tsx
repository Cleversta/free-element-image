import OwnerReview from "@/components/OwnerReview";
export const metadata = {
  title: "Owner review",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function AdminPage() {
  return <OwnerReview />;
}
