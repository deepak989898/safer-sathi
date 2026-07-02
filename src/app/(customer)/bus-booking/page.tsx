import { redirect } from "next/navigation";

/** Legacy route — keep working links from header/footer. */
export default function LegacyBusBookingPage() {
  redirect("/bus/search");
}
