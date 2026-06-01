"use client"

import React from 'react'

export function StopsBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="pinGlow1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="pinGlow2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="pinGlow3" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
          </radialGradient>

          <style>
            {`
              @keyframes pin-pulse-1 {
                0% { r: 8px; opacity: 0.8; }
                50% { r: 16px; opacity: 0.3; }
                100% { r: 8px; opacity: 0; }
              }
              @keyframes pin-pulse-2 {
                0% { r: 7px; opacity: 0.7; }
                50% { r: 14px; opacity: 0.25; }
                100% { r: 7px; opacity: 0; }
              }
              @keyframes pin-pulse-3 {
                0% { r: 9px; opacity: 0.75; }
                50% { r: 18px; opacity: 0.35; }
                100% { r: 9px; opacity: 0; }
              }
              @keyframes pin-beat {
                0%, 100% { r: 3px; }
                50% { r: 4px; }
              }
              .pin-pulse-1 { animation: pin-pulse-1 2.5s ease-out infinite; }
              .pin-pulse-2 { animation: pin-pulse-2 2.8s ease-out infinite 0.3s; }
              .pin-pulse-3 { animation: pin-pulse-3 3.2s ease-out infinite 0.6s; }
              .pin-beat { animation: pin-beat 0.6s ease-in-out infinite; }
            `}
          </style>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width="400" height="800" fill="#0f172a" />

        {/* Location Pin 1 */}
        <g>
          <circle cx="80" cy="150" r="10" fill="url(#pinGlow1)" className="pin-pulse-1" />
          <circle cx="80" cy="150" r="3" fill="#10B981" className="pin-beat" />
          <path d="M 80 160 L 75 175 Q 80 180 85 175 Z" fill="#10B981" opacity="0.6" />
        </g>

        {/* Location Pin 2 */}
        <g>
          <circle cx="320" cy="280" r="9" fill="url(#pinGlow2)" className="pin-pulse-2" />
          <circle cx="320" cy="280" r="2.5" fill="#3B82F6" className="pin-beat" />
          <path d="M 320 290 L 315 305 Q 320 310 325 305 Z" fill="#3B82F6" opacity="0.5" />
        </g>

        {/* Location Pin 3 */}
        <g>
          <circle cx="150" cy="450" r="11" fill="url(#pinGlow3)" className="pin-pulse-3" />
          <circle cx="150" cy="450" r="3.5" fill="#06B6D4" className="pin-beat" />
          <path d="M 150 460 L 145 475 Q 150 480 155 475 Z" fill="#06B6D4" opacity="0.55" />
        </g>

        {/* Location Pin 4 */}
        <g>
          <circle cx="280" cy="650" r="8" fill="url(#pinGlow1)" className="pin-pulse-1" style={{ animationDelay: "0.4s" }} />
          <circle cx="280" cy="650" r="2.5" fill="#10B981" className="pin-beat" />
          <path d="M 280 660 L 275 675 Q 280 680 285 675 Z" fill="#10B981" opacity="0.5" />
        </g>

        {/* Location Pin 5 */}
        <g>
          <circle cx="100" cy="550" r="7" fill="url(#pinGlow2)" className="pin-pulse-2" style={{ animationDelay: "0.8s" }} />
          <circle cx="100" cy="550" r="2" fill="#3B82F6" className="pin-beat" />
          <path d="M 100 560 L 95 575 Q 100 580 105 575 Z" fill="#3B82F6" opacity="0.4" />
        </g>

        {/* Subtle grid */}
        <g opacity="0.03" stroke="#10B981" strokeWidth="0.5">
          <line x1="0" y1="0" x2="400" y2="0" />
          <line x1="0" y1="100" x2="400" y2="100" />
          <line x1="0" y1="200" x2="400" y2="200" />
          <line x1="0" y1="300" x2="400" y2="300" />
          <line x1="0" y1="400" x2="400" y2="400" />
          <line x1="0" y1="500" x2="400" y2="500" />
          <line x1="0" y1="600" x2="400" y2="600" />
          <line x1="0" y1="700" x2="400" y2="700" />
          <line x1="0" y1="800" x2="400" y2="800" />
        </g>
      </svg>
    </div>
  )
}
