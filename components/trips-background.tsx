"use client"

import React from 'react'

export function TripsBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="tripRoute1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#06B6D4" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="tripRoute2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#10B981" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.25" />
          </linearGradient>

          <style>
            {`
              @keyframes trip-path-flow-1 {
                0% { stroke-dashoffset: 30; opacity: 0.3; }
                50% { opacity: 0.6; }
                100% { stroke-dashoffset: -30; opacity: 0.1; }
              }
              @keyframes trip-path-flow-2 {
                0% { stroke-dashoffset: 25; opacity: 0.25; }
                50% { opacity: 0.5; }
                100% { stroke-dashoffset: -25; opacity: 0.05; }
              }
              @keyframes trip-path-flow-3 {
                0% { stroke-dashoffset: 35; opacity: 0.35; }
                50% { opacity: 0.55; }
                100% { stroke-dashoffset: -35; opacity: 0.15; }
              }
              @keyframes trip-waypoint-pulse {
                0%, 100% { r: 3px; opacity: 0.5; }
                50% { r: 5px; opacity: 0.8; }
              }
              .trip-path-1 { animation: trip-path-flow-1 4s linear infinite; stroke-dasharray: 30; }
              .trip-path-2 { animation: trip-path-flow-2 5s linear infinite; stroke-dasharray: 25; }
              .trip-path-3 { animation: trip-path-flow-3 5.5s linear infinite; stroke-dasharray: 35; }
              .trip-waypoint { animation: trip-waypoint-pulse 2s ease-in-out infinite; }
            `}
          </style>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width="400" height="800" fill="#0f172a" />

        {/* Main road paths */}
        <path
          d="M 40 120 L 160 160 Q 220 180 280 140 L 350 100"
          stroke="url(#tripRoute1)"
          strokeWidth="2.5"
          fill="none"
          className="trip-path-1"
          strokeLinecap="round"
        />

        <path
          d="M 30 300 Q 100 280 150 350 L 200 450 Q 250 500 300 480"
          stroke="url(#tripRoute2)"
          strokeWidth="2"
          fill="none"
          className="trip-path-2"
          strokeLinecap="round"
        />

        <path
          d="M 350 250 Q 300 300 240 330 L 160 380 Q 100 420 80 500"
          stroke="url(#tripRoute1)"
          strokeWidth="1.8"
          fill="none"
          className="trip-path-3"
          strokeLinecap="round"
        />

        {/* Secondary connecting paths */}
        <path
          d="M 200 200 L 240 280 Q 220 350 180 400"
          stroke="#10B981"
          strokeWidth="1"
          fill="none"
          opacity="0.2"
          strokeLinecap="round"
        />

        <path
          d="M 120 500 Q 180 520 250 540 L 320 580"
          stroke="#3B82F6"
          strokeWidth="1"
          fill="none"
          opacity="0.15"
          strokeLinecap="round"
        />

        {/* Waypoints along paths */}
        <circle cx="40" cy="120" r="3" fill="#10B981" className="trip-waypoint" />
        <circle cx="160" cy="160" r="2.5" fill="#06B6D4" className="trip-waypoint" style={{ animationDelay: "0.2s" }} />
        <circle cx="280" cy="140" r="2.5" fill="#10B981" className="trip-waypoint" style={{ animationDelay: "0.4s" }} />
        <circle cx="350" cy="100" r="3" fill="#3B82F6" className="trip-waypoint" style={{ animationDelay: "0.6s" }} />

        <circle cx="30" cy="300" r="2.5" fill="#3B82F6" className="trip-waypoint" />
        <circle cx="150" cy="350" r="2.5" fill="#10B981" className="trip-waypoint" style={{ animationDelay: "0.3s" }} />
        <circle cx="200" cy="450" r="3" fill="#06B6D4" className="trip-waypoint" style={{ animationDelay: "0.5s" }} />
        <circle cx="300" cy="480" r="2.5" fill="#10B981" className="trip-waypoint" style={{ animationDelay: "0.7s" }} />

        <circle cx="350" cy="250" r="2.5" fill="#10B981" className="trip-waypoint" />
        <circle cx="240" cy="330" r="2.5" fill="#3B82F6" className="trip-waypoint" style={{ animationDelay: "0.25s" }} />
        <circle cx="160" cy="380" r="3" fill="#06B6D4" className="trip-waypoint" style={{ animationDelay: "0.5s" }} />
        <circle cx="80" cy="500" r="2.5" fill="#10B981" className="trip-waypoint" style={{ animationDelay: "0.75s" }} />

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
