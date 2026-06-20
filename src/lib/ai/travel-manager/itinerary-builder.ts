import type { Locale } from "@/types";

export interface ItineraryDay {
  day: number;
  title: string;
  titleHi: string;
  description: string;
  descriptionHi: string;
  meals?: string;
  stay?: string;
}

export function buildDayItinerary(input: {
  destination: string;
  pickupCity: string;
  durationDays: number;
  places: string[];
  activityNames: string[];
  hotelName?: string;
  mealsLabel: string;
  locale: Locale;
}): ItineraryDay[] {
  const dest = input.destination;
  const pickup = input.pickupCity;
  const days: ItineraryDay[] = [];
  const spots = [...input.places];
  const acts = [...input.activityNames];
  const hotel = input.hotelName ?? `${dest} Hotel`;

  for (let d = 1; d <= input.durationDays; d++) {
    if (d === 1) {
      days.push({
        day: 1,
        title: `Day 1 — ${pickup} to ${dest}`,
        titleHi: `दिन 1 — ${pickup} से ${dest}`,
        description: `Morning departure from ${pickup}. Scenic drive/flight to ${dest}. Hotel check-in at ${hotel}. Evening local exploration.`,
        descriptionHi: `सुबह ${pickup} से प्रस्थान। ${dest} पहुँचकर ${hotel} में चेक-इन। शाम को स्थानीय सैर।`,
        meals: input.mealsLabel,
        stay: hotel,
      });
      continue;
    }

    if (d === input.durationDays) {
      days.push({
        day: d,
        title: `Day ${d} — Return to ${pickup}`,
        titleHi: `दिन ${d} — ${pickup} वापसी`,
        description: `Morning checkout. Souvenir shopping if time permits. Return journey to ${pickup}. Trip ends with happy memories.`,
        descriptionHi: `सुबह चेक-आउट। ${pickup} की वापसी। यादगार यात्रा समाप्त।`,
        meals: "Breakfast",
        stay: "—",
      });
      continue;
    }

    const spot = spots[(d - 2) % Math.max(spots.length, 1)] ?? `${dest} Sightseeing`;
    const act = acts[(d - 2) % Math.max(acts.length, 1)];
    const actLine = act ? ` Activity: ${act}.` : "";

    days.push({
      day: d,
      title: `Day ${d} — ${spot}`,
      titleHi: `दिन ${d} — ${spot}`,
      description: `Full day at ${spot}.${actLine} Professional driver & vehicle included. Return to hotel by evening.`,
      descriptionHi: `पूरा दिन ${spot} पर.${act ? ` गतिविधि: ${act}.` : ""} शाम तक होटल वापसी।`,
      meals: input.mealsLabel,
      stay: hotel,
    });
  }

  return days;
}

export function formatItineraryText(
  itinerary: ItineraryDay[],
  locale: Locale
): string {
  return itinerary
    .map((day) => {
      const title = locale === "hi" ? day.titleHi : day.title;
      const desc = locale === "hi" ? day.descriptionHi : day.description;
      return `${title}\n${desc}${day.meals ? `\n🍽 ${day.meals}` : ""}${day.stay && day.stay !== "—" ? `\n🏨 ${day.stay}` : ""}`;
    })
    .join("\n\n");
}
