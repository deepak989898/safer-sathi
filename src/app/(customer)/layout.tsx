import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { AiAssistantFab } from "@/components/layout/ai-assistant-fab";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <AiAssistantFab />
    </>
  );
}
