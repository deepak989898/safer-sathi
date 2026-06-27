import { Mail, MapPin, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { contactLinks, whatsAppUrl } from "@/lib/site-contact-links";
import { SITE_CONTACT } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const linkClass =
  "underline-offset-4 transition-colors hover:text-primary hover:underline md:hover:text-white";

interface ContactChannelsProps {
  className?: string;
  /** Use white hover styles for dark footer background */
  onDark?: boolean;
  showAddress?: boolean;
  showWhatsApp?: boolean;
}

export function ContactChannels({
  className,
  onDark = false,
  showAddress = true,
  showWhatsApp = true,
}: ContactChannelsProps) {
  const hover = onDark ? "md:hover:text-white" : "hover:text-primary";

  return (
    <ul className={cn("space-y-3 text-sm text-muted-foreground md:text-white/75", className)}>
      <li className="flex items-center gap-2.5">
        <Phone className={cn("h-4 w-4 shrink-0 text-primary", onDark && "md:text-[#60a5fa]")} />
        <a href={contactLinks.phone} className={cn(linkClass, hover)}>
          {SITE_CONTACT.phone}
        </a>
      </li>
      {showWhatsApp && (
        <li className="flex items-center gap-2.5">
          <WhatsAppIcon className={cn("h-4 w-4 shrink-0 text-[#25D366]")} />
          <a
            href={whatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(linkClass, hover)}
          >
            WhatsApp {SITE_CONTACT.phone.replace("+91 ", "")}
          </a>
        </li>
      )}
      <li className="flex items-center gap-2.5">
        <Mail className={cn("h-4 w-4 shrink-0 text-primary", onDark && "md:text-[#60a5fa]")} />
        <a href={contactLinks.email} className={cn(linkClass, hover)}>
          {SITE_CONTACT.email}
        </a>
      </li>
      {showAddress && (
        <li className="flex items-start gap-2.5">
          <MapPin
            className={cn("mt-0.5 h-4 w-4 shrink-0 text-primary", onDark && "md:text-[#60a5fa]")}
          />
          <a
            href={contactLinks.maps}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(linkClass, hover)}
          >
            {SITE_CONTACT.addressFull}
          </a>
        </li>
      )}
    </ul>
  );
}
