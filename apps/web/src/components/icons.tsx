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

export function IconNext() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
      <path d="M15.8 6H18v12h-2.2V6ZM5.5 5.8v12.4L14.8 12 5.5 5.8Z" fill="currentColor" />
    </svg>
  );
}
