"use client";

import { useAppStore } from "@/store/app-store";
import { t } from "@/lib/i18n";

interface HomeClientProps {
  titleKey?: string;
  descKey?: string;
  mode?: "feature";
}

export function HomeClient({
  titleKey,
  descKey,
  mode = "feature",
}: HomeClientProps) {
  const { locale } = useAppStore();

  if (mode === "feature" && titleKey && descKey) {
    return (
      <>
        <h3 className="font-semibold">{t(locale, "features", titleKey)}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(locale, "features", descKey)}
        </p>
      </>
    );
  }

  return null;
}
