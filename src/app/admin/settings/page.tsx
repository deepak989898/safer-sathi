"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/admin/admin-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SITE_CONTACT } from "@/lib/site-config";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    companyName: "Safar Sathi Tours",
    supportEmail: SITE_CONTACT.email as string,
    supportPhone: SITE_CONTACT.phone as string,
    currency: "INR",
    timezone: "Asia/Kolkata",
    aiEnabled: true,
    autoConfirmBookings: false,
    emailNotifications: true,
    whatsappNotifications: true,
    description:
      "AI-powered travel booking platform serving destinations across India.",
  });

  return (
    <>
      <AdminHeader
        title="Settings"
        description="General platform configuration"
        adminName="Rajesh Kumar"
      />
      <div className="max-w-3xl space-y-6 p-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>Basic details about your business</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={settings.companyName}
                onChange={(e) =>
                  setSettings({ ...settings, companyName: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={settings.description}
                onChange={(e) =>
                  setSettings({ ...settings, description: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) =>
                    setSettings({ ...settings, supportEmail: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="supportPhone">Support Phone</Label>
                <Input
                  id="supportPhone"
                  value={settings.supportPhone}
                  onChange={(e) =>
                    setSettings({ ...settings, supportPhone: e.target.value })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Regional Settings</CardTitle>
            <CardDescription>Currency and timezone preferences</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={settings.currency}
                onChange={(e) =>
                  setSettings({ ...settings, currency: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={settings.timezone}
                onChange={(e) =>
                  setSettings({ ...settings, timezone: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Automation & Notifications</CardTitle>
            <CardDescription>AI and notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">AI Agents Enabled</p>
                <p className="text-xs text-muted-foreground">
                  Allow autonomous AI agents to process bookings
                </p>
              </div>
              <Switch
                checked={settings.aiEnabled}
                onCheckedChange={(v) => setSettings({ ...settings, aiEnabled: v })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto-Confirm Bookings</p>
                <p className="text-xs text-muted-foreground">
                  Automatically confirm paid bookings
                </p>
              </div>
              <Switch
                checked={settings.autoConfirmBookings}
                onCheckedChange={(v) =>
                  setSettings({ ...settings, autoConfirmBookings: v })
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Email Notifications</p>
                <p className="text-xs text-muted-foreground">
                  Send booking updates via email
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(v) =>
                  setSettings({ ...settings, emailNotifications: v })
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">WhatsApp Notifications</p>
                <p className="text-xs text-muted-foreground">
                  Send booking updates via WhatsApp
                </p>
              </div>
              <Switch
                checked={settings.whatsappNotifications}
                onCheckedChange={(v) =>
                  setSettings({ ...settings, whatsappNotifications: v })
                }
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline">Reset</Button>
          <Button>Save Changes</Button>
        </div>
      </div>
    </>
  );
}
