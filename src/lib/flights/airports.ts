export interface FlightAirport {
  iata: string;
  city: string;
  airport: string;
  country: string;
  /** City / airport nicknames e.g. Bombay → Mumbai */
  aliases?: string[];
}

/** Major Indian airports + common international hubs for TripJack search. */
export const FLIGHT_AIRPORTS: FlightAirport[] = [
  { iata: "DEL", city: "Delhi", airport: "Indira Gandhi International", country: "India", aliases: ["New Delhi", "NCR"] },
  { iata: "BOM", city: "Mumbai", airport: "Chhatrapati Shivaji Maharaj International", country: "India", aliases: ["Bombay"] },
  { iata: "BLR", city: "Bengaluru", airport: "Kempegowda International", country: "India", aliases: ["Bangalore"] },
  { iata: "MAA", city: "Chennai", airport: "Chennai International", country: "India", aliases: ["Madras"] },
  { iata: "HYD", city: "Hyderabad", airport: "Rajiv Gandhi International", country: "India" },
  { iata: "CCU", city: "Kolkata", airport: "Netaji Subhas Chandra Bose International", country: "India", aliases: ["Calcutta"] },
  { iata: "GOI", city: "Goa", airport: "Manohar International / Dabolim", country: "India", aliases: ["Panaji", "Vasco"] },
  { iata: "PNQ", city: "Pune", airport: "Pune International", country: "India", aliases: ["Poona"] },
  { iata: "AMD", city: "Ahmedabad", airport: "Sardar Vallabhbhai Patel International", country: "India" },
  { iata: "COK", city: "Kochi", airport: "Cochin International", country: "India", aliases: ["Cochin", "Ernakulam"] },
  { iata: "LKO", city: "Lucknow", airport: "Chaudhary Charan Singh International", country: "India" },
  { iata: "JAI", city: "Jaipur", airport: "Jaipur International", country: "India" },
  { iata: "IXC", city: "Chandigarh", airport: "Chandigarh International", country: "India" },
  { iata: "ATQ", city: "Amritsar", airport: "Sri Guru Ram Dass Jee International", country: "India" },
  { iata: "TRV", city: "Thiruvananthapuram", airport: "Trivandrum International", country: "India", aliases: ["Trivandrum"] },
  { iata: "VNS", city: "Varanasi", airport: "Lal Bahadur Shastri International", country: "India", aliases: ["Banaras", "Benares"] },
  { iata: "NAG", city: "Nagpur", airport: "Dr. Babasaheb Ambedkar International", country: "India" },
  { iata: "PAT", city: "Patna", airport: "Jay Prakash Narayan International", country: "India" },
  { iata: "GAU", city: "Guwahati", airport: "Lokpriya Gopinath Bordoloi International", country: "India" },
  { iata: "IXB", city: "Bagdogra", airport: "Bagdogra Airport", country: "India", aliases: ["Siliguri", "Darjeeling"] },
  { iata: "SXR", city: "Srinagar", airport: "Sheikh ul-Alam International", country: "India" },
  { iata: "JDH", city: "Jodhpur", airport: "Jodhpur Airport", country: "India" },
  { iata: "UDR", city: "Udaipur", airport: "Maharana Pratap Airport", country: "India" },
  { iata: "IXE", city: "Mangaluru", airport: "Mangalore International", country: "India", aliases: ["Mangalore"] },
  { iata: "RPR", city: "Raipur", airport: "Swami Vivekananda Airport", country: "India" },
  { iata: "BHO", city: "Bhopal", airport: "Raja Bhoj Airport", country: "India" },
  { iata: "IXR", city: "Ranchi", airport: "Birsa Munda Airport", country: "India" },
  { iata: "VGA", city: "Vijayawada", airport: "Vijayawada Airport", country: "India" },
  { iata: "BBI", city: "Bhubaneswar", airport: "Biju Patnaik International", country: "India" },
  { iata: "IXM", city: "Madurai", airport: "Madurai Airport", country: "India" },
  { iata: "CJB", city: "Coimbatore", airport: "Coimbatore International", country: "India" },
  { iata: "TRZ", city: "Tiruchirappalli", airport: "Tiruchirappalli International", country: "India", aliases: ["Trichy"] },
  { iata: "SAG", city: "Shirdi", airport: "Shirdi Airport", country: "India" },
  { iata: "IXZ", city: "Port Blair", airport: "Veer Savarkar International", country: "India", aliases: ["Andaman"] },
  { iata: "DIB", city: "Dibrugarh", airport: "Dibrugarh Airport", country: "India" },
  { iata: "IMF", city: "Imphal", airport: "Imphal Airport", country: "India" },
  { iata: "AJL", city: "Aizawl", airport: "Lengpui Airport", country: "India" },
  { iata: "IXJ", city: "Jammu", airport: "Jammu Airport", country: "India" },
  { iata: "IXL", city: "Leh", airport: "Kushok Bakula Rimpochee Airport", country: "India", aliases: ["Ladakh"] },
  { iata: "DXB", city: "Dubai", airport: "Dubai International", country: "UAE" },
  { iata: "AUH", city: "Abu Dhabi", airport: "Zayed International", country: "UAE" },
  { iata: "DOH", city: "Doha", airport: "Hamad International", country: "Qatar" },
  { iata: "SIN", city: "Singapore", airport: "Changi Airport", country: "Singapore" },
  { iata: "BKK", city: "Bangkok", airport: "Suvarnabhumi Airport", country: "Thailand" },
  { iata: "KUL", city: "Kuala Lumpur", airport: "Kuala Lumpur International", country: "Malaysia" },
  { iata: "HKG", city: "Hong Kong", airport: "Hong Kong International", country: "Hong Kong" },
  { iata: "LHR", city: "London", airport: "Heathrow Airport", country: "United Kingdom", aliases: ["Heathrow"] },
  { iata: "JFK", city: "New York", airport: "John F. Kennedy International", country: "USA", aliases: ["NYC"] },
  { iata: "EWR", city: "Newark", airport: "Newark Liberty International", country: "USA", aliases: ["New York Newark"] },
  { iata: "CDG", city: "Paris", airport: "Charles de Gaulle Airport", country: "France" },
  { iata: "FRA", city: "Frankfurt", airport: "Frankfurt Airport", country: "Germany" },
  { iata: "AMS", city: "Amsterdam", airport: "Schiphol Airport", country: "Netherlands" },
  { iata: "ICN", city: "Seoul", airport: "Incheon International", country: "South Korea" },
  { iata: "NRT", city: "Tokyo", airport: "Narita International", country: "Japan" },
  { iata: "SYD", city: "Sydney", airport: "Sydney Airport", country: "Australia" },
  { iata: "MLE", city: "Malé", airport: "Velana International", country: "Maldives", aliases: ["Male", "Maldives"] },
  { iata: "CMB", city: "Colombo", airport: "Bandaranaike International", country: "Sri Lanka" },
  { iata: "KTM", city: "Kathmandu", airport: "Tribhuvan International", country: "Nepal" },
];

const IATA_INDEX = new Map<string, FlightAirport>(
  FLIGHT_AIRPORTS.map((airport) => [airport.iata.toUpperCase(), airport])
);

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function formatAirportLabel(airport: FlightAirport): string {
  return `${airport.city} (${airport.iata})`;
}

export function findAirportByIata(code: string): FlightAirport | undefined {
  const key = code.trim().toUpperCase();
  if (key.length !== 3) return undefined;
  return IATA_INDEX.get(key);
}

export function resolveAirportDisplayLabel(code: string, fallbackQuery?: string): string {
  const airport = findAirportByIata(code);
  if (airport) return formatAirportLabel(airport);
  const trimmed = fallbackQuery?.trim();
  if (trimmed) return trimmed;
  return code.toUpperCase();
}

export function isValidFlightAirportCode(code: string): boolean {
  return /^[A-Z]{3}$/.test(code.trim().toUpperCase()) && Boolean(findAirportByIata(code));
}

function scoreAirport(airport: FlightAirport, query: string): number {
  const iata = airport.iata.toLowerCase();
  const fields = [airport.city, airport.airport, airport.iata, ...(airport.aliases ?? [])].map(
    normalizeQuery
  );

  if (iata === query) return 100;
  if (iata.startsWith(query)) return 95;
  if (fields.some((field) => field === query)) return 90;
  if (fields.some((field) => field.startsWith(query))) return 80;
  if (fields.some((field) => field.includes(query))) return 60;
  if (query.length >= 2 && fields.some((field) => field.split(" ").some((word) => word.startsWith(query)))) {
    return 55;
  }
  return 0;
}

/** Search airports by city, airport name, IATA code, or alias. */
export function searchFlightAirports(query: string, limit = 8): FlightAirport[] {
  const q = normalizeQuery(query);
  if (!q) {
    return FLIGHT_AIRPORTS.filter((a) => a.country === "India").slice(0, limit);
  }

  const ranked = FLIGHT_AIRPORTS.map((airport) => ({
    airport,
    score: scoreAirport(airport, q),
  }))
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.airport.country.localeCompare(b.airport.country) ||
        a.airport.city.localeCompare(b.airport.city)
    );

  return ranked.slice(0, limit).map((item) => item.airport);
}

/** Resolve free-text input to IATA when user types an exact alias or code without picking dropdown. */
export function resolveAirportFromQuery(query: string): FlightAirport | undefined {
  const q = normalizeQuery(query);
  if (!q) return undefined;

  if (q.length === 3) {
    const byCode = findAirportByIata(q);
    if (byCode) return byCode;
  }

  const matches = searchFlightAirports(query, 1);
  if (matches.length === 1) {
    const only = matches[0];
    const exact =
      normalizeQuery(only.city) === q ||
      normalizeQuery(only.iata) === q ||
      (only.aliases ?? []).some((alias) => normalizeQuery(alias) === q);
    if (exact) return only;
  }

  return undefined;
}

export function validateFlightRoute(input: {
  fromCode: string;
  toCode: string;
  fromQuery?: string;
  toQuery?: string;
}): { ok: true; fromCode: string; toCode: string } | { ok: false; fromError?: string; toError?: string } {
  let fromCode = input.fromCode.trim().toUpperCase();
  let toCode = input.toCode.trim().toUpperCase();

  if (!isValidFlightAirportCode(fromCode) && input.fromQuery) {
    const resolved = resolveAirportFromQuery(input.fromQuery);
    if (resolved) fromCode = resolved.iata;
  }
  if (!isValidFlightAirportCode(toCode) && input.toQuery) {
    const resolved = resolveAirportFromQuery(input.toQuery);
    if (resolved) toCode = resolved.iata;
  }

  if (!fromCode || !isValidFlightAirportCode(fromCode)) {
    return { ok: false, fromError: "Select a valid departure city or airport" };
  }
  if (!toCode || !isValidFlightAirportCode(toCode)) {
    return { ok: false, toError: "Select a valid destination city or airport" };
  }
  if (fromCode === toCode) {
    return { ok: false, toError: "From and To cannot be the same" };
  }

  return { ok: true, fromCode, toCode };
}
