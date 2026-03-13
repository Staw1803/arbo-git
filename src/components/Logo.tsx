import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  hideText?: boolean;
}

export function Logo({ className = '', hideText = false, ...props }: LogoProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
        {...props}
      >
        {/* Pot */}
        <path
          d="M60 90 L70 140 C72 150, 80 155, 90 155 L110 155 C120 155, 128 150, 130 140 L135 115"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        
        {/* Pot Rim */}
        <rect
          x="55"
          y="80"
          width="90"
          height="10"
          rx="2"
          stroke="currentColor"
          strokeWidth="6"
          fill="none"
        />

        {/* Plant Stem */}
        <line
          x1="100"
          y1="80"
          x2="100"
          y2="50"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Left Leaf */}
        <path
          d="M100 70 C85 70, 70 55, 70 45 C70 35, 85 35, 100 50 Z"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Right Leaf */}
        <path
          d="M100 70 C115 70, 130 55, 130 45 C130 35, 115 35, 100 50 Z"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Circuit line connecting to the pot */}
        <path
          d="M110 115 L115 115 C125 115, 125 105, 135 105 L150 105 L170 120 L190 120"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        
        {/* Circuit Dot */}
        <circle
          cx="195"
          cy="120"
          r="4"
          stroke="currentColor"
          strokeWidth="6"
          fill="none"
        />

        {/* ARBO Text */}
        {!hideText && (
          <text
            x="100"
            y="185"
            fontFamily="sans-serif"
            fontWeight="300"
            fontSize="28"
            letterSpacing="0.2em"
            fill="currentColor"
            textAnchor="middle"
          >
            ARBO
          </text>
        )}
      </svg>
    </div>
  );
}
