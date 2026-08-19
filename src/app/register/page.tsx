// Müşteri kaydı artık ayrı bir sayfa değil: /login'deki kod/sosyal akışı
// hesabı otomatik oluşturur. Eski linkler kırılmasın diye yönlendiriyoruz.

import { redirect } from "next/navigation";

export default function RegisterPage() {
  redirect("/login");
}
