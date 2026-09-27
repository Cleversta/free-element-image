import ManageSubmission from "@/components/ManageSubmission";
export const metadata = {
  title: "Manage your submission",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function ManagePage() {
  return <ManageSubmission />;
}
