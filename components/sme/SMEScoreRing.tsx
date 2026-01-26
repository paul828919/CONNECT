'use client';

import { useEffect, useRef } from 'react';

interface SMEScoreRingProps {
  score: number;
  size?: number;
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#7c3aed';
  if (score >= 40) return '#f59e0b';
  return '#9ca3af';
}

function getScoreTrackColor(score: number): string {
  if (score >= 80) return '#dcfce7';
  if (score >= 60) return '#ede9fe';
  if (score >= 40) return '#fef3c7';
  return '#f3f4f6';
}

export function SMEScoreRing({ score, size = 64, className = '' }: SMEScoreRingProps) {
  const circleRef = useRef<SVGCircleElement>(null);
  const clampedScore = Math.max(0, Math.min(100, score));

  const strokeWidth = size < 48 ? 4 : 5;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedScore / 100) * circumference;

  const color = getScoreColor(clampedScore);
  const trackColor = getScoreTrackColor(clampedScore);
  const fontSize = size < 48 ? 12 : size < 72 ? 15 : 18;

  useEffect(() => {
    const circle = circleRef.current;
    if (!circle) return;

    // Animate from full offset to target
    circle.style.strokeDashoffset = String(circumference);
    requestAnimationFrame(() => {
      circle.style.transition = 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
      circle.style.strokeDashoffset = String(offset);
    });
  }, [circumference, offset]);

  return (
    <div className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Score arc */}
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          strokeLinecap="round"
        />
      </svg>
      {/* Score text */}
      <span
        className="absolute font-bold tabular-nums"
        style={{
          fontSize: `${fontSize}px`,
          color,
          lineHeight: 1,
        }}
      >
        {clampedScore}
      </span>
    </div>
  );
}
