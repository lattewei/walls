export function IconHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path d="M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.8Z" fill="currentColor" />
    </svg>
  );
}

export function IconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" fill="currentColor" />
    </svg>
  );
}

export function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M10.5 3a7.5 7.5 0 0 1 5.9 12.1l3.7 3.8-1.4 1.4-3.8-3.7A7.5 7.5 0 1 1 10.5 3Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 3 5 6v6c0 4.4 2.9 8.4 7 9.5 4.1-1.1 7-5.1 7-9.5V6l-7-3Z" fill="currentColor" />
    </svg>
  );
}

export function IconPanel({ folded }: { folded: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      {folded ? (
        <path d="M4 5h16v14H4V5Zm2 2v10h4V7H6Z" fill="currentColor" />
      ) : (
        <path d="M4 5h16v14H4V5Zm10 2v10h4V7h-4Z" fill="currentColor" />
      )}
    </svg>
  );
}

export function IconPlay({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M8 5.5v13l11-6.5L8 5.5Z" fill="currentColor" />
    </svg>
  );
}

export function IconPause({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M6 5h4v14H6V5Zm8 0h4v14h-4V5Z" fill="currentColor" />
    </svg>
  );
}

export function IconPrev() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
      <path d="M6 6h2.2v12H6V6Zm3.2 6 9.3 6.2V5.8L9.2 12Z" fill="currentColor" />
    </svg>
  );
}

export function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" fill="currentColor" />
    </svg>
  );
}

export function IconUp() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path d="M11 19V8.4l-4.3 4.3-1.4-1.4L12 4.6l6.7 6.7-1.4 1.4L13 8.4V19h-2Z" fill="currentColor" />
    </svg>
  );
}

export function IconEdit() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path d="M4 16.5V20h3.5L18.8 8.7l-3.5-3.5L4 16.5Zm16.7-9.2-1.4 1.4-3.5-3.5 1.4-1.4a1 1 0 0 1 1.4 0l2.1 2.1a1 1 0 0 1 0 1.4Z" fill="currentColor" />
    </svg>
  );
}

export function IconTheme({ light }: { light: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      {light ? (
        <path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0-3h2v2h-2V4ZM12 18h2v2h-2v-2ZM4 11h2v2H4v-2Zm14 0h2v2h-2v-2ZM6.2 6.2l1.4-1.4 1.4 1.4-1.4 1.4-1.4-1.4Zm9.8 9.8 1.4-1.4 1.4 1.4-1.4 1.4-1.4-1.4ZM6.2 17.8l1.4-1.4 1.4 1.4-1.4 1.4-1.4-1.4Zm9.8-9.8 1.4-1.4 1.4 1.4-1.4 1.4-1.4-1.4Z" fill="currentColor" />
      ) : (
        <path d="M14.5 3.2A8 8 0 1 0 20.8 14 6.2 6.2 0 0 1 14.5 3.2Z" fill="currentColor" />
      )}
    </svg>
  );
}

export function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z" fill="currentColor" />
    </svg>
  );
}

export function IconNavSearch() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none">
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16.2 16.2 20 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconNavHome() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function IconNavNew() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function IconNavRadio() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none">
      <path d="M8.5 14.5a4.2 4.2 0 0 1 7 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5.5 11.2a8 8 0 0 1 13 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M2.8 8.2a11.2 11.2 0 0 1 18.4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="17.2" r="1.3" fill="currentColor" />
    </svg>
  );
}

export function IconPerson() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="none">
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.5 19.2c1.2-3 3.5-4.4 6.5-4.4s5.3 1.4 6.5 4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden fill="none">
      <path d="M9 5.5 16.5 12 9 18.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconMore() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <circle cx="6" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="18" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function IconShuffle() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="none">
      <path d="M4 7h3.2l10.6 10H20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17h3.2L11 13.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="m16 7 4 0 0 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 5.5 19.5 7 16 8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 15.5 19.5 17 16 18.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconRepeat() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="none">
      <path d="M7 7h9.2a3 3 0 0 1 3 3v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M17 17H7.8a3 3 0 0 1-3-3v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14.5 4.5 17.5 7 14.5 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 14.5 6.5 17 9.5 19.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconNext() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
      <path d="M15.8 6H18v12h-2.2V6ZM5.5 5.8v12.4L14.8 12 5.5 5.8Z" fill="currentColor" />
    </svg>
  );
}
