import type { ReactNode } from 'react';
const paths: Record<string, ReactNode> = {
  home: (
    <>
      <path d="m3 10 9-7 9 7v10H6V10" />
      <path d="M9 20v-7h6v7" />
    </>
  ),
  heart: (
    <>
      <path d="M20.5 4.7a5.4 5.4 0 0 0-8.5 1.4 5.4 5.4 0 0 0-8.5-1.4C-1 9.1 5 15.4 12 21c7-5.6 13-11.9 8.5-16.3Z" />
      <path d="M4 11h4l2-4 4 8 2-4h4" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 3c-7-1-15 2-15 9a6 6 0 0 0 6 6c7 0 10-8 9-15Z" />
      <path d="M3 21 15 9" />
    </>
  ),
  utensils: (
    <>
      <path d="M4 3v5a3 3 0 0 0 6 0V3M7 3v18M20 3c-5 1-6 8-1 10h1V3Zm0 10v8" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="14" rx="3" />
      <path d="M8 7V4h8v3M3 12c5 4 13 4 18 0M12 12v4" />
    </>
  ),
  wallet: (
    <>
      <path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0-3 3v13a2 2 0 0 0 2 2h16V7H5a1 1 0 0 1 0-2" />
      <path d="M20 11h-5v6h5" />
      <circle cx="16.8" cy="14" r=".6" />
    </>
  ),
  moon: (
    <>
      <path d="M20.4 14.7A9 9 0 0 1 9.3 3.6a9 9 0 1 0 11.1 11.1Z" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
    </>
  ),
  settings: (
    <>
      <path d="m9 3-1 3-3 1-2 4 2 2v3l3 2 1 3h5l1-3 3-2v-3l2-2-2-4-3-1-1-3Z" />
      <circle cx="11.5" cy="12" r="3" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v7c0 4 16 4 16 0V5M4 12v7c0 4 16 4 16 0v-7" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7L12 3ZM20 2v4M18 4h4" />
    </>
  ),
  message: (
    <>
      <path d="M21 15a4 4 0 0 1-4 4H9l-6 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
      <path d="M7 8h10M7 12h7" />
    </>
  ),
  'check-list': (
    <>
      <path d="m3 6 2 2 3-4M11 6h10M3 13l2 2 3-4M11 13h10M3 20l2 2 3-4M11 20h10" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H5v20h14V7l-5-5ZM14 2v5h5M8 12h8M8 16h6" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7h.01" />
    </>
  ),
  link: (
    <>
      <path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m0 2 1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0" />
    </>
  ),
  x: (
    <>
      <path d="m6 6 12 12M6 18 18 6" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  check: (
    <>
      <path d="m4 12 5 5L20 6" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  'arrow-up': (
    <>
      <path d="M12 19V5m-5 5 5-5 5 5" />
    </>
  ),
  'arrow-right': (
    <>
      <path d="M4 12h16m-5-5 5 5-5 5" />
    </>
  ),
  shield: (
    <>
      <path d="m12 2 8 3v7c0 5-8 10-8 10S4 17 4 12V5l8-3Z" />
      <path d="m8 11 3 3 5-5" />
    </>
  ),
  grip: (
    <>
      <circle cx="9" cy="5" r="1" />
      <circle cx="15" cy="5" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="9" cy="19" r="1" />
      <circle cx="15" cy="19" r="1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="13" rx="2" />
      <path d="M16 8V3H3v13h5" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': (
    <>
      <path d="m3 3 18 18M10 5c6-1 12 7 12 7l-3 4M6 6c-3 2-4 6-4 6s4 7 10 7c2 0 4-1 5-2M10 10l4 4" />
    </>
  ),
};
export function Icon({ name }: { name: string }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name] ?? paths.info}
    </svg>
  );
}
