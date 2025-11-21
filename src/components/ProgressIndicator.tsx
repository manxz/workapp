import React from 'react';

interface ProgressIndicatorProps {
  completed: number;
  total: number;
  size?: 'small' | 'medium';
}

/**
 * Circular progress indicator showing completed/total ratio.
 * Used in Notepad app for list progress visualization.
 * 
 * Design:
 * - Small (16x16px): Used in sidebar list items
 * - Medium (18x18px): Used in list view header
 * - Fills clockwise as items are completed
 * - Shows completed/total text inside
 */
export default function ProgressIndicator({ completed, total, size = 'small' }: ProgressIndicatorProps) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const radius = size === 'small' ? 6 : 7;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  const dimensions = size === 'small' ? 16 : 18;
  const center = dimensions / 2;
  
  return (
    <div 
      className="relative flex items-center justify-center" 
      style={{ width: dimensions, height: dimensions }}
    >
      <svg
        width={dimensions}
        height={dimensions}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(29, 29, 31, 0.1)"
          strokeWidth="2"
        />
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#1d1d1f"
          strokeWidth="2"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
        />
      </svg>
    </div>
  );
}

