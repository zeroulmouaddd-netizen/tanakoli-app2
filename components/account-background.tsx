import React, { useState, useEffect } from 'react'

export function AccountBackground() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Gradients */}
          <radialGradient id="glowCircle1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="glowCircle2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="glowCircle3" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
          </radialGradient>

          {/* GPS Route Path Gradient */}
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#06B6D4" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.3" />
          </linearGradient>

          {/* Animations */}
          <style>
            {`
              @keyframes pulse-glow {
                0%, 100% { r: 60px; opacity: 0.3; }
                50% { r: 80px; opacity: 0.15; }
              }
              @keyframes pulse-glow-2 {
                0%, 100% { r: 50px; opacity: 0.25; }
                50% { r: 70px; opacity: 0.1; }
              }
              @keyframes pulse-glow-3 {
                0%, 100% { r: 45px; opacity: 0.2; }
                50% { r: 65px; opacity: 0.08; }
              }
              @keyframes float-up {
                0%, 100% { transform: translateY(0px); opacity: 0.15; }
                50% { transform: translateY(-20px); opacity: 0.25; }
              }
              @keyframes float-down {
                0%, 100% { transform: translateY(0px); opacity: 0.12; }
                50% { transform: translateY(20px); opacity: 0.2; }
              }
              @keyframes wallet-pulse {
                0%, 100% { stroke-width: 1; opacity: 0.3; }
                50% { stroke-width: 1.5; opacity: 0.5; }
              }
              @keyframes card-pulse {
                0%, 100% { stroke-width: 1; opacity: 0.25; }
                50% { stroke-width: 1.5; opacity: 0.4; }
              }
              @keyframes gps-flow-1 {
                0% { stroke-dashoffset: 50; opacity: 0.4; }
                50% { opacity: 0.6; }
                100% { stroke-dashoffset: -50; opacity: 0.2; }
              }
              @keyframes gps-flow-2 {
                0% { stroke-dashoffset: 40; opacity: 0.35; }
                50% { opacity: 0.5; }
                100% { stroke-dashoffset: -40; opacity: 0.15; }
              }
              @keyframes gps-flow-3 {
                0% { stroke-dashoffset: 60; opacity: 0.3; }
                50% { opacity: 0.45; }
                100% { stroke-dashoffset: -60; opacity: 0.1; }
              }
              .glow-circle-1 { animation: pulse-glow 4s ease-in-out infinite; }
              .glow-circle-2 { animation: pulse-glow-2 5s ease-in-out infinite 1s; }
              .glow-circle-3 { animation: pulse-glow-3 6s ease-in-out infinite 2s; }
              .float-element-1 { animation: float-up 8s ease-in-out infinite; }
              .float-element-2 { animation: float-down 7s ease-in-out infinite 1s; }
              .float-element-3 { animation: float-up 9s ease-in-out infinite 2s; }
              .wallet-icon { animation: wallet-pulse 3s ease-in-out infinite; }
              .card-icon { animation: card-pulse 3.5s ease-in-out infinite 0.5s; }
              .gps-route-1 { animation: gps-flow-1 5s ease-in-out infinite; stroke-dasharray: 50; }
              .gps-route-2 { animation: gps-flow-2 6s ease-in-out infinite 0.5s; stroke-dasharray: 40; }
              .gps-route-3 { animation: gps-flow-3 7s ease-in-out infinite 1s; stroke-dasharray: 60; }
            `}
          </style>
        </defs>

        {/* Background Gradient */}
        <rect x="0" y="0" width="400" height="800" fill="#0f172a" />

        {/* GPS Route Paths - Animated Map Lines */}
        <g className="gps-routes">
          {/* Main winding route 1 */}
          <path
            d="M 50 100 Q 120 150 80 220 T 150 380 Q 180 420 140 480"
            stroke="url(#routeGradient)"
            strokeWidth="2"
            fill="none"
            className="gps-route-1"
            strokeLinecap="round"
          />
          
          {/* Route 2 - Secondary path */}
          <path
            d="M 350 80 Q 280 140 300 200 T 240 350 Q 220 420 280 500"
            stroke="url(#routeGradient)"
            strokeWidth="1.5"
            fill="none"
            className="gps-route-2"
            strokeLinecap="round"
          />
          
          {/* Route 3 - Tertiary path */}
          <path
            d="M 200 150 Q 260 210 220 280 T 300 480"
            stroke="url(#routeGradient)"
            strokeWidth="1.5"
            fill="none"
            className="gps-route-3"
            strokeLinecap="round"
          />

          {/* Additional subtle routes */}
          <path
            d="M 100 500 L 200 550 Q 250 570 280 600"
            stroke="#10B981"
            strokeWidth="1"
            fill="none"
            opacity="0.2"
            strokeLinecap="round"
          />
          <path
            d="M 320 150 Q 340 200 300 250 L 260 320"
            stroke="#06B6D4"
            strokeWidth="1"
            fill="none"
            opacity="0.15"
            strokeLinecap="round"
          />
        </g>

        {/* GPS Waypoint Markers */}
        <g className="waypoints">
          <circle cx="50" cy="100" r="3.5" fill="#10B981" opacity="0.6" />
          <circle cx="80" cy="220" r="2.5" fill="#06B6D4" opacity="0.5" />
          <circle cx="150" cy="380" r="2.5" fill="#10B981" opacity="0.4" />
          <circle cx="140" cy="480" r="3" fill="#3B82F6" opacity="0.5" />
          
          <circle cx="350" cy="80" r="3.5" fill="#3B82F6" opacity="0.6" />
          <circle cx="300" cy="200" r="2.5" fill="#10B981" opacity="0.5" />
          <circle cx="240" cy="350" r="2.5" fill="#06B6D4" opacity="0.4" />
          <circle cx="280" cy="500" r="3" fill="#10B981" opacity="0.5" />
          
          <circle cx="200" cy="150" r="2.5" fill="#06B6D4" opacity="0.4" />
          <circle cx="220" cy="280" r="2.5" fill="#10B981" opacity="0.5" />
          <circle cx="300" cy="480" r="3" fill="#3B82F6" opacity="0.5" />
        </g>

        {/* Large Glowing Circles - Background Layer */}
        <circle
          cx="80"
          cy="150"
          r="60"
          fill="url(#glowCircle1)"
          className="glow-circle-1"
        />
        <circle
          cx="320"
          cy="300"
          r="50"
          fill="url(#glowCircle2)"
          className="glow-circle-2"
        />
        <circle
          cx="100"
          cy="550"
          r="45"
          fill="url(#glowCircle3)"
          className="glow-circle-3"
        />
        <circle
          cx="280"
          cy="700"
          r="55"
          fill="url(#glowCircle1)"
          className="glow-circle-1"
          style={{ animationDelay: "0.5s" }}
        />

        {/* Abstract Wallet Shapes */}
        <g className="float-element-1">
          <rect
            x="150"
            y="200"
            width="80"
            height="50"
            rx="8"
            stroke="#10B981"
            strokeWidth="1"
            fill="none"
            opacity="0.3"
            className="wallet-icon"
          />
          <line x1="150" y1="225" x2="230" y2="225" stroke="#10B981" strokeWidth="1" opacity="0.2" />
          <circle cx="210" cy="225" r="3" fill="#10B981" opacity="0.4" />
        </g>

        {/* Abstract Card Shapes */}
        <g className="float-element-2">
          <rect
            x="40"
            y="400"
            width="70"
            height="45"
            rx="6"
            stroke="#3B82F6"
            strokeWidth="1"
            fill="none"
            opacity="0.25"
            className="card-icon"
          />
          <circle cx="85" cy="410" r="2.5" fill="#3B82F6" opacity="0.3" />
          <circle cx="95" cy="410" r="2.5" fill="#3B82F6" opacity="0.3" />
          <circle cx="105" cy="410" r="2.5" fill="#3B82F6" opacity="0.3" />
        </g>

        {/* Additional Wallet Shape */}
        <g className="float-element-3">
          <path
            d="M 260 500 L 300 500 Q 310 500 310 510 L 310 540 Q 310 550 300 550 L 260 550 Q 250 550 250 540 L 250 510 Q 250 500 260 500 Z"
            stroke="#06B6D4"
            strokeWidth="1"
            fill="none"
            opacity="0.2"
            className="wallet-icon"
          />
          <line x1="260" y1="520" x2="310" y2="520" stroke="#06B6D4" strokeWidth="0.5" opacity="0.15" />
        </g>

        {/* Subtle Moving Dots */}
        <circle
          cx="50"
          cy="100"
          r="2"
          fill="#10B981"
          opacity="0.4"
          style={{
            animation: "float-up 10s ease-in-out infinite",
          }}
        />
        <circle
          cx="350"
          cy="450"
          r="1.5"
          fill="#3B82F6"
          opacity="0.3"
          style={{
            animation: "float-down 9s ease-in-out infinite",
          }}
        />
        <circle
          cx="150"
          cy="750"
          r="1.5"
          fill="#06B6D4"
          opacity="0.35"
          style={{
            animation: "float-up 11s ease-in-out infinite",
          }}
        />

        {/* Subtle Grid Overlay for texture */}
        <g opacity="0.05" stroke="#10B981" strokeWidth="0.5">
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
