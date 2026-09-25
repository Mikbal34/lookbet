// Özel komisyonlar Fiyatlar sayfasında.
import { redirect } from "next/navigation";

export default function YonetimKomisyonlar() {
  redirect("/admin/price-rules");
}
