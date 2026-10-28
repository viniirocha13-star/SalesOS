type PillowSvgProps = {
  variant?: "original" | "silk" | "pack" | "mask";
  fill?: string;
  accent?: string;
};

export function PillowSvg({
  variant = "original",
  fill = "#f4f1ea",
  accent = "#5f9e8f",
}: PillowSvgProps) {
  if (variant === "mask") {
    return (
      <svg viewBox="0 0 320 180" fill="none" aria-hidden="true">
        <path
          d="M40 78c18-34 74-52 120-52s102 18 120 52c8 16 8 34 0 48-18 32-74 46-120 46S58 158 40 126c-8-14-8-32 0-48Z"
          fill="#1a2a31"
        />
        <path
          d="M78 92c12-8 34-12 52-12s40 4 52 12"
          stroke="#d8c4a8"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M78 112c12 7 34 11 52 11s40-4 52-11"
          stroke="#5f9e8f"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.8"
        />
        <circle cx="42" cy="102" r="10" fill="#31484f" />
        <circle cx="278" cy="102" r="10" fill="#31484f" />
      </svg>
    );
  }

  if (variant === "silk") {
    return (
      <svg viewBox="0 0 360 360" fill="none" aria-hidden="true">
        <path
          d="M62 168c18-78 92-118 148-112 58 6 108 54 118 118 10 66-24 128-88 146-62 18-132-8-162-62-18-32-24-62-16-90Z"
          fill={fill}
        />
        <path
          d="M118 150c34-28 92-34 132-8 18 12 30 34 28 56"
          stroke={accent}
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.55"
        />
        <path
          d="M98 210c46 34 120 36 168-4"
          stroke="#d8c4a8"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.7"
        />
      </svg>
    );
  }

  if (variant === "pack") {
    return (
      <svg viewBox="0 0 360 360" fill="none" aria-hidden="true">
        <path
          d="M48 176c22-86 108-126 174-118 64 8 118 62 124 128 8 72-36 136-104 150-70 14-146-22-176-84-18-36-26-68-18-76Z"
          fill={fill}
        />
        <circle cx="250" cy="120" r="42" fill={accent} opacity="0.85" />
        <path
          d="M92 220h120"
          stroke="#2a3f4a"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.25"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 360 360" fill="none" aria-hidden="true">
      <path
        d="M54 190c12-92 98-140 168-132 72 8 126 70 128 140 2 74-54 132-124 138-72 6-148-36-170-98-12-34-12-70-2-48Z"
        fill={fill}
      />
      <path
        d="M96 168c40-42 112-52 160-18"
        stroke={accent}
        strokeWidth="12"
        strokeLinecap="round"
        opacity="0.45"
      />
      <path
        d="M108 224c48 28 118 24 164-12"
        stroke="#2a3f4a"
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.18"
      />
    </svg>
  );
}
