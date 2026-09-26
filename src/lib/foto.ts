// Etscore otel fotoğrafları Odamax'tan geliyor ve adresteki boyutla
// ölçekleniyor: …/img/1024x768/… → …/img/640x480/… (aynı görsel, ~2 kat küçük
// dosya; 480x360 ~3 kat). Kartlar ~300 px genişlikte: 1024'lük dosya
// indirmek mobilde sayfayı yavaşlatıyordu. Başka kaynaklı adresler aynen kalır.

const ODAMAX = /^(https:\/\/images\.odamax\.com\/img\/)\d+x\d+(\/.+)$/;

type Boyut = "400x300" | "480x360" | "640x480" | "1024x768";

export function fotoBoyutu(url: string, boyut: Boyut): string {
  const m = url.match(ODAMAX);
  return m ? `${m[1]}${boyut}${m[2]}` : url;
}

/**
 * Kart fotoğrafı: src + srcSet (tarayıcı ekran genişliğine ve piksel
 * yoğunluğuna göre seçer). `sizes` kartın gösterildiği genişlik.
 */
export function kartFotosu(url: string, sizes = "(max-width: 720px) 92vw, 320px") {
  if (!ODAMAX.test(url)) return { src: url };
  return {
    src: fotoBoyutu(url, "640x480"),
    srcSet: `${fotoBoyutu(url, "480x360")} 480w, ${fotoBoyutu(url, "640x480")} 640w, ${fotoBoyutu(url, "1024x768")} 1024w`,
    sizes,
  };
}
