"use client"

import React from 'react'

export function SettingsBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="geomGlow1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="geomGlow2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </radialGradient>

          <style>
            {`
              @keyframes geom-rotate-1 {
                0% { transform: rotate(0deg); opacity: 0.3; }
                50% { opacity: 0.5; }
                100% { transform: rotate(360deg); opacity: 0.3; }
              }
              @keyframes geom-rotate-2 {
                0% { transform: rotate(360deg); opacity: 0.25; }
                50% { opacity: 0.4; }
                100% { transform: rotate(0deg); opacity: 0.25; }
              }
              @keyframes geom-pulse-expand {
                0%, 100% { r: 30px; opacity: 0.2; }
                50% { r: 45px; opacity: 0.35; }
              }
              @keyframes geom-pulse-contract {
                0%, 100% { r: 25px; opacity: 0.15; }
                50% { r: 40px; opacity: 0.3; }
              }
              .geom-rotate-1 { animation: geom-rotate-1 12s linear infinite; }
              .geom-rotate-2 { animation: geom-rotate-2 14s linear infinite; }
              .geom-pulse-1 { animation: geom-pulse-expand 4s ease-in-out infinite; }
              .geom-pulse-2 { animation: geom-pulse-contract 5s ease-in-out infinite; }
              .geom-pulse-3 { animation: geom-pulse-expand 4.5s ease-in-out infinite 0.5s; }
            `}
          </style>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width="400" height="800" fill="#0f172a" />

        {/* Pulsing circles */}
        <circle cx="80" cy="150" r="30" fill="url(#geomGlow1)" className="geom-pulse-1" />
        <circle cx="320" cy="300" r="25" fill="url(#geomGlow2)" className="geom-pulse-2" />
        <circle cx="150" cy="500" r="28" fill="url(#geomGlow1)" className="geom-pulse-3" />

        {/* Rotating hexagons */}
        <g className="geom-rotate-1" transformOrigin="100 200">
          <polygon
            points="100,170 120,180 120,200 100,210 80,200 80,180"
            fill="none"
            stroke="#10B981"
            strokeWidth="1"
            opacity="0.2"
          />
        </g>

        <g className="geom-rotate-2" transformOrigin="300 400">
          <polygon
            points="300,370 320,380 320,400 300,410 280,400 280,380"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="1"
            opacity="0.15"
          />
        </g>

        {/* Rotating triangles */}
        <g className="geom-rotate-1" transformOrigin="200 600" style={{ animationDuration: "10s" }}>
          <polygon
            points="200,575 215,600 185,600"
            fill="none"
            stroke="#06B6D4"
            strokeWidth="1"
            opacity="0.2"
          />
        </g>

        {/* Concentric circles */}
        <circle cx="70" cy="700" r="15" fill="none" stroke="#10B981" strokeWidth="0.5" opacity="0.15" />
        <circle cx="70" cy="700" r="25" fill="none" stroke="#10B981" strokeWidth="0.5" opacity="0.1" />
        <circle cx="70" cy="700" r="35" fill="none" stroke="#10B981" strokeWidth="0.5" opacity="0.05" />

        <circle cx="330" cy="650" r="12" fill="none" stroke="#3B82F6" strokeWidth="0.5" opacity="0.12" />
        <circle cx="330" cy="650" r="22" fill="none" stroke="#3B82F6" strokeWidth="0.5" opacity="0.08" />
        <circle cx="330" cy="650" r="32" fill="none" stroke="#3B82F6" strokeWidth="0.5" opacity="0.04" />

        {/* Floating dots */}
        <circle cx="50" cy="300" r="1.5" fill="#10B981" opacity="0.5" />
        <circle cx="350" cy="150" r="1.5" fill="#3B82F6" opacity="0.4" />
        <circle cx="200" cy="750" r="1.5" fill="#06B6D4" opacity="0.45" />
        <circle cx="100" cy="400" r="1" fill="#10B981" opacity="0.3" />
        <circle cx="300" cy="550" r="1" fill="#3B82F6" opacity="0.35" />

        {/* Diamond patterns */}
        <g opacity="0.08">
          <polygon points="200,250 210,260 200,270 190,260" fill="none" stroke="#10B981" strokeWidth="0.5" />
          <polygon points="150,600 160,610 150,620 140,610" fill="none" stroke="#3B82F6" strokeWidth="0.5" />
          <polygon points="300,100 310,110 300,120 290,110" fill="none" stroke="#06B6D4" strokeWidth="0.5" />
        </g>

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
