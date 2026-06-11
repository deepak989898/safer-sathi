"use client";

import { useEffect } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { useAppStore } from "@/store/app-store";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    useAppStore.persist.rehydrate();
  }, []);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      enableColorScheme={false}
      disableTransitionOnChange
    >
      {children}
      <Toaster position="top-right" richColors />
    </NextThemesProvider>
  );
}
