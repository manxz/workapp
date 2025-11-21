import React from 'react';

interface CheckboxProps {
  state?: 'default' | 'filled' | 'add';
  onClick?: () => void;
  className?: string;
}

/**
 * Checkbox component for the Notepad Lists view.
 * 
 * States:
 * - default: Empty square with black border
 * - filled: Blue filled with white checkmark
 * - add: Light gray for placeholder/new item
 * 
 * Design from Figma:
 * - 13x13px checkbox
 * - 3px border radius
 * - Blue (#0070F3) when filled
 */
export default function Checkbox({ state = 'default', onClick, className = '' }: CheckboxProps) {
  if (state === 'filled') {
    return (
      <button
        onClick={onClick}
        className={`w-[13px] h-[13px] bg-blue-600 border border-blue-600 rounded-[3px] flex-shrink-0 hover:bg-blue-700 transition-colors flex items-center justify-center ${className}`}
      >
        <svg
          width="10"
          height="8"
          viewBox="0 0 10 8"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1 4L3.5 6.5L9 1"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    );
  }

  if (state === 'add') {
    return (
      <div className={`w-[13px] h-[13px] border border-[rgba(29,29,31,0.1)] rounded-[3px] flex-shrink-0 bg-[#fafafa] flex items-center justify-center ${className}`}>
        <svg
          width="7"
          height="7"
          viewBox="0 0 7 7"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3.5 0.5V6.5M0.5 3.5H6.5"
            stroke="#B0B0B0"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  // Default state
  return (
    <button
      onClick={onClick}
      className={`w-[13px] h-[13px] border border-black rounded-[3px] flex-shrink-0 hover:bg-neutral-50 transition-colors ${className}`}
    />
  );
}

