import { Award, Globe, Heart, Mail, MapPin, Phone, Users } from "lucide-react";
import { PageHero } from "@/components/customer/page-hero";
import { Card, CardContent } from "@/components/ui/card";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import { SITE_CONTACT } from "@/lib/site-config";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "About Safar Sathi | Trusted India Travel Partner",
  description:
    "Safar Sathi offers curated tour packages, hotels, and vehicles across India with 24/7 support and secure Razorpay booking.",
  path: "/about",
  keywords: ["about Safar Sathi", "India travel agency", "tour operator Delhi", "trusted travel partner"],
  image: HERO_IMAGES.about,
});

const stats = [
  { label: "Happy Travelers", value: "50,000+", icon: Users },
  { label: "Destinations", value: "200+", icon: Globe },
  { label: "Years of Service", value: "10+", icon: Award },
  { label: "Customer Satisfaction", value: "98%", icon: Heart },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        title="About Safar Sathi"
        subtitle="Your trusted travel companion across India"
        image={HERO_IMAGES.about}
      />

      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <h2 className="text-2xl font-bold text-primary">Our Story</h2>
          <p className="text-muted-foreground leading-relaxed">
            Safar Sathi was founded with a vision to make travel in India seamless,
            affordable, and memorable. We combine deep local expertise with
            modern booking tools to deliver personalized travel experiences — from
            curated tour packages and luxury hotels to reliable vehicle rentals and
            bus bookings.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Whether you&apos;re planning a family vacation, a romantic honeymoon,
            a spiritual pilgrimage, or a corporate retreat, our platform and travel
            assistant are here to guide you every step of the way.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="text-center">
              <CardContent className="pt-6">
                <stat.icon className="mx-auto mb-3 h-8 w-8 text-primary" />
                <p className="text-2xl font-bold text-primary">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-8">
            <h3 className="text-xl font-semibold text-primary">Our Mission</h3>
            <p className="mt-4 text-muted-foreground">
              To democratize travel by making world-class experiences accessible
              to every Indian traveler through technology, transparency, and
              exceptional service.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-8">
            <h3 className="text-xl font-semibold text-primary">Our Vision</h3>
            <p className="mt-4 text-muted-foreground">
              To become India&apos;s most trusted travel platform,
              known for innovation, reliability, and customer delight.
            </p>
          </div>
        </div>

        <div className="mt-16 rounded-xl border bg-card p-8">
          <h3 className="text-xl font-semibold text-primary">Contact Safar Sathi</h3>
          <ul className="mt-6 space-y-4 text-muted-foreground">
            <li className="flex items-center gap-3">
              <Phone className="h-5 w-5 shrink-0 text-primary" />
              <a href={`tel:${SITE_CONTACT.phoneTel}`} className="hover:text-primary">
                {SITE_CONTACT.phone}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="h-5 w-5 shrink-0 text-primary" />
              <a href={`mailto:${SITE_CONTACT.email}`} className="hover:text-primary">
                {SITE_CONTACT.email}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span>{SITE_CONTACT.addressFull}</span>
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}
