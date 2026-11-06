'use client';

import React from 'react';

/**
 * Shared SVG defs for Evening Lanterns:
 * - Gradients (wood, redA, redC, white, pink, vol, halo)
 * - Patterns (ribs, floral)
 * - Symbols (sakura blossom)
 * - Clip paths (clipA, clipB, clipC, band)
 * - Filters (blur, soft)
 */
export function EveningLanternDefs() {
  return (
    <svg
      style={{
        position: 'absolute',
        width: 0,
        height: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="el-room" cx="50%" cy="45%" r="75%">
          <stop offset="0" stopColor="#4a1f1a" />
          <stop offset="0.6" stopColor="#22100f" />
          <stop offset="1" stopColor="#0d0708" />
        </radialGradient>

        <linearGradient id="el-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4b3022" />
          <stop offset="1" stopColor="#241610" />
        </linearGradient>

        <pattern id="el-ribs" width="10" height="9" patternUnits="userSpaceOnUse">
          <line x1="0" y1="4.5" x2="10" y2="4.5" stroke="#3a0505" strokeOpacity="0.38" strokeWidth="1.3" />
          <line x1="0" y1="5.6" x2="10" y2="5.6" stroke="#ffb090" strokeOpacity="0.18" strokeWidth="0.8" />
        </pattern>

        <radialGradient id="el-redA" cx="50%" cy="50%" r="60%">
          <stop offset="0" stopColor="#ff6a3c" />
          <stop offset="0.6" stopColor="#e5331f" />
          <stop offset="1" stopColor="#a81410" />
        </radialGradient>

        <radialGradient id="el-redC" cx="50%" cy="48%" r="62%">
          <stop offset="0" stopColor="#ff7a1f" />
          <stop offset="0.55" stopColor="#f03a12" />
          <stop offset="1" stopColor="#a8140c" />
        </radialGradient>

        <radialGradient id="el-white" cx="50%" cy="50%" r="60%">
          <stop offset="0" stopColor="#fffdf5" />
          <stop offset="1" stopColor="#f1d9c6" />
        </radialGradient>

        <radialGradient id="el-pink" cx="50%" cy="50%" r="55%">
          <stop offset="0" stopColor="#ffe2a0" stopOpacity="1" />
          <stop offset="0.25" stopColor="#ffb870" stopOpacity="0.8" />
          <stop offset="0.7" stopColor="#e86a7a" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="el-vol" cx="50%" cy="50%" r="52%">
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#2a0508" stopOpacity="0.5" />
        </radialGradient>

        <radialGradient id="el-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ff7a2a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff7a2a" stopOpacity="0" />
        </radialGradient>

        <pattern id="el-floral" width="34" height="34" patternUnits="userSpaceOnUse">
          <rect width="34" height="34" fill="#f6a6b4" />
          <g fill="none" stroke="#b81f43" strokeWidth="2.4">
            <circle cx="17" cy="17" r="7" />
            <path d="M17 3v6M17 25v6M3 17h6M25 17h6" strokeLinecap="round" />
          </g>
          <circle cx="17" cy="17" r="2.6" fill="#b81f43" />
          <g fill="#fff3ee" opacity="0.85">
            <circle cx="0" cy="0" r="4" />
            <circle cx="34" cy="0" r="4" />
            <circle cx="0" cy="34" r="4" />
            <circle cx="34" cy="34" r="4" />
          </g>
        </pattern>

        <symbol id="el-sak" viewBox="-10 -10 20 20">
          <g fill="#a3213f">
            <ellipse cx="0" cy="-5" rx="3.6" ry="5.4" />
            <ellipse cx="0" cy="-5" rx="3.6" ry="5.4" transform="rotate(72)" />
            <ellipse cx="0" cy="-5" rx="3.6" ry="5.4" transform="rotate(144)" />
            <ellipse cx="0" cy="-5" rx="3.6" ry="5.4" transform="rotate(216)" />
            <ellipse cx="0" cy="-5" rx="3.6" ry="5.4" transform="rotate(288)" />
          </g>
          <circle r="1.6" fill="#f7d4d8" />
        </symbol>

        <clipPath id="el-clipA">
          <ellipse cx="0" cy="0" rx="150" ry="120" />
        </clipPath>
        <clipPath id="el-clipB">
          <circle cx="0" cy="0" r="112" />
        </clipPath>
        <clipPath id="el-clipC">
          <ellipse cx="0" cy="0" rx="100" ry="170" />
        </clipPath>
        <clipPath id="el-band">
          <ellipse cx="0" cy="0" rx="58" ry="120" />
        </clipPath>

        <filter id="el-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id="el-soft">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
    </svg>
  );
}

/**
 * Lantern A: Red Sakura Lantern
 * Oval paper lantern with ribs, white center band, and floating sakura blossoms.
 */
export function EveningLanternA({
  height = 42,
  className = '',
  style,
  swayDelay = '0s',
  swayDuration = '7s',
  compact = false,
}: {
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
  swayDelay?: string;
  swayDuration?: string;
  compact?: boolean;
}) {
  // compact reduces wire top offset
  const wireTop = compact ? -180 : -260;
  const viewBoxHeight = compact ? 390 : 470;
  const viewBoxMinY = compact ? -180 : -260;

  return (
    <svg
      viewBox={`-230 ${viewBoxMinY} 460 ${viewBoxHeight}`}
      style={{
        height,
        width: 'auto',
        overflow: 'visible',
        display: 'block',
        pointerEvents: 'none',
        ...style,
      }}
      className={className}
      aria-hidden="true"
    >
      <g
        className="el-sway"
        style={{
          transformOrigin: `0px ${viewBoxMinY}px`,
          animationDuration: swayDuration,
          animationDelay: swayDelay,
        }}
      >
        <line x1="0" y1={wireTop} x2="0" y2="-138" stroke="#7a5a44" strokeWidth="2.5" />
        <ellipse className="el-flick" rx="230" ry="200" fill="url(#el-halo)" filter="url(#el-blur)" />
        <ellipse rx="150" ry="120" fill="url(#el-redA)" />
        <g clipPath="url(#el-clipA)">
          <rect x="-150" y="-120" width="300" height="240" fill="url(#el-ribs)" />
          <g clipPath="url(#el-band)">
            <rect x="-60" y="-125" width="120" height="250" fill="url(#el-white)" />
            <rect x="-60" y="-125" width="120" height="250" fill="url(#el-ribs)" opacity="0.5" />
          </g>
          <use href="#el-sak" x="-16" y="-84" width="34" height="34" />
          <use href="#el-sak" x="-44" y="-52" width="32" height="32" transform="rotate(-14 -28 -36)" />
          <use href="#el-sak" x="-36" y="14" width="34" height="34" />
          <use href="#el-sak" x="-2" y="52" width="34" height="34" transform="rotate(20 15 69)" />
          <use href="#el-sak" x="20" y="-36" width="18" height="18" transform="rotate(30 29 -27)" />
          <use href="#el-sak" x="-22" y="86" width="14" height="14" />
          <ellipse rx="150" ry="120" fill="url(#el-vol)" />
        </g>
        <rect x="-48" y="-136" width="96" height="26" rx="6" fill="#171010" />
        <rect x="-44" y="108" width="88" height="24" rx="6" fill="#171010" />
      </g>
    </svg>
  );
}

/**
 * Lantern B: Pink Patterned Globe with Handle
 * Round globe with intricate floral pattern, metal arched handle, and pulsing warm core.
 */
export function EveningLanternB({
  height = 42,
  className = '',
  style,
  swayDelay = '-2.5s',
  swayDuration = '8.5s',
  compact = false,
}: {
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
  swayDelay?: string;
  swayDuration?: string;
  compact?: boolean;
}) {
  const wireTop = compact ? -260 : -380;
  const viewBoxHeight = compact ? 460 : 580;
  const viewBoxMinY = compact ? -260 : -380;

  return (
    <svg
      viewBox={`-190 ${viewBoxMinY} 380 ${viewBoxHeight}`}
      style={{
        height,
        width: 'auto',
        overflow: 'visible',
        display: 'block',
        pointerEvents: 'none',
        ...style,
      }}
      className={className}
      aria-hidden="true"
    >
      <g
        className="el-sway b"
        style={{
          transformOrigin: `0px ${viewBoxMinY}px`,
          animationDuration: swayDuration,
          animationDelay: swayDelay,
        }}
      >
        <line x1="0" y1={wireTop} x2="0" y2="-205" stroke="#7a5a44" strokeWidth="2.5" />
        <circle className="el-flick f2" r="190" fill="url(#el-halo)" filter="url(#el-blur)" opacity="0.7" />
        <path d="M-34 -108 C-34 -190 34 -190 34 -108" fill="none" stroke="#c9c2b6" strokeWidth="4" strokeLinecap="round" />
        <circle cy="-200" r="9" fill="none" stroke="#c9c2b6" strokeWidth="4" />
        <circle r="112" fill="url(#el-floral)" />
        <g clipPath="url(#el-clipB)">
          <circle r="112" fill="url(#el-vol)" />
          <circle r="112" fill="url(#el-pink)" />
          <circle className="el-pulse" r="26" fill="#ffe9a8" opacity="0.9" filter="url(#el-soft)" />
          <circle r="9" fill="#fffbe8" />
        </g>
        <rect x="-40" y="-122" width="80" height="16" rx="4" fill="#3a3a38" />
      </g>
    </svg>
  );
}

/**
 * Lantern C: Tall Red Lantern
 * Elongated ribbed cylindrical lantern with warm interior flicker and base rim.
 */
export function EveningLanternC({
  height = 42,
  className = '',
  style,
  swayDelay = '-4s',
  swayDuration = '9s',
  compact = false,
}: {
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
  swayDelay?: string;
  swayDuration?: string;
  compact?: boolean;
}) {
  const wireTop = compact ? -230 : -330;
  const viewBoxHeight = compact ? 510 : 610;
  const viewBoxMinY = compact ? -230 : -330;

  return (
    <svg
      viewBox={`-210 ${viewBoxMinY} 420 ${viewBoxHeight}`}
      style={{
        height,
        width: 'auto',
        overflow: 'visible',
        display: 'block',
        pointerEvents: 'none',
        ...style,
      }}
      className={className}
      aria-hidden="true"
    >
      <g
        className="el-sway c"
        style={{
          transformOrigin: `0px ${viewBoxMinY}px`,
          animationDuration: swayDuration,
          animationDelay: swayDelay,
        }}
      >
        <line x1="0" y1={wireTop} x2="0" y2="-178" stroke="#7a5a44" strokeWidth="2.5" />
        <ellipse className="el-flick f3" rx="210" ry="270" fill="url(#el-halo)" filter="url(#el-blur)" />
        <ellipse rx="100" ry="170" fill="url(#el-redC)" />
        <g clipPath="url(#el-clipC)">
          <rect x="-100" y="-170" width="200" height="340" fill="url(#el-ribs)" />
          <ellipse className="el-flick f2" rx="70" ry="120" fill="#ffc25a" opacity="0.5" filter="url(#el-blur)" />
          <ellipse rx="100" ry="170" fill="url(#el-vol)" />
        </g>
        <rect x="-34" y="-186" width="68" height="18" rx="4" fill="#150a08" />
        <rect x="-48" y="160" width="96" height="22" rx="5" fill="#150a08" />
        <ellipse cy="182" rx="40" ry="6" fill="#ffd27a" opacity="0.7" />
      </g>
    </svg>
  );
}

/**
 * Background soft-focus miniature lantern for depth.
 */
export function EveningLanternBg({
  height = 30,
  className = '',
  style,
  swayDelay = '-1.5s',
}: {
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
  swayDelay?: string;
}) {
  return (
    <svg
      viewBox="-80 -230 160 360"
      style={{
        height,
        width: 'auto',
        overflow: 'visible',
        display: 'block',
        pointerEvents: 'none',
        opacity: 0.8,
        filter: 'url(#el-soft)',
        ...style,
      }}
      className={className}
      aria-hidden="true"
    >
      <g
        className="el-sway"
        style={{
          transformOrigin: '0px -230px',
          animationDuration: '7.8s',
          animationDelay: swayDelay,
        }}
      >
        <line x1="0" y1="-230" x2="0" y2="-130" stroke="#6b4a36" strokeWidth="2" />
        <ellipse rx="55" ry="95" fill="url(#el-redC)" />
        <rect x="-55" y="-95" width="110" height="190" fill="url(#el-ribs)" clipPath="url(#el-clipC)" transform="scale(0.55 0.55)" />
        <rect x="-20" y="86" width="40" height="11" rx="3" fill="#150a08" />
      </g>
    </svg>
  );
}

/**
 * Floating drifting sakura blossom petals overlay.
 */
export function DriftingBlossomPetals() {
  const petals = [
    { x: '8%', t: '11s', d: '0s', rx: 4, ry: 7 },
    { x: '24%', t: '13s', d: '-4s', rx: 3.5, ry: 6 },
    { x: '42%', t: '10s', d: '-7s', rx: 4, ry: 7 },
    { x: '58%', t: '14s', d: '-2s', rx: 3.5, ry: 5.5 },
    { x: '73%', t: '12s', d: '-9s', rx: 4, ry: 7 },
    { x: '88%', t: '15s', d: '-5s', rx: 3.5, ry: 6 },
  ];

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '64px',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
      aria-hidden="true"
    >
      <g fill="#f6b3c1">
        {petals.map((p, i) => (
          <g
            key={i}
            className="el-petal"
            style={
              {
                '--x': p.x,
                '--t': p.t,
                '--d': p.d,
              } as React.CSSProperties
            }
          >
            <ellipse rx={p.rx} ry={p.ry} />
          </g>
        ))}
      </g>
    </svg>
  );
}

/**
 * Button Lantern Decoration:
 * Pairs of delicate miniature Evening Lanterns hanging over the corners of buttons.
 */
export function EveningLanternButtonDecor({
  leftType = 'A',
  rightType = 'B',
}: {
  leftType?: 'A' | 'B' | 'C';
  rightType?: 'A' | 'B' | 'C';
}) {
  return (
    <span className="evening-lanterns-btn-decor" aria-hidden="true">
      <span className="evening-lantern-btn-item left">
        {leftType === 'A' && <EveningLanternA height={26} compact swayDuration="5.5s" swayDelay="-0.8s" />}
        {leftType === 'B' && <EveningLanternB height={25} compact swayDuration="6.2s" swayDelay="-1.8s" />}
        {leftType === 'C' && <EveningLanternC height={28} compact swayDuration="6.8s" swayDelay="-2.2s" />}
      </span>
      <span className="evening-lantern-btn-item right">
        {rightType === 'A' && <EveningLanternA height={26} compact swayDuration="5.8s" swayDelay="-2.6s" />}
        {rightType === 'B' && <EveningLanternB height={25} compact swayDuration="6.5s" swayDelay="-1.2s" />}
        {rightType === 'C' && <EveningLanternC height={28} compact swayDuration="7.1s" swayDelay="-3.4s" />}
      </span>
    </span>
  );
}

/**
 * Navbar Lanterns Component:
 * The complete Evening Lanterns decoration along the top navbar:
 * - Wooden beam running along the top edge
 * - Balanced hanging lanterns (Red sakura A, Pink globe B, Tall red C, and soft background lanterns)
 * - Drifting sakura blossom petals
 */
export function EveningLanternsNavbar() {
  return (
    <div className="evening-lanterns-navbar-wrap" aria-hidden="true">
      {/* Shared defs */}
      <EveningLanternDefs />

      {/* Top Wooden Beam */}
      <div className="evening-lanterns-beam" />

      {/* Floating drifting sakura petals */}
      <DriftingBlossomPetals />

      {/* Garland of hanging lanterns across the navbar */}
      <div className="evening-lanterns-garland">
        {/* Far left soft depth lantern */}
        <div className="lantern-item lantern-desktop-only" style={{ marginTop: 0 }}>
          <EveningLanternBg height={28} swayDelay="-1.2s" />
        </div>

        {/* Lantern A: Red sakura near left/clock boundary */}
        <div className="lantern-item" style={{ marginTop: 0 }}>
          <EveningLanternA height={40} swayDuration="7s" swayDelay="0s" />
        </div>

        {/* Lantern B: Pink patterned globe (center-left) */}
        <div className="lantern-item lantern-desktop-only" style={{ marginTop: 0 }}>
          <EveningLanternB height={42} swayDuration="8.5s" swayDelay="-2.5s" />
        </div>

        {/* Center Trio: Lantern C (Tall red lantern) */}
        <div className="lantern-item" style={{ marginTop: 0 }}>
          <EveningLanternC height={44} swayDuration="9s" swayDelay="-4s" />
        </div>

        {/* Lantern A: Red sakura (center-right) */}
        <div className="lantern-item lantern-desktop-only" style={{ marginTop: 0 }}>
          <EveningLanternA height={38} swayDuration="7.4s" swayDelay="-3.2s" />
        </div>

        {/* Lantern B: Pink patterned globe (near right controls) */}
        <div className="lantern-item" style={{ marginTop: 0 }}>
          <EveningLanternB height={40} swayDuration="8.2s" swayDelay="-1.6s" />
        </div>

        {/* Far right soft depth lantern */}
        <div className="lantern-item lantern-desktop-only" style={{ marginTop: 0 }}>
          <EveningLanternBg height={28} swayDelay="-2.8s" />
        </div>
      </div>
    </div>
  );
}

