// Geçerli kart markaları (küçük rozetler). Resmî logo dosyaları gelene kadar
// markaların renk ve yazı biçimine yakın basit çizimler.

import s from "./odeme.module.css";

export function KartLogolari() {
  return (
    <div className={s.kartlar} role="img" aria-label="Geçerli kartlar: Visa, Mastercard, Troy, American Express">
      <span title="Visa">
        <svg viewBox="0 0 48 30" aria-hidden="true">
          <text x="24" y="20.5" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontStyle="italic" fontSize="13" letterSpacing=".5" fill="#1A1F71">VISA</text>
        </svg>
      </span>
      <span title="Mastercard">
        <svg viewBox="0 0 48 30" aria-hidden="true">
          <defs>
            <clipPath id="mc-kirp"><circle cx="19.5" cy="15" r="8.5" /></clipPath>
          </defs>
          <circle cx="19.5" cy="15" r="8.5" fill="#EB001B" />
          <circle cx="28.5" cy="15" r="8.5" fill="#F79E1B" />
          <circle cx="28.5" cy="15" r="8.5" fill="#FF5F00" clipPath="url(#mc-kirp)" />
        </svg>
      </span>
      <span title="Troy">
        <svg viewBox="0 0 48 30" aria-hidden="true">
          <text x="24" y="19.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="12.5" fill="#1d1d1b">troy</text>
          <circle cx="37.5" cy="10" r="2" fill="#00A99D" />
        </svg>
      </span>
      <span title="American Express" className={s.amex}>
        <svg viewBox="0 0 48 30" aria-hidden="true">
          <rect width="48" height="30" rx="4" fill="#016FD0" />
          <text x="24" y="19" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="10" letterSpacing=".8" fill="#fff">AMEX</text>
        </svg>
      </span>
    </div>
  );
}
