"use client";

import type { ComponentType } from "react";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { PageHero } from "@/components/customer/page-hero";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import {
  contactLinks,
  DEFAULT_WHATSAPP_GREETING,
  whatsAppUrl,
} from "@/lib/site-contact-links";
import { SITE_CONTACT } from "@/lib/site-config";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ContactItem = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  detail: string;
  sub: string;
  href?: string;
  external?: boolean;
  detailClassName?: string;
};

const contactInfo: ContactItem[] = [
  {
    icon: Phone,
    title: "Phone",
    detail: SITE_CONTACT.phone,
    sub: "Tap to call — Mon–Sat, 9 AM – 8 PM IST",
    href: contactLinks.phone,
  },
  {
    icon: WhatsAppIcon,
    title: "WhatsApp",
    detail: SITE_CONTACT.phone,
    sub: "Tap to chat on WhatsApp — quick replies",
    href: whatsAppUrl(DEFAULT_WHATSAPP_GREETING),
    external: true,
    detailClassName: "text-[#128C7E] dark:text-[#25D366]",
  },
  {
    icon: Mail,
    title: "Email",
    detail: SITE_CONTACT.email,
    sub: "Tap to email — we reply within 24 hours",
    href: contactLinks.email,
  },
  {
    icon: MapPin,
    title: "Office",
    detail: SITE_CONTACT.addressFull,
    sub: "Tap to open in Google Maps",
    href: contactLinks.maps,
    external: true,
  },
  {
    icon: Clock,
    title: "Support Hours",
    detail: "24/7 AI Assistant",
    sub: "Human support: 9 AM – 8 PM IST",
  },
];

function ContactCard({ item }: { item: ContactItem }) {
  const Icon = item.icon;
  const content = (
    <CardContent className="flex gap-4 pt-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-medium">{item.title}</p>
        <p className={cn("text-sm", item.detailClassName)}>{item.detail}</p>
        <p className="text-xs text-muted-foreground">{item.sub}</p>
      </div>
    </CardContent>
  );

  if (!item.href) {
    return <Card>{content}</Card>;
  }

  return (
    <Card className="transition-shadow hover:shadow-md">
      <a
        href={item.href}
        target={item.external ? "_blank" : undefined}
        rel={item.external ? "noopener noreferrer" : undefined}
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {content}
      </a>
    </Card>
  );
}

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
              Have questions about a package, need help with a booking, or want to plan a custom
              trip? Call, WhatsApp, or email us — our team is ready to assist.
            </p>

            <div className="flex flex-wrap gap-3">
              <a
                href={whatsAppUrl(DEFAULT_WHATSAPP_GREETING)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({
                  size: "lg",
                  className: "bg-[#25D366] text-white hover:bg-[#20bd5a]",
                })}
              >
                <WhatsAppIcon className="mr-2 h-5 w-5" />
                Chat on WhatsApp
              </a>
              <a href={contactLinks.phone} className={buttonVariants({ size: "lg", variant: "outline" })}>
                <Phone className="mr-2 h-4 w-4" />
                Call {SITE_CONTACT.phone}
              </a>
              <a href={contactLinks.email} className={buttonVariants({ size: "lg", variant: "outline" })}>
                <Mail className="mr-2 h-4 w-4" />
                Email Us
              </a>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {contactInfo.map((item) => (
                <ContactCard key={item.title} item={item} />
              ))}
            </div>
          </div>

          <Card className="p-2">
            <CardContent className="pt-6">
              <h3 className="mb-2 text-xl font-semibold">Send a Message</h3>
              <p className="mb-6 text-sm text-muted-foreground">
                Prefer WhatsApp?{" "}
                <a
                  href={whatsAppUrl(DEFAULT_WHATSAPP_GREETING)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#128C7E] underline-offset-4 hover:underline dark:text-[#25D366]"
                >
                  Message us on WhatsApp
                </a>{" "}
                for the fastest response.
              </p>
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
                    type="tel"
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
