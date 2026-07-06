"use client";

import Link from "next/link";
import { ArrowLeft, Loader2, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/i18n";
import type { Locale } from "@/types";
import type { BusPassengerDetail } from "@/lib/seatseller/types";
import type { BusSelectedTrip } from "@/lib/bus/session";
import type { BusSearchParams } from "@/lib/bus/session";

const ID_TYPES = [
  "AADHAR",
  "PAN_CARD",
  "PASSPORT",
  "DRIVING_LICENCE",
  "VOTER_CARD",
  "RATION_CARD",
] as const;

interface BusPassengerScreenProps {
  search: BusSearchParams;
  trip: BusSelectedTrip;
  passengers: BusPassengerDetail[];
  loading: boolean;
  locale: Locale;
  onChange: (passengers: BusPassengerDetail[]) => void;
  onSubmit: () => void;
}

export function BusPassengerScreen({
  search,
  trip,
  passengers,
  loading,
  locale,
  onChange,
  onSubmit,
}: BusPassengerScreenProps) {
  const totalFare = passengers.reduce((sum, p) => sum + p.fare, 0);
  const digitsOnly = (value: string, max: number) => value.replace(/\D/g, "").slice(0, max);
  const textOnly = (value: string, max = 80) =>
    value.replace(/[^a-zA-Z\s.'-]/g, "").replace(/\s+/g, " ").slice(0, max);

  const updatePassenger = (index: number, patch: Partial<BusPassengerDetail>) => {
    onChange(
      passengers.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, ...patch };
        if (patch.firstName !== undefined || patch.lastName !== undefined) {
          const first = patch.firstName ?? row.firstName ?? "";
          const last = patch.lastName ?? row.lastName ?? "";
          next.name = `${first} ${last}`.trim() || row.name;
        }
        return next;
      })
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-28">
      <div className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/bus/seat-layout"
            className="mb-2 inline-flex items-center text-sm text-slate-500 hover:text-[#1a4fa3]"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to seats
          </Link>
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Passenger details</h1>
          <p className="text-sm text-slate-500">
            {search.sourceCityName} → {search.destinationCityName} · {search.doj} ·{" "}
            {trip.travels ?? trip.operator}
          </p>
        </div>
      </div>

      <div className="container mx-auto grid gap-6 px-4 py-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          {passengers.map((p, index) => (
            <Card key={p.seatName} className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="mb-4 flex items-center gap-2">
                  <User className="h-4 w-4 text-[#1a4fa3]" />
                  <h2 className="font-semibold text-slate-900">
                    Passenger {index + 1} · Seat {p.seatName}
                  </h2>
                  <span className="ml-auto text-sm font-medium text-[#1a4fa3]">
                    {formatCurrency(p.fare, locale)}
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Title</Label>
                    <Select
                      value={p.title}
                      onValueChange={(v) => updatePassenger(index, { title: v ?? "Mr" })}
                    >
                      <SelectTrigger className="mt-1.5 h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Mr", "Mrs", "Ms", "Miss"].map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <Select
                      value={p.gender}
                      onValueChange={(v) =>
                        updatePassenger(index, { gender: (v ?? "MALE") as "MALE" | "FEMALE" })
                      }
                    >
                      <SelectTrigger className="mt-1.5 h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>First name</Label>
                    <Input
                      className="mt-1.5 h-11 rounded-xl"
                      value={p.firstName ?? p.name.split(" ")[0] ?? ""}
                      onChange={(e) =>
                        updatePassenger(index, { firstName: textOnly(e.target.value, 40) })
                      }
                    />
                  </div>
                  <div>
                    <Label>Last name</Label>
                    <Input
                      className="mt-1.5 h-11 rounded-xl"
                      value={p.lastName ?? p.name.split(" ").slice(1).join(" ") ?? ""}
                      onChange={(e) =>
                        updatePassenger(index, { lastName: textOnly(e.target.value, 40) })
                      }
                    />
                  </div>
                  <div>
                    <Label>Age</Label>
                    <Input
                      type="number"
                      className="mt-1.5 h-11 rounded-xl"
                      value={p.age}
                      min={1}
                      max={120}
                      onChange={(e) => {
                        const age = Number(e.target.value);
                        updatePassenger(index, { age: Number.isFinite(age) ? age : 0 });
                      }}
                    />
                  </div>
                  <div>
                    <Label>Mobile</Label>
                    <Input
                      className="mt-1.5 h-11 rounded-xl"
                      value={p.mobile}
                      inputMode="numeric"
                      maxLength={10}
                      onChange={(e) =>
                        updatePassenger(index, { mobile: digitsOnly(e.target.value, 10) })
                      }
                      placeholder="10-digit mobile"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      className="mt-1.5 h-11 rounded-xl"
                      value={p.email}
                      onChange={(e) => updatePassenger(index, { email: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Address</Label>
                    <Input
                      className="mt-1.5 h-11 rounded-xl"
                      value={p.address}
                      maxLength={200}
                      onChange={(e) => updatePassenger(index, { address: e.target.value.slice(0, 200) })}
                    />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input
                      className="mt-1.5 h-11 rounded-xl"
                      value={p.city ?? ""}
                      onChange={(e) => updatePassenger(index, { city: textOnly(e.target.value, 80) })}
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input
                      className="mt-1.5 h-11 rounded-xl"
                      value={p.state ?? ""}
                      onChange={(e) => updatePassenger(index, { state: textOnly(e.target.value, 80) })}
                    />
                  </div>
                  <div>
                    <Label>Pincode</Label>
                    <Input
                      className="mt-1.5 h-11 rounded-xl"
                      value={p.pincode ?? ""}
                      inputMode="numeric"
                      maxLength={6}
                      onChange={(e) => updatePassenger(index, { pincode: digitsOnly(e.target.value, 6) })}
                    />
                  </div>
                  <div>
                    <Label>ID type</Label>
                    <Select
                      value={p.idType}
                      onValueChange={(v) =>
                        updatePassenger(index, {
                          idType: (v ?? "AADHAR") as BusPassengerDetail["idType"],
                        })
                      }
                    >
                      <SelectTrigger className="mt-1.5 h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ID_TYPES.map((id) => (
                          <SelectItem key={id} value={id}>
                            {id.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>ID number</Label>
                    <Input
                      className="mt-1.5 h-11 rounded-xl"
                      value={p.idNumber}
                      maxLength={30}
                      onChange={(e) =>
                        updatePassenger(index, {
                          idNumber: e.target.value.replace(/\s+/g, " ").trimStart().slice(0, 30),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Emergency contact</Label>
                    <Input
                      className="mt-1.5 h-11 rounded-xl"
                      value={p.emergencyContact ?? ""}
                      inputMode="numeric"
                      maxLength={10}
                      onChange={(e) =>
                        updatePassenger(index, { emergencyContact: digitsOnly(e.target.value, 10) })
                      }
                    />
                  </div>
                  {index === 0 && (
                    <div>
                      <Label>GST (optional)</Label>
                      <Input
                        className="mt-1.5 h-11 rounded-xl"
                        value={p.gst ?? ""}
                        onChange={(e) => updatePassenger(index, { gst: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="h-fit rounded-2xl border-slate-200 shadow-sm lg:sticky lg:top-24">
          <CardContent className="space-y-4 pt-6">
            <h3 className="font-semibold text-slate-900">Booking summary</h3>
            <p className="text-sm text-slate-600">
              Seats: {passengers.map((p) => p.seatName).join(", ")}
            </p>
            <p className="text-lg font-bold text-[#1a4fa3]">
              {formatCurrency(totalFare, locale)}
            </p>
            <Button
              className="hidden h-12 w-full rounded-xl bg-[#1a4fa3] lg:flex"
              disabled={loading}
              onClick={onSubmit}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Shield className="mr-2 h-4 w-4" />
              )}
              Block seats & continue
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white p-4 shadow-lg lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">{passengers.length} passenger(s)</p>
            <p className="font-bold text-[#1a4fa3]">{formatCurrency(totalFare, locale)}</p>
          </div>
          <Button className="rounded-xl bg-[#1a4fa3]" disabled={loading} onClick={onSubmit}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
