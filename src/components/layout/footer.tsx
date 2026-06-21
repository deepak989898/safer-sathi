"use client";

import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { SiteShareButton } from "@/components/layout/site-share-button";
import { SITE_CONTACT } from "@/lib/site-config";
import { useAppStore } from "@/store/app-store";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Footer() {
  const { locale } = useAppStore();

  return (
    <footer className="border-t bg-slate-50 dark:bg-card">
      <div className="container mx-auto px-4 py-10 md:py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">{t(locale, "footer", "tagline")}</p>
            <div className="mt-4 flex items-center gap-2.5">
              <SiteShareButton />
              <a
                href={`mailto:${SITE_CONTACT.email}`}
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-full",
                  "bg-primary/10 text-primary transition-colors hover:bg-primary/15"
                )}
                aria-label="Email us"
              >
                <Mail className="h-[1.15rem] w-[1.15rem]" strokeWidth={2.25} />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 lg:contents">
            <div>
              <h4 className="mb-3 font-semibold md:mb-4">
                {t(locale, "footer", "quickLinks")}
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/about" className="hover:text-primary">
                    {t(locale, "nav", "about")}
                  </Link>
                </li>
                <li>
                  <Link href="/packages" className="hover:text-primary">
                    {t(locale, "nav", "packages")}
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="hover:text-primary">
                    {t(locale, "nav", "blog")}
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-primary">
                    {t(locale, "nav", "faq")}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-3 font-semibold md:mb-4">
                {t(locale, "footer", "services")}
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/vehicles" className="hover:text-primary">
                    {t(locale, "nav", "vehicles")}
                  </Link>
                </li>
                <li>
                  <Link href="/hotels" className="hover:text-primary">
                    {t(locale, "nav", "hotels")}
                  </Link>
                </li>
                <li>
                  <Link href="/car-rental" className="hover:text-primary">
                    {t(locale, "nav", "carRental")}
                  </Link>
                </li>
                <li>
                  <Link href="/airport-pickup" className="hover:text-primary">
                    {t(locale, "nav", "airport")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div>
            <h4 className="mb-3 font-semibold md:mb-4">{t(locale, "footer", "contact")}</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <a href={`tel:${SITE_CONTACT.phoneTel}`} className="hover:text-primary">
                  {SITE_CONTACT.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <a href={`mailto:${SITE_CONTACT.email}`} className="hover:text-primary">
                  {SITE_CONTACT.email}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                {SITE_CONTACT.addressFull}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 border-t pt-5">
          <div className="flex items-center justify-between gap-4">
            <BrandLogo href="/" size="compact" className="shrink-0" />

            <div className="flex flex-col items-end text-right text-sm text-muted-foreground">
              <p>
                © {new Date().getFullYear()} Safar Sathi. {t(locale, "footer", "rights")}
              </p>
              <div className="mt-2 flex items-center gap-4">
                <Link href="/terms" className="hover:text-primary">
                  Terms
                </Link>
                <Link href="/privacy" className="hover:text-primary">
                  Privacy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
