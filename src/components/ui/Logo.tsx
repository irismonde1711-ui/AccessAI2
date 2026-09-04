export function LogoMark({
  size = 40,
  iconOnly = false,
}: {
  size?: number;
  iconOnly?: boolean;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      {!iconOnly && <rect width="100" height="100" rx="24" fill="#00124A" />}
      <g stroke="#00B09B" strokeWidth="5" fill="#00B09B" strokeLinecap="round">
        <line x1="32" y1="32" x2="68" y2="68" />
        <line x1="68" y1="32" x2="32" y2="68" />
        <circle cx="32" cy="32" r="6" />
        <circle cx="68" cy="68" r="6" />
        <circle cx="68" cy="32" r="6" />
        <circle cx="32" cy="68" r="6" />
      </g>
    </svg>
  );
}
