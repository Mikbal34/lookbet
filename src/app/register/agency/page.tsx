// Acente başvurusu artık ayrı bir sayfa değil: acente girişinden sonra
// panelde bir kez doldurulur. Eski linkler kırılmasın diye yönlendiriyoruz.

import { redirect } from "next/navigation";

export default function AcenteBasvuruYonlendirme() {
  redirect("/agency/login");
}
