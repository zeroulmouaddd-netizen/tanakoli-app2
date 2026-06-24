"use client"

/**
 * Tanakoli Khenchela — brand logo components
 *
 * TankoliLogoIcon  : compact square icon used in the header (renders well at 40-48 px)
 * TankoliLogoSplash: larger, identical concept for the splash screen
 */

interface LogoProps {
  className?: string
}

export function TankoliLogoIcon({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Primary brand gradient — Emerald → Teal */}
        <linearGradient id="i-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>

        {/* Vehicle body gradient */}
        <linearGradient id="i-veh" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>

        {/* Path glow gradient */}
        <linearGradient id="i-path" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
          <stop offset="60%" stopColor="#10B981" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>

        {/* Pin outer glow */}
        <filter id="i-pin-glow" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="5" result="blur1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur2" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Vehicle soft glow */}
        <filter id="i-veh-glow" x="-15%" y="-15%" width="130%" height="130%">
          <feGaussianBlur stdDeviation="1.8" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Headlight glow */}
        <filter id="i-hl" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Outer ring ── */}
      <circle cx="100" cy="100" r="94" stroke="url(#i-grad)" strokeWidth="1.2" strokeOpacity="0.3" />

      {/* ── GPS tracking arc: bottom-left → upper-right ── */}
      {/* Solid (past route) */}
      <path
        d="M 22,162 Q 45,145 65,132 Q 82,122 96,118"
        stroke="#10B981"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
      {/* Dashed (upcoming route) */}
      <path
        d="M 96,118 Q 115,112 135,100 Q 155,89 168,80"
        stroke="url(#i-path)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="6,4.5"
        fill="none"
      />

      {/* ── Motion speed lines (left of vehicle) ── */}
      <line x1="22" y1="107" x2="46" y2="107" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="5,4" opacity="0.3" />
      <line x1="18" y1="116" x2="38" y2="116" stroke="#14B8A6" strokeWidth="1" strokeLinecap="round" strokeDasharray="4,5" opacity="0.22" />
      <line x1="24" y1="125" x2="44" y2="125" stroke="#10B981" strokeWidth="1" strokeLinecap="round" strokeDasharray="3,5" opacity="0.18" />

      {/* ── Vehicle ── */}
      <g filter="url(#i-veh-glow)">
        {/* Chassis / lower body */}
        <rect x="46" y="104" width="96" height="28" rx="5" fill="url(#i-veh)" />

        {/* Upper cabin — tapers toward front (right) */}
        <path d="M 54,104 L 58,80 L 112,80 L 120,90 L 124,104 Z" fill="#2DD4A0" />

        {/* Windshield (angled, right side = front) */}
        <path d="M 112,80 L 122,88 L 124,104 L 114,104 Z" fill="rgba(190,255,240,0.22)" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />

        {/* Rear window */}
        <rect x="58" y="83" width="14" height="16" rx="2.5" fill="rgba(190,255,240,0.18)" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />

        {/* Mid window */}
        <rect x="77" y="83" width="16" height="16" rx="2.5" fill="rgba(190,255,240,0.18)" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />

        {/* Passenger window */}
        <rect x="98" y="83" width="13" height="16" rx="2.5" fill="rgba(190,255,240,0.18)" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />

        {/* Accent stripe */}
        <line x1="46" y1="116" x2="142" y2="116" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />

        {/* Rear wheel */}
        <circle cx="70" cy="132" r="10" fill="#0B1E2E" />
        <circle cx="70" cy="132" r="6.5" fill="#162D40" />
        <circle cx="70" cy="132" r="3" fill="#10B981" />

        {/* Front wheel */}
        <circle cx="118" cy="132" r="10" fill="#0B1E2E" />
        <circle cx="118" cy="132" r="6.5" fill="#162D40" />
        <circle cx="118" cy="132" r="3" fill="#10B981" />

        {/* Headlight */}
        <g filter="url(#i-hl)">
          <ellipse cx="143" cy="114" rx="3" ry="5" fill="#FDE68A" opacity="0.95" />
          <ellipse cx="146" cy="114" rx="5" ry="4" fill="#FCD34D" opacity="0.25" />
        </g>

        {/* Roof detail line */}
        <line x1="62" y1="80" x2="112" y2="80" stroke="rgba(255,255,255,0.18)" strokeWidth="0.7" />
      </g>

      {/* ── GPS Location Pin ── */}
      <g filter="url(#i-pin-glow)">
        {/* Outer halo rings */}
        <circle cx="168" cy="74" r="18" fill="#10B981" opacity="0.12" />
        <circle cx="168" cy="74" r="12" fill="#10B981" opacity="0.22" />

        {/* Pin teardrop */}
        <path
          d="M 168,54 C 158,54 151,61.5 151,70 C 151,81 168,93 168,93 C 168,93 185,81 185,70 C 185,61.5 178,54 168,54 Z"
          fill="url(#i-grad)"
        />

        {/* Pin inner circle */}
        <circle cx="168" cy="69" r="6.5" fill="white" opacity="0.92" />
        <circle cx="168" cy="69" r="3" fill="#0D9488" />

        {/* Pin shine */}
        <ellipse cx="165" cy="63" rx="2.5" ry="1.8" fill="white" opacity="0.4" />
      </g>
    </svg>
  )
}

export function TankoliLogoSplash({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="s-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
        <linearGradient id="s-veh" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
        <linearGradient id="s-path" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
          <stop offset="55%" stopColor="#10B981" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
        <filter id="s-pin-glow" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="5" result="b1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b2" />
          <feMerge>
            <feMergeNode in="b1" />
            <feMergeNode in="b2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="s-veh-glow" x="-15%" y="-15%" width="130%" height="130%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="s-hl" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer ring */}
      <circle cx="100" cy="100" r="94" stroke="url(#s-grad)" strokeWidth="1.5" strokeOpacity="0.35" />

      {/* GPS arc — solid past portion */}
      <path
        d="M 22,162 Q 45,145 65,132 Q 82,122 96,118"
        stroke="#10B981"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      {/* GPS arc — dashed upcoming portion */}
      <path
        d="M 96,118 Q 115,112 135,100 Q 155,89 168,80"
        stroke="url(#s-path)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="6,4.5"
        fill="none"
      />

      {/* Speed lines */}
      <line x1="18" y1="107" x2="44" y2="107" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="5,4" opacity="0.32" />
      <line x1="14" y1="117" x2="36" y2="117" stroke="#14B8A6" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="4,5" opacity="0.22" />
      <line x1="20" y1="127" x2="42" y2="127" stroke="#10B981" strokeWidth="1" strokeLinecap="round" strokeDasharray="3,5" opacity="0.18" />

      {/* Vehicle */}
      <g filter="url(#s-veh-glow)">
        <rect x="46" y="104" width="96" height="28" rx="5" fill="url(#s-veh)" />
        <path d="M 54,104 L 58,80 L 112,80 L 120,90 L 124,104 Z" fill="#2DD4A0" />
        <path d="M 112,80 L 122,88 L 124,104 L 114,104 Z" fill="rgba(190,255,240,0.22)" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
        <rect x="58" y="83" width="14" height="16" rx="2.5" fill="rgba(190,255,240,0.18)" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
        <rect x="77" y="83" width="16" height="16" rx="2.5" fill="rgba(190,255,240,0.18)" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
        <rect x="98" y="83" width="13" height="16" rx="2.5" fill="rgba(190,255,240,0.18)" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
        <line x1="46" y1="116" x2="142" y2="116" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />
        <circle cx="70" cy="132" r="10" fill="#0B1E2E" />
        <circle cx="70" cy="132" r="6.5" fill="#162D40" />
        <circle cx="70" cy="132" r="3" fill="#10B981" />
        <circle cx="118" cy="132" r="10" fill="#0B1E2E" />
        <circle cx="118" cy="132" r="6.5" fill="#162D40" />
        <circle cx="118" cy="132" r="3" fill="#10B981" />
        <g filter="url(#s-hl)">
          <ellipse cx="143" cy="114" rx="3" ry="5" fill="#FDE68A" opacity="0.95" />
          <ellipse cx="147" cy="114" rx="6" ry="4.5" fill="#FCD34D" opacity="0.22" />
        </g>
        <line x1="62" y1="80" x2="112" y2="80" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
      </g>

      {/* GPS Location Pin */}
      <g filter="url(#s-pin-glow)">
        <circle cx="168" cy="74" r="20" fill="#10B981" opacity="0.12" />
        <circle cx="168" cy="74" r="13" fill="#10B981" opacity="0.25" />
        <path
          d="M 168,54 C 158,54 151,61.5 151,70 C 151,81 168,93 168,93 C 168,93 185,81 185,70 C 185,61.5 178,54 168,54 Z"
          fill="url(#s-grad)"
        />
        <circle cx="168" cy="69" r="6.5" fill="white" opacity="0.92" />
        <circle cx="168" cy="69" r="3" fill="#0D9488" />
        <ellipse cx="165" cy="63" rx="2.5" ry="1.8" fill="white" opacity="0.45" />
      </g>
    </svg>
  )
}
