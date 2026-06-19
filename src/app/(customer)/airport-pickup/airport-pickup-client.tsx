"use client";

import Link from "next/link";
import { Clock, Plane, Shield } from "lucide-react";
import { PageHero } from "@/components/customer/page-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VehicleCard } from "@/components/customer/vehicle-card";
import { useAppStore } from "@/store/app-store";
import type { Vehicle } from "@/types";

const features = [
  { icon: Clock, title: "On-Time Guarantee", desc: "Track your driver in real-time" },
  { icon: Shield, title: "Safe & Verified", desc: "Background-checked professional drivers" },
  { icon: Plane, title: "Flight Tracking", desc: "Automatic delay adjustments" },
];

export default function AirportPickupClient({
  vehicles,
}: {
  vehicles: Vehicle[];
}) {
  const { locale } = useAppStore();

  return (
    <>
      <PageHero
        title="Airport Pickup"
        subtitle="Reliable transfers to and from all major airports"
        image={HERO_IMAGES.airport}
        compactOnMobile
      />

      <section className="container mx-auto px-4 py-6 md:py-10">
        <Card className="mb-12">
          <CardContent className="grid gap-4 pt-6 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>Airport</Label>
              <Select defaultValue="del">
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue placeholder="Select airport" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="del">Delhi (DEL)</SelectItem>
                  <SelectItem value="bom">Mumbai (BOM)</SelectItem>
                  <SelectItem value="blr">Bangalore (BLR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Drop Location</Label>
              <Input placeholder="Hotel or address" className="mt-1.5" />
            </div>
            <div>
              <Label>Date & Time</Label>
              <Input type="datetime-local" className="mt-1.5" />
            </div>
            <div className="flex items-end">
              <Button className="w-full">Get Quote</Button>
            </div>
          </CardContent>
        </Card>

        <div className="mb-12 grid gap-6 md:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title}>
              <CardContent className="flex gap-4 pt-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{f.title}</p>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <h2 className="mb-6 text-xl font-bold text-primary">Recommended Vehicles</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.slice(0, 3).map((v) => (
            <VehicleCard key={v.id} vehicle={v} locale={locale} />
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/vehicles">
            <Button variant="outline">View All Vehicles</Button>
          </Link>
        </div>
      </section>
    </>
  );
}
