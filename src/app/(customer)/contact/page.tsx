"use client";

import { Mail, MapPin, Phone, Clock } from "lucide-react";
import { PageHero } from "@/components/customer/page-hero";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import { SITE_CONTACT } from "@/lib/site-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

type ContactItem = {
  icon: typeof Phone;
  title: string;
  detail: string;
  sub: string;
  href?: string;
};

const contactInfo: ContactItem[] = [
  {
    icon: Phone,
    title: "Phone",
    detail: SITE_CONTACT.phone,
    sub: "Mon-Sat, 9 AM - 8 PM",
    href: `tel:${SITE_CONTACT.phoneTel}`,
  },
  {
    icon: Mail,
    title: "Email",
    detail: SITE_CONTACT.email,
    sub: "We reply within 24 hours",
    href: `mailto:${SITE_CONTACT.email}`,
  },
  {
    icon: MapPin,
    title: "Office",
    detail: SITE_CONTACT.addressLine1,
    sub: SITE_CONTACT.addressLine2,
  },
  {
    icon: Clock,
    title: "Support Hours",
    detail: "24/7 Assistant",
    sub: "Human support: 9 AM - 8 PM IST",
  },
];

export default function ContactPage() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Message sent! We'll get back to you soon.");
  };

  return (
    <>
      <PageHero
        title="Contact Us"
        subtitle="We'd love to hear from you. Reach out anytime."
        image={HERO_IMAGES.contact}
      />

      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-primary">Get in Touch</h2>
            <p className="text-muted-foreground">
              Have questions about a package, need help with a booking, or want
              to plan a custom trip? Our team is ready to assist.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {contactInfo.map((item) => (
                <Card key={item.title}>
                  <CardContent className="flex gap-4 pt-6">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      {item.href ? (
                        <a href={item.href} className="text-sm hover:text-primary">
                          {item.detail}
                        </a>
                      ) : (
                        <p className="text-sm">{item.detail}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{item.sub}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card className="p-2">
            <CardContent className="pt-6">
              <h3 className="mb-6 text-xl font-semibold">Send a Message</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" required placeholder="Your name" className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      className="mt-1.5"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder={SITE_CONTACT.phone}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" required placeholder="How can we help?" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    required
                    rows={5}
                    placeholder="Tell us about your travel plans..."
                    className="mt-1.5"
                  />
                </div>
                <Button type="submit" className="w-full" size="lg">
                  Send Message
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
