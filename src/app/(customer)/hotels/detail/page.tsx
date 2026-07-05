import { redirect } from "next/navigation";

export default async function HotelDetailLegacyPage({
  searchParams,
}: {
  searchParams: Promise<{ hotelId?: string }>;
}) {
  const params = await searchParams;
  if (params.hotelId) {
    redirect(`/hotels/detail/${encodeURIComponent(params.hotelId)}`);
  }
  redirect("/hotels/search");
}
