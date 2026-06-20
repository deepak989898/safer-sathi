import AiCenterClient from "./ai-center-client";
import { AiCenterGuard } from "@/components/auth/ai-center-guard";

export default function AiCenterPage() {
  return (
    <AiCenterGuard>
      <AiCenterClient />
    </AiCenterGuard>
  );
}
