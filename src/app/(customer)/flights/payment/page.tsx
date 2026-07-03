import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Flight Payment | Safar Sathi",
  description: "Flight payment — Phase 4",
};

export default function FlightPaymentPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-16">
      <div className="container mx-auto max-w-lg px-4">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="space-y-4 pt-8 text-center">
            <h1 className="text-xl font-bold text-slate-900">Payment</h1>
            <p className="text-sm text-slate-600">
              Payment will be implemented in Phase 4.
            </p>
            <p className="text-xs text-slate-500">
              Your fare has been validated. Booking and Razorpay checkout will be added next.
            </p>
            <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:justify-center">
              <Link href="/flights/passengers">
                <Button variant="outline" type="button">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to passengers
                </Button>
              </Link>
              <Link href="/flights">
                <Button className="bg-[#1a4fa3]" type="button">
                  Back to search
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
