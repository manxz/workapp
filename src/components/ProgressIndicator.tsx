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
 * - Fills from inside as a pie chart as items are completed
 * - 1.5px gap between outline and progress fill
 */
export default function ProgressIndicator({ completed, total, size = 'small' }: ProgressIndicatorProps) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const containerSize = size === 'small' ? 16 : 18;
  const circleSize = size === 'small' ? 13 : 15;
  const center = circleSize / 2;
  const strokeWidth = 1;
  const gap = 1.5;
  
  // Adjust radius to account for stroke width (stroke is centered on the path)
  const outerRadius = center - strokeWidth / 2;
  const innerRadius = outerRadius - gap;
  
  // Calculate the end point of the arc for the pie slice
  const angle = (percentage / 100) * 360;
  const radians = ((angle - 90) * Math.PI) / 180;
  const x = center + innerRadius * Math.cos(radians);
  const y = center + innerRadius * Math.sin(radians);
  
  // Starting point (top of circle)
  const startY = center - innerRadius;
  
  // Determine if we need a large arc (> 180 degrees)
  const largeArcFlag = percentage > 50 ? 1 : 0;
  
  return (
    <div 
      className="relative flex items-center justify-center flex-shrink-0" 
      style={{ width: containerSize, height: containerSize }}
    >
      <svg
        width={circleSize}
        height={circleSize}
        viewBox={`0 0 ${circleSize} ${circleSize}`}
      >
        {/* Outer ring (outline) */}
        <circle
          cx={center}
          cy={center}
          r={outerRadius}
          fill="none"
          stroke="#7D7D7F"
          strokeWidth={strokeWidth}
        />
        {/* Progress pie slice */}
        {percentage === 100 ? (
          // When 100%, fill the entire inner circle
          <circle
            cx={center}
            cy={center}
            r={innerRadius}
            fill="#7D7D7F"
          />
        ) : percentage > 0 ? (
          <path
            d={`M ${center} ${center} L ${center} ${startY} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${x} ${y} Z`}
            fill="#7D7D7F"
          />
        ) : null}
      </svg>
    </div>
  );
}

