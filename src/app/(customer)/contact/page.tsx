"use client";

import { Mail, MapPin, Phone, Clock } from "lucide-react";
import { PageHero } from "@/components/customer/page-hero";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

const contactInfo = [
  {
    icon: Phone,
    title: "Phone",
    detail: "+91 98765 43210",
    sub: "Mon-Sat, 9 AM - 8 PM",
  },
  {
    icon: Mail,
    title: "Email",
    detail: "hello@safarsathi.com",
    sub: "We reply within 24 hours",
  },
  {
    icon: MapPin,
    title: "Office",
    detail: "123 Travel Hub, Connaught Place",
    sub: "New Delhi 110001, India",
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
                      <p className="text-sm">{item.detail}</p>
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
                  <Input id="phone" placeholder="+91 98765 43210" className="mt-1.5" />
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
