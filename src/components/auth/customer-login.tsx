"use client";

// Müşteri girişi — ŞİFRESİZ:
//  1) Google / Apple ile devam et
//  2) Email → 6 haneli kod → giriş (hesap yoksa otomatik açılır)
// Acente/admin girişi ayrı sayfadadır (/agency/login).

import * as React from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type Step = "email" | "code";

export function CustomerLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [step, setStep] = React.useState<Step>("email");
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [resendIn, setResendIn] = React.useState(0);

  // Tekrar gönder sayacı
  React.useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const requestCode = async () => {
    setError(null);
    setInfo(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Geçerli bir email adresi girin");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Kod gönderilemedi");
        return;
      }
      setStep("code");
      setResendIn(60);
      setInfo(
        json.devCode
          ? `Geliştirme modu — kodunuz: ${json.devCode}`
          : "6 haneli kod e-posta adresine gönderildi"
      );
    } catch {
      setError("Kod gönderilemedi. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setError(null);
    if (code.trim().length !== 6) {
      setError("6 haneli kodu girin");
      return;
    }
    setLoading(true);
    try {
      const result = await signIn("email-otp", {
        redirect: false,
        email,
        code: code.trim(),
      });
      if (result?.error) {
        setError("Kod hatalı veya süresi dolmuş");
        return;
      }
      const session = await getSession();
      const role = session?.user?.role;
      const target =
        callbackUrl !== "/"
          ? callbackUrl
          : role === "ADMIN"
            ? "/admin"
            : role === "AGENCY"
              ? "/agency/dashboard"
              : "/";
      router.push(target);
      router.refresh();
    } catch {
      setError("Giriş sırasında bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Sosyal girişler — app modunda gizli:
          Google gömülü WebView'lardan OAuth'u reddediyor
          (disallowed_useragent), Apple da kısıtlıyor. Uygulamada kullanıcı
          doğrudan email + kod akışını görür. */}
      <div className="web-only space-y-2.5">
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl })}
          className={cn(
            "flex w-full items-center justify-center gap-3 h-11 rounded-lg border border-line-strong bg-white text-sm font-medium text-slate-text",
            "hover:bg-gray-50 hover:border-gray-400 transition-colors"
          )}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
            />
          </svg>
          Google ile devam et
        </button>

        <button
          type="button"
          onClick={() => signIn("apple", { callbackUrl })}
          className={cn(
            "flex w-full items-center justify-center gap-3 h-11 rounded-lg bg-black text-sm font-medium text-white",
            "hover:bg-gray-900 transition-colors"
          )}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8.98-.2 1.92-.87 3.03-.79 1.32.11 2.32.63 2.98 1.57-2.75 1.65-2.31 5.27.24 6.29-.5 1.32-1.15 2.62-2.33 4.1zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          Apple ile devam et
        </button>
      </div>

      {/* Ayraç — sosyal girişlerle birlikte gizlenir */}
      <div className="web-only relative">
        <hr className="border-gray-200" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-gray-400">
          veya email ile
        </span>
      </div>

      {/* Hata / bilgi */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}
      {info && !error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
          {info}
        </div>
      )}

      {step === "email" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            requestCode();
          }}
          className="space-y-4"
        >
          <Input
            label="E-posta adresi"
            type="email"
            placeholder="ornek@mail.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button variant="gold" type="submit" loading={loading} className="w-full" size="lg">
            <Mail className="h-4 w-4" aria-hidden="true" />
            Giriş kodu gönder
          </Button>
          <p className="text-center text-xs text-muted">
            Hesabın yoksa otomatik oluşturulur — şifre gerekmez.
          </p>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verifyCode();
          }}
          className="space-y-4"
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="otp-code"
              className="text-sm font-medium text-slate-text"
            >
              Giriş kodu
            </label>
            <input
              id="otp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="••••••"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className={cn(
                "h-14 w-full rounded-lg border border-line-strong bg-white text-center text-2xl font-bold tracking-[0.5em] text-ink",
                "placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-navy focus:border-navy transition-colors"
              )}
            />
            <p className="text-xs text-gray-500">
              <span className="font-medium text-slate-text">{email}</span>{" "}
              adresine gönderilen 6 haneli kodu girin
            </p>
          </div>

          <Button variant="gold" type="submit" loading={loading} className="w-full" size="lg">
            Giriş yap
          </Button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
                setInfo(null);
              }}
              className="inline-flex items-center gap-1 text-gray-500 hover:text-slate-text"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Email değiştir
            </button>
            <button
              type="button"
              disabled={resendIn > 0 || loading}
              onClick={requestCode}
              className="text-blue-600 hover:text-blue-700 disabled:text-gray-400 font-medium"
            >
              {resendIn > 0 ? `Tekrar gönder (${resendIn})` : "Kodu tekrar gönder"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
