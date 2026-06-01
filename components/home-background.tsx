"use client"

import React from 'react'

export function HomeBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="homeDot1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="homeDot2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="homeRoute" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#06B6D4" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.4" />
          </linearGradient>

          <style>
            {`
              @keyframes home-dot-float {
                0%, 100% { transform: translate(0, 0); opacity: 0.8; }
                25% { transform: translate(15px, -20px); opacity: 0.6; }
                50% { transform: translate(30px, 0); opacity: 0.7; }
                75% { transform: translate(15px, 20px); opacity: 0.6; }
              }
              @keyframes home-route-pulse {
                0%, 100% { stroke-width: 1; opacity: 0.4; }
                50% { stroke-width: 1.5; opacity: 0.7; }
              }
              @keyframes home-dot-move-1 {
                0% { cx: 50; cy: 100; opacity: 0.8; }
                50% { cx: 150; cy: 200; opacity: 0.5; }
                100% { cx: 280; cy: 150; opacity: 0.2; }
              }
              @keyframes home-dot-move-2 {
                0% { cx: 350; cy: 300; opacity: 0.7; }
                50% { cx: 200; cy: 400; opacity: 0.4; }
                100% { cx: 80; cy: 500; opacity: 0.2; }
              }
              @keyframes home-dot-move-3 {
                0% { cx: 100; cy: 600; opacity: 0.6; }
                50% { cx: 300; cy: 650; opacity: 0.3; }
                100% { cx: 150; cy: 700; opacity: 0.1; }
              }
              .home-dot-1 { animation: home-dot-move-1 6s ease-in-out infinite; }
              .home-dot-2 { animation: home-dot-move-2 7s ease-in-out infinite; }
              .home-dot-3 { animation: home-dot-move-3 8s ease-in-out infinite; }
              .home-route { animation: home-route-pulse 3s ease-in-out infinite; }
            `}
          </style>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width="400" height="800" fill="#0f172a" />

        {/* GPS Route Lines */}
        <path
          d="M 50 150 Q 120 200 200 180 T 350 250"
          stroke="url(#homeRoute)"
          strokeWidth="2"
          fill="none"
          className="home-route"
          strokeLinecap="round"
        />
        <path
          d="M 30 400 Q 150 380 280 450 T 380 550"
          stroke="url(#homeRoute)"
          strokeWidth="1.5"
          fill="none"
          className="home-route"
          strokeLinecap="round"
          style={{ animationDelay: "0.5s" }}
        />

        {/* Moving GPS Dots with trail effect */}
        <circle
          cx="50"
          cy="100"
          r="4"
          fill="#10B981"
          className="home-dot-1"
          opacity="0.8"
        />
        <circle
          cx="50"
          cy="100"
          r="8"
          fill="url(#homeDot1)"
          className="home-dot-1"
        />

        <circle
          cx="350"
          cy="300"
          r="3.5"
          fill="#3B82F6"
          className="home-dot-2"
          opacity="0.7"
        />
        <circle
          cx="350"
          cy="300"
          r="7"
          fill="url(#homeDot2)"
          className="home-dot-2"
        />

        <circle
          cx="100"
          cy="600"
          r="3"
          fill="#06B6D4"
          className="home-dot-3"
          opacity="0.6"
        />
        <circle
          cx="100"
          cy="600"
          r="6"
          fill="url(#homeDot2)"
          className="home-dot-3"
        />

        {/* Subtle grid for texture */}
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
