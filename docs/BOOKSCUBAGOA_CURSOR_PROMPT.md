# Cursor prompt — Bookscubagoa Goa hotels (from Safar Sathi Firebase)

Copy everything below the line into Cursor on the **bookscubagoa.com** project and run it.

---

## PROMPT (copy from here)

You are implementing **Goa hotel listing + Razorpay booking** on the Bookscubagoa website using **shared Firebase data from Safar Sathi**.

### Goal
- Display **Goa hotels only** (images, overview, facilities, star rating, rooms, prices).
- Allow customers to select dates/guests/room and **complete booking with Razorpay** (Bookscubagoa’s own Razorpay keys).
- UX should feel similar to Safar Sathi curated hotels: card grid → hotel detail → room select → guest form → Razorpay → confirmation email / My Bookings.
- Do **not** call TripJack or any VPS proxy from Bookscubagoa. Read catalog from Firebase only.

### Firebase project
Use the **same Firebase project as Safar Sathi** (same `NEXT_PUBLIC_FIREBASE_*` / Admin credentials the owner provides).  
Safar Sathi already exports Goa hotels into collection **`goaHotels`**.

### Collections you may use

| Collection | Purpose | Client access |
|---|---|---|
| **`goaHotels`** | Goa hotel catalog (ONLY collection to read for hotels) | Public **read** |
| **`goaHotelsMeta/sync`** | Last export stats (optional) | Public **read** |
| Your own `bookings` / `payments` (or `bookscubaBookings`) | Store Bookscubagoa bookings | Via **your** Admin SDK / API routes — never write to Safar Sathi `hotelBookings` or `tripjack*` |

### Collections you must NOT read/write from the browser
`tripjackHotelCatalog`, `tripjackHotelPriceCache`, `tripjackHotelDestinations`, `hotelBookings`, `users`, `packages`, `vehicles`, admin logs, etc.  
Firestore-only `goaHotels` (+ your own booking collections via server).

### Document ID pattern
- `goaHotels/{id}` where `id` = `tj_{tjHotelId}` (example: `tj_100002318951`)

### Document shape (`goaHotels`)

```ts
{
  id: string;                 // "tj_123"
  tjHotelId: number;
  name: string;
  slug: string;               // URL slug
  cityName: "Goa";
  cityKey: "goa";             // always goa — filter on this
  locality?: string;
  location: string;           // card location label
  address: string;
  description: string;        // overview
  facilities: string[];
  policies: string[];
  starRating: number | null;
  heroImage?: string;
  imageUrls: string[];
  images: string[];           // same as imageUrls for convenience
  priceFrom: number;          // cheapest per-night (or last known)
  currency: string;           // "INR"
  rooms: Array<{
    id: string;
    name: string;
    type: string;
    mealBasis: string;
    mealBasisLabel: string;
    pricePerNight: number;
    totalPrice: number;       // last snapshot stay total (may be multi-night)
    basePrice: number;
    taxes: number;
    currency: string;
    maxGuests: number;
    available: boolean;
    isRefundable: boolean;
    inclusions: string[];
    images: string[];
  }>;
  lastPricedAt?: string;
  contentSynced: boolean;
  websiteVisible: boolean;
  isDeleted: boolean;
  source: "tripjack";
  sharedFor: "bookscubagoa";
  updatedAt: string;
}
```

### How to fetch (client or server)

**List Goa hotels (cards):**
```ts
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";

const q = query(
  collection(db, "goaHotels"),
  where("cityKey", "==", "goa"),
  where("isDeleted", "==", false),
  where("websiteVisible", "==", true),
  orderBy("name"),
  limit(48)
);
const snap = await getDocs(q);
const hotels = snap.docs.map((d) => d.data());
```

If composite index is missing, fall back to:
```ts
where("cityKey", "==", "goa")
```
then filter `isDeleted` / `websiteVisible` in memory.

**Single hotel (detail):**
```ts
import { doc, getDoc } from "firebase/firestore";

const ref = doc(db, "goaHotels", `tj_${hid}`); // or by slug query
const snap = await getDoc(ref);
const hotel = snap.exists() ? snap.data() : null;
```

**By slug:**
```ts
query(collection(db, "goaHotels"), where("slug", "==", slug), limit(1))
```

### Display requirements (like Safar Sathi)
1. `/hotels` (or `/goa-hotels`) — grid cards: hero image, name, location, star rating, “From ₹priceFrom / night”, CTA View rooms.
2. `/hotels/[slug]` — gallery (`imageUrls`), overview (`description`), facilities, policies, room table from `rooms[]` with `pricePerNight` / meal basis / refundable.
3. If `rooms` is empty, still show hotel content and a clear message: “Rates updating — contact us / try again later”, and use `priceFrom` if > 0 as indicative price.
4. Booking: pick check-in/out + room → compute `amount = pricePerNight * nights` (or use room.totalPrice if you keep same night count as snapshot — prefer recompute from `pricePerNight * nights`).
5. Razorpay: create order on **Bookscubagoa server** with Bookscubagoa Razorpay keys → verify signature → save booking in **your** bookings collection → send confirmation email.
6. Do not depend on TripJack Review/Book APIs.

### Security (already set on Safar Sathi)
Safar Sathi rules allow public **read** of `goaHotels` only when `cityKey == 'goa'` and not deleted/hidden. Client **write** is denied.  
On Bookscubagoa: never expose Safar Sathi Admin SDK keys in the browser. Use Admin SDK only on the server for creating bookings if you write into the same project (recommended: separate `bookscubaBookings` collection with your own rules).

### Env needed on Bookscubagoa
- Same Firebase web config as Safar Sathi (for reading `goaHotels`)
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` for Bookscubagoa
- Optional Admin SDK if bookings are stored in the same Firebase project

### Implementation checklist
- [ ] Firebase client init
- [ ] Hotels list page reading `goaHotels`
- [ ] Hotel detail by slug
- [ ] Room selection + nights pricing
- [ ] Guest form
- [ ] Razorpay create-order + verify API routes
- [ ] Booking confirmation page + email
- [ ] Add Firestore composite index if console asks for `goaHotels` cityKey+isDeleted+websiteVisible+name

### Out of scope
- India-wide hotels
- TripJack live proxy
- Writing to Safar Sathi `tripjackHotelCatalog` / `hotelBookings`

Implement this end-to-end in the Bookscubagoa codebase now, matching existing design system where possible.

---

## Safar Sathi owner checklist (this project)

1. Deploy updated `firestore.rules` (`firebase deploy --only firestore:rules`).
2. Admin → **TripJack Hotels Ops** → click **Export Goa hotels → goaHotels** (after hotel sync; open some Goa hotels on the site first so room price cache fills).
3. Share Firebase web config with Bookscubagoa (read-only usage of `goaHotels`).
4. Paste the PROMPT above into Bookscubagoa Cursor.
