"use client";

// Usage:
// <LoginForm />
// Renders email + password fields, calls NextAuth signIn("credentials") on submit.
// Alt linkler sayfa tarafından render edilir (login/page.tsx).

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { loginSchema, type LoginInput } from "@/lib/validators/auth.schema";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [showPassword, setShowPassword] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (result?.error) {
        setServerError("Email veya şifre hatalı. Lütfen tekrar deneyin.");
      } else {
        // Rol bazlı yönlendirme: admin panele, acente kendi paneline düşer.
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
      }
    } catch {
      setServerError("Giris sirasinda bir hata olustu. Lutfen tekrar deneyin.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-label="Giris formu"
      className="space-y-4"
    >
      {/* Server error */}
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
          {serverError}
        </div>
      )}

      {/* Email */}
      <Input
        label="Email Adresi"
        type="email"
        placeholder="ornek@mail.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700" htmlFor="login-password">
          Sifre
        </label>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "login-pass-error" : undefined}
            className={cn(
              "h-10 w-full rounded-lg border px-3 pr-10 text-sm text-gray-900 placeholder:text-gray-400 bg-white",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors",
              errors.password
                ? "border-red-400 focus:ring-red-400"
                : "border-gray-300 hover:border-gray-400"
            )}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {errors.password && (
          <p id="login-pass-error" role="alert" className="text-xs text-red-600">
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        loading={isSubmitting}
        className="w-full"
        size="lg"
      >
        <LogIn className="h-4 w-4" aria-hidden="true" />
        Giriş Yap
      </Button>
    </form>
  );
}
