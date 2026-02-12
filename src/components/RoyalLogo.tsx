interface RoyalLogoProps {
  large?: boolean;
  className?: string;
}

export function RoyalLogo({ large = false, className = "" }: RoyalLogoProps) {
  const widthClass = large ? "h-16 w-[350px]" : "h-10 w-[220px]";

  return (
    <svg
      viewBox="0 0 420 120"
      className={`${widthClass} ${className}`.trim()}
      fill="none"
      aria-label="Aetheris Airways Logo"
    >
      <defs>
        <linearGradient id="cloudGlow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6c59ff" />
          <stop offset="100%" stopColor="#35e9ff" />
        </linearGradient>
        <linearGradient id="jetGlow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffd57a" />
          <stop offset="100%" stopColor="#ffefbe" />
        </linearGradient>
      </defs>

      <path d="M34 63c0-19 16-34 34-34h44c18 0 34 15 34 34 0 2 0 4-1 6h26c10 0 19 8 19 19 0 10-9 18-19 18H62c-16 0-29-13-29-29 0-5 1-10 3-14z" fill="none" stroke="url(#cloudGlow)" strokeWidth="6" strokeLinecap="round" />
      <path d="M96 52h70l30-17 11 6-16 11 19 6-9 6-35-6H95z" fill="url(#jetGlow)" />
      <path d="M160 51h18" stroke="#1b1135" strokeWidth="2" strokeLinecap="round" />
      <path d="M205 47l10-5v9l-10-4z" fill="#fff3cf" />
      <circle cx="85" cy="48" r="2" fill="#35e9ff" />

      <text x="228" y="48" fill="#f4f0ff" fontFamily="var(--font-inter)" fontSize="27" fontWeight="800" letterSpacing="1.2">
        AETHERIS
      </text>
      <text x="228" y="73" fill="#99b9ff" fontFamily="var(--font-inter)" fontSize="12" fontWeight="700" letterSpacing="3.2">
        FLIGHT AND CLOUD
      </text>
    </svg>
  );
}
