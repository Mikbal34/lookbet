"use client";

// Booking form page
// Multi-step: 1. Contact info, 2. Guest details
// Sidebar shows booking summary
// On submit POSTs to /api/booking, redirects to confirmation

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Navbar, Footer } from "@/components/layout";
import { ContactForm, GuestForm, BookingSummary } from "@/components/booking";
import { Stepper } from "@/components/ui/stepper";
import { Button } from "@/components/ui/button";
import { createBookingSchema, type CreateBookingInput } from "@/lib/validators/booking.schema";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";

const STEPS = ["İletişim Bilgileri", "Misafir Bilgileri", "Özet"];

export default function BookingPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>}>
      <BookingPageContent />
    </React.Suspense>
  );
}

function BookingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  // Read booking params from URL
  const roomSearchId = searchParams.get("roomSearchId") ?? "";
  const priceCode = searchParams.get("priceCode") ?? "";
  const hotelCode = searchParams.get("hotelCode") ?? "";
  const hotelName = searchParams.get("hotelName") ?? "";
  const boardType = searchParams.get("boardType") ?? "";
  const boardTypeName = searchParams.get("boardTypeName") ?? "";
  const roomName = searchParams.get("roomName") ?? "";
  const checkIn = searchParams.get("checkIn") ?? "";
  const checkOut = searchParams.get("checkOut") ?? "";
  const adults = parseInt(searchParams.get("adults") ?? "2", 10);
  const childAgesRaw = searchParams.get("childAges") ?? "";
  const childAges = childAgesRaw.split(",").filter(Boolean).map(Number);
  const nationality = searchParams.get("nationality") ?? "TR";
  const currency = searchParams.get("currency") ?? "EUR";
  const totalPrice = parseFloat(searchParams.get("totalPrice") ?? "0");

  const totalGuests = adults + childAges.length;

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
    getValues,
  } = useForm<CreateBookingInput>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      roomSearchId,
      priceCode,
      hotelCode,
      hotelName: hotelName || undefined,
      boardType: boardType || undefined,
      roomType: roomName || undefined,
      checkIn,
      checkOut,
      totalPrice,
      currency,
      contact: { name: "", surname: "", email: "", phone: "" },
      rooms: [
        {
          guests: Array.from({ length: totalGuests }, (_, i) => ({
            name: "",
            surname: "",
            type: i < adults ? ("Adult" as const) : ("Child" as const),
            age: i < adults ? undefined : childAges[i - adults],
            gender: "Male" as const,
            nationality: "TR",
          })),
        },
      ],
    },
  });

  const handleNext = async () => {
    let valid = false;
    if (currentStep === 0) {
      valid = await trigger("contact");
    } else if (currentStep === 1) {
      valid = await trigger("rooms");
    } else {
      valid = true;
    }
    if (valid) setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const onSubmit = async (values: CreateBookingInput) => {
    setLoading(true);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Rezervasyon oluşturulurken hata oluştu");
        return;
      }
      const bookingNumber =
        data.reservation?.bookingNumber ??
        data.bookingConfirmation?.bookingNumber ??
        data.reservation?.id ??
        "";
      router.push(`/booking/confirmation?bookingNumber=${bookingNumber}`);
    } catch {
      toast.error("Rezervasyon oluşturulurken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Stepper */}
          <div className="mb-8">
            <Stepper steps={STEPS} currentStep={currentStep} />
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* Form area */}
              <div className="flex-1 min-w-0">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  {currentStep === 0 && (
                    <ContactForm register={register} errors={errors} />
                  )}

                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Misafir Bilgileri
                      </h3>
                      {Array.from({ length: adults }, (_, i) => (
                        <GuestForm
                          key={`adult-${i}`}
                          index={i}
                          roomIndex={0}
                          register={register}
                          errors={errors}
                          type="Adult"
                        />
                      ))}
                      {childAges.map((age, i) => (
                        <GuestForm
                          key={`child-${i}`}
                          index={adults + i}
                          roomIndex={0}
                          register={register}
                          errors={errors}
                          type="Child"
                        />
                      ))}
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Rezervasyonunuzu Onaylayın
                      </h3>
                      <p className="text-sm text-gray-500">
                        Girdiğiniz bilgileri kontrol edin ve onaylayın. Rezervasyon
                        oluşturduktan sonra email ile bilgilendirme yapılacaktır.
                      </p>

                      {/* Contact summary */}
                      {(() => {
                        const contact = getValues("contact");
                        return (
                          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                            <p className="text-sm font-semibold text-gray-700 mb-2">
                              İletişim
                            </p>
                            <p className="text-sm text-gray-600">
                              {contact.name} {contact.surname}
                            </p>
                            <p className="text-sm text-gray-600">{contact.email}</p>
                            <p className="text-sm text-gray-600">{contact.phone}</p>
                          </div>
                        );
                      })()}

                      {/* Guests summary */}
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                          Misafirler ({totalGuests} kişi)
                        </p>
                        {getValues("rooms.0.guests")?.map((guest, idx) => (
                          <p key={idx} className="text-sm text-gray-600">
                            {guest.name} {guest.surname} —{" "}
                            {guest.type === "Adult" ? "Yetişkin" : `Çocuk (${guest.age} yaş)`}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation buttons */}
                <div className="mt-4 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep((s) => Math.max(s - 1, 0))}
                    disabled={currentStep === 0}
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Geri
                  </Button>

                  {currentStep < STEPS.length - 1 ? (
                    <Button type="button" onClick={handleNext}>
                      İleri
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  ) : (
                    <Button type="submit" loading={loading}>
                      <Send className="h-4 w-4" aria-hidden="true" />
                      Rezervasyonu Tamamla
                    </Button>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="w-full lg:w-80 shrink-0">
                <BookingSummary
                  bookingData={{
                    hotelName: hotelName || hotelCode,
                    roomType: roomName || undefined,
                    boardType: boardTypeName || boardType || undefined,
                    checkIn,
                    checkOut,
                    originalPrice: totalPrice,
                    finalPrice: totalPrice,
                    currency,
                  }}
                />
              </div>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
