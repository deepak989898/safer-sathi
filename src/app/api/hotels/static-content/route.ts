import { z } from "zod";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { isTripJackHotelProviderEnabled } from "@/lib/tripjack-hotels/config";
import { applyCatalogEnrichmentToDetail } from "@/lib/tripjack-hotels/detail-content";
import { resolveHotelStaticEnrichment } from "@/lib/tripjack-hotels/static-content-service";
import type { NormalizedHotelDetail } from "@/lib/tripjack-hotels/types";

const schema = z.object({
  hid: z.union([z.string(), z.number()]),
});

export async function POST(request: Request) {
  try {
    if (!isTripJackHotelProviderEnabled()) {
      return apiError("TripJack hotel provider is disabled", 503);
    }

    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const { enrichment, source } = await resolveHotelStaticEnrichment(parsed.data.hid);
    if (!enrichment) {
      return apiSuccess({
        content: null,
        source,
      });
    }

    const shell: NormalizedHotelDetail = {
      correlationId: "",
      hotelId: parsed.data.hid,
      name: enrichment.name ?? "Hotel",
      reviewHash: "",
      location:
        [enrichment.address, enrichment.cityName, enrichment.stateName, enrichment.countryName]
          .filter(Boolean)
          .join(", ") || "",
      starRating: enrichment.starRating ?? enrichment.rating ?? null,
      amenities: enrichment.facilities ?? [],
      description: "",
      images: enrichment.imageUrls ?? [],
      checkIn: "",
      checkOut: "",
      guestSummary: "",
      bookingNotes: [],
      options: [],
      currency: "INR",
      nationality: "106",
      fetchedAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
    };

    const content = applyCatalogEnrichmentToDetail(shell, enrichment);

    return apiSuccess({
      content: {
        name: content.name,
        location: content.location,
        address: content.address,
        cityName: content.cityName,
        stateName: content.stateName,
        countryName: content.countryName,
        starRating: content.starRating,
        propertyType: content.propertyType,
        contact: content.contact,
        description: content.description,
        amenities: content.amenities,
        amenityGroups: content.amenityGroups,
        policies: content.policies,
        checkInPolicy: content.checkInPolicy,
        checkOutPolicy: content.checkOutPolicy,
        geolocation: content.geolocation,
        images: content.images,
      },
      source,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Hotel static content failed";
    console.error("[hotels/static-content]", message);
    return apiError(message, 500);
  }
}
