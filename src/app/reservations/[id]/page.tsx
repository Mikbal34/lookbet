import { RezervasyonDetay } from "@/components/rezervasyonlar/rezervasyon-detay";

export default async function RezervasyonSayfasi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RezervasyonDetay id={id} />;
}
