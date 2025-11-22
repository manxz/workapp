import React, { useMemo, memo } from 'react';

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
 * 
 * Performance:
 * - Memoized to prevent unnecessary re-renders
 * - SVG path calculations cached with useMemo
 */
function ProgressIndicator({ completed, total, size = 'small' }: ProgressIndicatorProps) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  // Memoize calculations to prevent recalculation on every render
  const { containerSize, circleSize, pathData } = useMemo(() => {
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

    return {
      containerSize,
      circleSize,
      pathData: {
        center,
        outerRadius,
        innerRadius,
        startY,
        x,
        y,
        largeArcFlag,
        strokeWidth,
      },
    };
  }, [size, percentage]);
  
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
          cx={pathData.center}
          cy={pathData.center}
          r={pathData.outerRadius}
          fill="none"
          stroke="#7D7D7F"
          strokeWidth={pathData.strokeWidth}
        />
        {/* Progress pie slice */}
        {percentage === 100 ? (
          // When 100%, fill the entire inner circle
          <circle
            cx={pathData.center}
            cy={pathData.center}
            r={pathData.innerRadius}
            fill="#7D7D7F"
          />
        ) : percentage > 0 ? (
          <path
            d={`M ${pathData.center} ${pathData.center} L ${pathData.center} ${pathData.startY} A ${pathData.innerRadius} ${pathData.innerRadius} 0 ${pathData.largeArcFlag} 1 ${pathData.x} ${pathData.y} Z`}
            fill="#7D7D7F"
          />
        ) : null}
      </svg>
    </div>
  );
}

export default memo(ProgressIndicator);
