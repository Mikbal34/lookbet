// LookBeds arayüz ikonları — siyah çizgi, 24'lük ızgara, yuvarlak uçlar.
// Kaynak: tasarım ikon seti (82 ikon). Kapalı yuvarlak biçimler "yastık"
// (köşesi geniş yuvarlatılmış kare), yazı tipiyle aynı dil. Renk metnin
// rengini alır (currentColor); dolgu yok, yalnız noktalar dolu.
//
// Kullanım: <Ikon ad="search" /> · <Ikon ad="heart" boyut={26} kalinlik={2} />

import * as React from "react";

const YOL = {
  "search": "<rect x=\"3.5\" y=\"3.5\" width=\"13\" height=\"13\" rx=\"4.8\"/><path d=\"M15.2 15.2 20.5 20.5\"/>",
  "pin": "<path d=\"M12 21.5s-7-6.1-7-11.6a7 7 0 0 1 14 0c0 5.5-7 11.6-7 11.6z\"/><rect x=\"9.5\" y=\"7.4\" width=\"5\" height=\"5\" rx=\"2\"/>",
  "calendar": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"4\"/><path d=\"M3 10h18M8 3v4M16 3v4\"/>",
  "user": "<rect x=\"8\" y=\"3.5\" width=\"8\" height=\"8\" rx=\"3.2\"/><path d=\"M4.5 20.5v-.5a5 5 0 0 1 5-5h5a5 5 0 0 1 5 5v.5\"/>",
  "guests": "<rect x=\"5\" y=\"4\" width=\"7\" height=\"7\" rx=\"2.8\"/><path d=\"M2.5 20v-.5A4.5 4.5 0 0 1 7 15h3a4.5 4.5 0 0 1 4.5 4.5v.5M15.5 4.3a3.4 3.4 0 0 1 0 6.4M17.5 15a4 4 0 0 1 4 4v1\"/>",
  "heart": "<path d=\"M12 20s-8-4.9-8-10.5A4.5 4.5 0 0 1 8.5 5c1.5 0 2.7.7 3.5 1.9C12.8 5.7 14 5 15.5 5A4.5 4.5 0 0 1 20 9.5C20 15.1 12 20 12 20z\"/>",
  "share": "<path d=\"M12 3v12M7.5 7.5 12 3l4.5 4.5M5 12v6a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-6\"/>",
  "filter": "<path d=\"M3 7h9.5M17.5 7H21M3 17h3.5M11.5 17H21\"/><rect x=\"12.5\" y=\"4.5\" width=\"5\" height=\"5\" rx=\"2\"/><rect x=\"6.5\" y=\"14.5\" width=\"5\" height=\"5\" rx=\"2\"/>",
  "sort": "<path d=\"M7 4v16M3.5 7.5 7 4l3.5 3.5M17 20V4M13.5 16.5 17 20l3.5-3.5\"/>",
  "map": "<path d=\"M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4zM9 4v14M15 6v14\"/>",
  "list": "<path d=\"M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01\"/>",
  "menu": "<path d=\"M4 7h16M4 12h16M4 17h16\"/>",
  "globe": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3c-2.5 2.6-3.8 5.6-3.8 9s1.3 6.4 3.8 9c2.5-2.6 3.8-5.6 3.8-9S14.5 5.6 12 3z\"/>",
  "bell": "<path d=\"M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15L6 16zM10 20.5a2 2 0 0 0 4 0\"/>",
  "close": "<path d=\"M6 6l12 12M18 6 6 18\"/>",
  "back": "<path d=\"M20 12H4M10 6l-6 6 6 6\"/>",
  "chevron-left": "<path d=\"M15 5l-7 7 7 7\"/>",
  "chevron-right": "<path d=\"M9 5l7 7-7 7\"/>",
  "chevron-down": "<path d=\"M5 9l7 7 7-7\"/>",
  "plus": "<path d=\"M12 5v14M5 12h14\"/>",
  "minus": "<path d=\"M5 12h14\"/>",
  "check": "<path d=\"M4.5 12.5l5 5 10-11\"/>",
  "info": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"6.2\"/><path d=\"M12 11v5.5M12 7.5h.01\"/>",
  "star": "<path d=\"M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8L12 3.5z\"/>",
  "hotel": "<path d=\"M4 21V5.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2V21M16 10h2a2 2 0 0 1 2 2v9M2.5 21h19M8 8h1M11 8h1M8 12h1M11 12h1M9 21v-4h2v4\"/>",
  "door": "<path d=\"M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M3 21h18M15 12h.01\"/>",
  "bed": "<path d=\"M3 5v14M3 15h18M21 19v-6a3 3 0 0 0-3-3h-7v5\"/><rect x=\"5.5\" y=\"10.5\" width=\"3.5\" height=\"4.5\" rx=\"1.5\"/>",
  "bath": "<path d=\"M3 12h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-2zM7 19l-1 2M17 19l1 2M6 12V6a2.5 2.5 0 0 1 4.6-1.4\"/>",
  "wifi": "<path d=\"M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.7 15.8a5 5 0 0 1 6.6 0M12 19.5h.01\"/>",
  "parking": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"5\"/><path d=\"M9.5 17V7.5H13a3 3 0 0 1 0 6H9.5\"/>",
  "pool": "<path d=\"M8.5 14.5V5.5a2 2 0 0 1 2-2M15.5 14.5V5.5a2 2 0 0 1 2-2M8.5 7.5h7M8.5 11h7M3 17.5q1.5-1.3 3 0t3 0 3 0 3 0 3 0 3 0M3 21q1.5-1.3 3 0t3 0 3 0 3 0 3 0 3 0\"/>",
  "breakfast": "<path d=\"M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9zM16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5v2.5M12 3.5v2.5M3 21.5h14\"/>",
  "restaurant": "<path d=\"M6.5 3v5.5a2.5 2.5 0 0 0 5 0V3M9 3v18M17.5 21V3c-1.9 1.5-2.9 4-2.9 7.5V14h2.9\"/>",
  "ac": "<path d=\"M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 6l2.5-1.5M9.5 19.5 12 18l2.5 1.5\"/>",
  "pet": "<path d=\"M8 17.5c0-2.5 1.8-4.5 4-4.5s4 2 4 4.5c0 1.7-1.6 2.5-4 2.5s-4-.8-4-2.5z\"/><ellipse cx=\"5.5\" cy=\"11\" rx=\"1.6\" ry=\"2\" fill=\"currentColor\"/><ellipse cx=\"9.5\" cy=\"6.8\" rx=\"1.6\" ry=\"2\" fill=\"currentColor\"/><ellipse cx=\"14.5\" cy=\"6.8\" rx=\"1.6\" ry=\"2\" fill=\"currentColor\"/><ellipse cx=\"18.5\" cy=\"11\" rx=\"1.6\" ry=\"2\" fill=\"currentColor\"/>",
  "spa": "<path d=\"M12 20c-4.5 0-8-3-8.5-7 2.9 0 6.2 1.5 8.5 4 2.3-2.5 5.6-4 8.5-4-.5 4-4 7-8.5 7zM12 17c-1.8-2-2.6-4.3-2.6-6.8S10.3 5.4 12 4c1.7 1.4 2.6 3.7 2.6 6.2S13.8 15 12 17z\"/>",
  "gym": "<path d=\"M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11\"/>",
  "beach": "<path d=\"M3.5 11.5a8.5 8.5 0 0 1 17 0zM12 11.5V19a2 2 0 0 0 4 0\"/>",
  "sea-view": "<path d=\"M8 11a4 4 0 0 1 8 0M12 3.5V5M5.5 6.5l1 1M18.5 6.5l-1 1M3 15q2.25-1.8 4.5 0t4.5 0 4.5 0 4.5 0M3 19.5q2.25-1.8 4.5 0t4.5 0 4.5 0 4.5 0\"/>",
  "transfer": "<path d=\"M12 2.5c1 0 1.6 1 1.6 2.2V9l7.4 4.3v2l-7.4-2.2v4.4l2.4 1.9v1.6L12 20.2l-4 1v-1.6l2.4-1.9v-4.4L3 15.3v-2L10.4 9V4.7c0-1.2.6-2.2 1.6-2.2z\"/>",
  "key": "<rect x=\"2.5\" y=\"9\" width=\"8\" height=\"8\" rx=\"3.2\"/><path d=\"M10.5 13h10M17.5 13v3M20.5 13v2.5\"/>",
  "photos": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"4\"/><path d=\"M3.5 17l5-5 4 4 2.5-2.5 5.5 5.5M15.5 9h.01\"/>",
  "clock": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"6.2\"/><path d=\"M12 7.5V12l3 2\"/>",
  "card": "<rect x=\"2.5\" y=\"5\" width=\"19\" height=\"14\" rx=\"3.5\"/><path d=\"M2.5 10h19M6 15h4\"/>",
  "secure": "<path d=\"M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6L12 3zM8.5 12l2.5 2.5 4.5-5\"/>",
  "free-cancel": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"4\"/><path d=\"M3 10h18M8 3v4M16 3v4M10 13.5l4 4M14 13.5l-4 4\"/>",
  "discount": "<path d=\"M3.5 11.6V5a1.5 1.5 0 0 1 1.5-1.5h6.6a1.5 1.5 0 0 1 1.1.4l7.4 7.4a1.5 1.5 0 0 1 0 2.1l-6.6 6.6a1.5 1.5 0 0 1-2.1 0l-7.4-7.4a1.5 1.5 0 0 1-.5-1zM8 8h.01\"/>",
  "phone": "<path d=\"M5 3.5h3l1.5 4.5-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4.5 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 3 5.5a2 2 0 0 1 2-2z\"/>",
  "mail": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"3.5\"/><path d=\"M3.5 7.5l8.5 6 8.5-6\"/>",
  "chat": "<path d=\"M4 6.5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-6L6.5 21v-3.5H7a3 3 0 0 1-3-3v-8z\"/>",
  "help": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"6.2\"/><path d=\"M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.4M12 17h.01\"/>",
  "logout": "<path d=\"M10 4H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h3M16 16l4-4-4-4M20 12H9.5\"/>",
  "arrow-right": "<path d=\"M4 12h16M14 6l6 6-6 6\"/>",
  "chevron-up": "<path d=\"M5 15l7-7 7 7\"/>",
  "external": "<path d=\"M14 4h6v6M20 4l-9 9M18 14v3a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3h3\"/>",
  "more": "<circle cx=\"5.5\" cy=\"12\" r=\".9\" fill=\"currentColor\"/><circle cx=\"12\" cy=\"12\" r=\".9\" fill=\"currentColor\"/><circle cx=\"18.5\" cy=\"12\" r=\".9\" fill=\"currentColor\"/>",
  "dashboard": "<rect x=\"3.5\" y=\"3.5\" width=\"7\" height=\"7\" rx=\"2.5\"/><rect x=\"13.5\" y=\"3.5\" width=\"7\" height=\"7\" rx=\"2.5\"/><rect x=\"3.5\" y=\"13.5\" width=\"7\" height=\"7\" rx=\"2.5\"/><rect x=\"13.5\" y=\"13.5\" width=\"7\" height=\"7\" rx=\"2.5\"/>",
  "warning": "<path d=\"M10.3 4.2a2 2 0 0 1 3.4 0l7.6 13.2a2 2 0 0 1-1.7 3H4.4a2 2 0 0 1-1.7-3L10.3 4.2zM12 9.5V14M12 17h.01\"/>",
  "error": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"6.2\"/><path d=\"M12 7.5V13M12 16.5h.01\"/>",
  "success": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"6.2\"/><path d=\"M8 12.3l2.8 2.7 5.2-5.5\"/>",
  "confirmed": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"4\"/><path d=\"M3 10h18M8 3v4M16 3v4\"/><path d=\"M9 15.3l2.2 2.2 4-4.2\"/>",
  "loading": "<path d=\"M21 12a9 9 0 1 1-6.2-8.6\"/>",
  "login": "<path d=\"M14 4h3a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-3M10 8l4 4-4 4M14 12H3.5\"/>",
  "lock": "<rect x=\"4.5\" y=\"10.5\" width=\"15\" height=\"10.5\" rx=\"3.5\"/><path d=\"M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5V17\"/>",
  "eye": "<path d=\"M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z\"/><rect x=\"9\" y=\"9\" width=\"6\" height=\"6\" rx=\"2.4\"/>",
  "eye-off": "<path d=\"M3 3l18 18M10.6 5.6c.5-.1.9-.1 1.4-.1 6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.4 3.2M6.6 6.6C3.9 8.3 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.9 0 3.5-.6 4.9-1.5M9.9 9.9a3 3 0 0 0 4.2 4.2\"/>",
  "save": "<path d=\"M7 3.5h9l4.5 4.5v9a3.5 3.5 0 0 1-3.5 3.5H7A3.5 3.5 0 0 1 3.5 17V7A3.5 3.5 0 0 1 7 3.5zM8 20.5V15h8v5.5M8 3.5v4h6\"/>",
  "send": "<path d=\"M20.5 3.5 3.5 10.5l7 3 3 7 7-17zM10.5 13.5l4-4\"/>",
  "child": "<rect x=\"4\" y=\"5\" width=\"16\" height=\"15.5\" rx=\"6.5\"/><path d=\"M12 5a2 2 0 0 1 2-2M9 12h.01M15 12h.01M10 15.5a2.5 2.5 0 0 0 4 0\"/>",
  "car": "<path d=\"M3.5 16.5V13a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3v3.5zM6.5 10l1.4-3.2a2 2 0 0 1 1.8-1.3h4.6a2 2 0 0 1 1.8 1.3L17.5 10M6 16.5V19M18 16.5V19M7 13.3h.01M17 13.3h.01\"/>",
  "train": "<rect x=\"5\" y=\"3\" width=\"14\" height=\"14\" rx=\"4\"/><path d=\"M5 10.5h14M8.5 14h.01M15.5 14h.01M8 20.5l1.5-3.5M16 20.5 14.5 17\"/>",
  "nature": "<path d=\"M12 3.5c3 0 5.5 2.4 5.5 5.4 0 1-.3 1.9-.7 2.7A4 4 0 0 1 15 19H9a4 4 0 0 1-1.8-7.4c-.4-.8-.7-1.7-.7-2.7 0-3 2.5-5.4 5.5-5.4zM12 21v-8M12 16l-2.5-2\"/>",
  "landmark": "<path d=\"M3 9.5 12 4l9 5.5M4 9.5h16M5.5 9.5V18M10 9.5V18M14 9.5V18M18.5 9.5V18M3 21h18M4 18h16\"/>",
  "featured": "<path d=\"M11 3.5c.6 3.8 1.9 5.9 5.5 6.5-3.6.6-4.9 2.7-5.5 6.5-.6-3.8-1.9-5.9-5.5-6.5 3.6-.6 4.9-2.7 5.5-6.5zM18 14.5c.3 1.6.9 2.5 2.5 2.8-1.6.3-2.2 1.2-2.5 2.8-.3-1.6-.9-2.5-2.5-2.8 1.6-.3 2.2-1.2 2.5-2.8z\"/>",
  "image-off": "<path d=\"M3 3l18 18M20.5 16V8a4 4 0 0 0-4-4H8M4.5 5.5A4 4 0 0 0 3 8.6V16a4 4 0 0 0 4 4h9.5a4 4 0 0 0 2.2-.7M3.5 17l5-5 4 4\"/>",
  "quote": "<g transform=\"rotate(180 12 12)\"><rect x=\"3.5\" y=\"6\" width=\"7\" height=\"6\" rx=\"2\"/><rect x=\"13.5\" y=\"6\" width=\"7\" height=\"6\" rx=\"2\"/><path d=\"M10.5 9v3.5c0 3-1.5 5-4.5 5.5M20.5 9v3.5c0 3-1.5 5-4.5 5.5\"/></g>",
  "thumbs-up": "<path d=\"M7.5 10.5v10M7.5 10.5 11 3.8a1.9 1.9 0 0 1 3.4 1.5l-1 4.2h4.8a2.5 2.5 0 0 1 2.4 3.1l-1.5 5.9a2.5 2.5 0 0 1-2.4 1.9H7.5M7.5 20.5H5A1.5 1.5 0 0 1 3.5 19v-7A1.5 1.5 0 0 1 5 10.5h2.5\"/>",
  "thumbs-down": "<g transform=\"matrix(1 0 0 -1 0 24)\"><path d=\"M7.5 10.5v10M7.5 10.5 11 3.8a1.9 1.9 0 0 1 3.4 1.5l-1 4.2h4.8a2.5 2.5 0 0 1 2.4 3.1l-1.5 5.9a2.5 2.5 0 0 1-2.4 1.9H7.5M7.5 20.5H5A1.5 1.5 0 0 1 3.5 19v-7A1.5 1.5 0 0 1 5 10.5h2.5\"/></g>",
  "wallet": "<rect x=\"3.5\" y=\"6.5\" width=\"17\" height=\"14\" rx=\"3.5\"/><path d=\"M6 6.5l9.5-3a2 2 0 0 1 2.5 1.9v1.1M20.5 11.5H17a2 2 0 0 0 0 4h3.5\"/>",
  "trend": "<path d=\"M3 17l6-6 4 4 8-8M15 7h6v6\"/>",
  "download": "<path d=\"M12 3.5v12M7.5 11l4.5 4.5 4.5-4.5M4 17v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1\"/>",
  "document": "<path d=\"M8 3h5.5L19 8.5V18a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zM13.5 3v5.5H19M8.5 13h7M8.5 16.5h5\"/>",
} as const;

export type IkonAdi = keyof typeof YOL;

export interface IkonProps extends Omit<React.SVGProps<SVGSVGElement>, "ref"> {
  ad: IkonAdi;
  /** Piksel; varsayılan 20. */
  boyut?: number;
  /** Çizgi kalınlığı; varsayılan 1.75. */
  kalinlik?: number;
}

export function Ikon({ ad, boyut = 20, kalinlik = 1.75, ...p }: IkonProps) {
  return (
    <svg
      width={boyut}
      height={boyut}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={kalinlik}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...p}
      // İçerik sabit, bu dosyadaki tasarım verisi; dışarıdan gelmiyor.
      dangerouslySetInnerHTML={{ __html: YOL[ad] }}
    />
  );
}
