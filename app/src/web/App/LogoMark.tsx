interface Props {
  className?: string | undefined;
}

/** Renders the Intersect brand mark as two communities with a shared center. */
export function LogoMark({ className }: Props) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="24" cy="32" r="15" fill="none" stroke="currentColor" strokeWidth="4" />
      <circle cx="40" cy="32" r="15" fill="none" stroke="currentColor" strokeWidth="4" />
      <path d="M32 19.31a15 15 0 0 1 0 25.38 15 15 0 0 1 0-25.38Z" fill="currentColor" />
    </svg>
  );
}
