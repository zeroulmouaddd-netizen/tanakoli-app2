"use client"

import React from 'react'

export function GenericBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="genericGlow1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="genericGlow2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </radialGradient>

          <style>
            {`
              @keyframes generic-float-1 {
                0%, 100% { transform: translateY(0px); opacity: 0.2; }
                50% { transform: translateY(-30px); opacity: 0.35; }
              }
              @keyframes generic-float-2 {
                0%, 100% { transform: translateY(0px); opacity: 0.15; }
                50% { transform: translateY(30px); opacity: 0.25; }
              }
              .generic-float-1 { animation: generic-float-1 6s ease-in-out infinite; }
              .generic-float-2 { animation: generic-float-2 7s ease-in-out infinite; }
              .generic-float-3 { animation: generic-float-1 8s ease-in-out infinite 1s; }
            `}
          </style>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width="400" height="800" fill="#0f172a" />

        {/* Floating glowing circles */}
        <circle cx="80" cy="150" r="50" fill="url(#genericGlow1)" className="generic-float-1" />
        <circle cx="320" cy="300" r="45" fill="url(#genericGlow2)" className="generic-float-2" />
        <circle cx="150" cy="550" r="55" fill="url(#genericGlow1)" className="generic-float-3" />
        <circle cx="300" cy="700" r="48" fill="url(#genericGlow2)" className="generic-float-2" style={{ animationDelay: "0.5s" }} />

        {/* Subtle accent lines */}
        <line x1="30" y1="200" x2="370" y2="200" stroke="#10B981" strokeWidth="1" opacity="0.1" />
        <line x1="50" y1="400" x2="350" y2="400" stroke="#3B82F6" strokeWidth="1" opacity="0.08" />
        <line x1="40" y1="600" x2="360" y2="600" stroke="#06B6D4" strokeWidth="1" opacity="0.1" />

        {/* Floating dots */}
        <circle cx="100" cy="250" r="1" fill="#10B981" opacity="0.3" className="generic-float-1" />
        <circle cx="300" cy="450" r="1" fill="#3B82F6" opacity="0.25" className="generic-float-2" />
        <circle cx="200" cy="650" r="1" fill="#06B6D4" opacity="0.28" className="generic-float-3" />

        {/* Subtle grid */}
        <g opacity="0.02" stroke="#10B981" strokeWidth="0.5">
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
