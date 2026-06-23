"use client";

import Link from "next/link";
import { Mic, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AiCenterSettings } from "@/lib/ai-center/types";

export function AiCenterVoiceTab({ settings }: { settings: AiCenterSettings | null }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            AI Voice Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Voice chat is built into the Travel Assistant. Users tap the mic for a natural
            back-and-forth conversation in Hindi or English — listen, reply, and speak automatically.
          </p>
          <ul className="grid gap-2 text-sm md:grid-cols-2">
            <li className="flex items-center gap-2"><Volume2 className="h-4 w-4 text-primary" /> Speech to Text (hi-IN / en-IN)</li>
            <li className="flex items-center gap-2"><Volume2 className="h-4 w-4 text-primary" /> Text to Speech — male & female voices</li>
            <li className="flex items-center gap-2"><Volume2 className="h-4 w-4 text-primary" /> Auto language detection</li>
            <li className="flex items-center gap-2"><Volume2 className="h-4 w-4 text-primary" /> Package suggest & Razorpay checkout</li>
          </ul>
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <p className="font-medium">Example (Hindi)</p>
            <p className="text-muted-foreground mt-1">User: &quot;Mujhe Manali jana hai&quot; → AI: &quot;Aap kitne log hain?&quot;</p>
          </div>
          {settings && (
            <p className="text-xs text-muted-foreground">
              Voice locale: {settings.voiceDefaultLocale} · Gender: {settings.voiceGender} · Auto-detect:{" "}
              {settings.voiceAutoDetectLanguage ? "ON" : "OFF"}
            </p>
          )}
          <Link href="/ai-assistant" target="_blank">
            <Button>Open AI Assistant</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
