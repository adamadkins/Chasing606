const PATHS = {
  arrow: <path d="M5 19 19 5M5 5h14v14" />,
  bag: <><path d="M5 7h14l1 14H4Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  close: <path d="m5 5 14 14M5 19 19 5" />,
  play: <path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none" />
};

/** Decorative inline icon. Size it with CSS (it is 1em by default). */
export default function Icon({ name = 'arrow', className = '' }) {
  return (
    <svg
      className={`icon ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name] ?? PATHS.arrow}
    </svg>
  );
}
