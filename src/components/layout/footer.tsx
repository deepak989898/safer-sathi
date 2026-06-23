"use client";

import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";
import {
  FacebookIcon,
  InstagramIcon,
  TwitterIcon,
  YoutubeIcon,
} from "@/components/icons/social-icons";
import { SITE_CONTACT } from "@/lib/site-config";
import { useAppStore } from "@/store/app-store";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const QUICK_LINKS = [
  { href: "/packages", label: "Tour Packages" },
  { href: "/vehicles", label: "Vehicles" },
  { href: "/hotels", label: "Hotels" },
  { href: "/bus-booking", label: "Bus Booking" },
] as const;

const SUPPORT_LINKS = [
  { href: "/my-bookings", label: "My Bookings" },
  { href: "/login", label: "Login" },
  { href: "/faq", label: "Help Center" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/privacy", label: "Privacy Policy" },
] as const;

const SOCIAL_LINKS = [
  { href: "https://facebook.com", label: "Facebook", Icon: FacebookIcon },
  { href: "https://instagram.com", label: "Instagram", Icon: InstagramIcon },
  { href: "https://twitter.com", label: "Twitter", Icon: TwitterIcon },
  { href: "https://youtube.com", label: "YouTube", Icon: YoutubeIcon },
] as const;

export function Footer() {
  const { locale } = useAppStore();

  return (
    <footer className="border-t bg-slate-50 md:border-0 md:bg-[#0c2444]">
      <div className="container mx-auto px-4 py-10 md:py-14">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          <div>
            <div className="md:hidden">
              <BrandLogo href="/" size="footer" />
            </div>
            <div className="hidden md:block">
              <BrandLogo
                href="/"
                size="footer"
                onDarkSurface
                imageClassName="h-[6.5rem] w-auto lg:h-[7.25rem]"
              />
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground md:text-white/75">
              {locale === "hi"
                ? "Safar Sathi — भारत भर में भरोसेमंद यात्रा बुकिंग। टूर, होटल, वाहन और बस — सब एक जगह।"
                : "Safar Sathi — trusted travel booking across India. Tours, hotels, vehicles and buses — all in one place."}
            </p>
            <div className="mt-5 flex items-center gap-3">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-full",
                    "bg-primary/10 text-primary transition-colors hover:bg-primary/15",
                    "md:bg-white/10 md:text-white md:hover:bg-white/20"
                  )}
                  aria-label={social.label}
                >
                  <social.Icon className="h-[18px] w-[18px]" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-3 font-semibold md:mb-4 md:text-white">
              {t(locale, "footer", "quickLinks")}
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground md:text-white/75">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-primary md:hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-semibold md:mb-4 md:text-white">Support</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground md:text-white/75">
              {SUPPORT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-primary md:hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-semibold md:mb-4 md:text-white">
              {t(locale, "footer", "contact")}
            </h4>
            <ul className="space-y-3 text-sm text-muted-foreground md:text-white/75">
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-primary md:text-[#60a5fa]" />
                <a href={`tel:${SITE_CONTACT.phoneTel}`} className="hover:text-primary md:hover:text-white">
                  {SITE_CONTACT.phone}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-primary md:text-[#60a5fa]" />
                <a href={`mailto:${SITE_CONTACT.email}`} className="hover:text-primary md:hover:text-white">
                  {SITE_CONTACT.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary md:text-[#60a5fa]" />
                {SITE_CONTACT.addressFull}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-5 md:border-white/15">
          <p className="text-center text-sm text-muted-foreground md:text-white/60">
            © {new Date().getFullYear()} Safar Sathi Travel. {t(locale, "footer", "rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
