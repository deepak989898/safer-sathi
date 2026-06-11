"use client";

import { useRouter } from "next/navigation";
import { useBookingCart } from "@/store/app-store";

interface BookingCartData {
  serviceType: string;
  serviceId: string;
  serviceName: string;
  startDate: string;
  endDate?: string;
  guests: number;
  amount: number;
}

export function useGoToBooking() {
  const router = useRouter();
  const setCart = useBookingCart((s) => s.setCart);

  return (data: BookingCartData) => {
    setCart({
      serviceType: data.serviceType,
      serviceId: data.serviceId,
      serviceName: data.serviceName,
      startDate: data.startDate,
      endDate: data.endDate ?? "",
      guests: data.guests,
      amount: data.amount,
    });
    router.push("/booking");
  };
}
