"use client";

import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { customerApiFetch } from "@/lib/admin/api-client";
import { useAppStore } from "@/store/app-store";
import type { Locale } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  locale: Locale;
}

interface CustomerProfileCardProps {
  onUpdated?: () => void;
  className?: string;
}

export function CustomerProfileCard({ onUpdated, className }: CustomerProfileCardProps) {
  const { locale, setLocale } = useAppStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await customerApiFetch("/api/customer/profile");
        const json = await res.json();
        if (!cancelled && json.success) {
          const data = json.data as ProfileData;
          setProfile(data);
          if (data.locale) setLocale(data.locale);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [setLocale]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!profile) return;

    setSaving(true);
    try {
      const res = await customerApiFetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          locale: profile.locale,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Could not update profile");
      }
      toast.success("Profile updated");
      onUpdated?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className={cn("mb-8", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserRound className="size-5" />
          My profile
        </CardTitle>
        <CardDescription>Update your contact details used for bookings and invoices.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading || !profile ? (
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        ) : (
          <form onSubmit={handleSave} className="grid max-w-lg gap-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Full name</Label>
              <Input
                id="profile-name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input id="profile-email" value={profile.email} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-phone">Mobile</Label>
              <Input
                id="profile-phone"
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="10-digit mobile"
                required
                minLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-locale">Preferred language</Label>
              <select
                id="profile-locale"
                value={profile.locale}
                onChange={(e) =>
                  setProfile({ ...profile, locale: e.target.value as Locale })
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
              </select>
            </div>
            <Button type="submit" disabled={saving} className="w-fit">
              {saving ? "Saving..." : "Save profile"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
