"use client";

import { ReactNode } from 'react';

type ButtonSmallProps = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

export default function ButtonSmall({ 
  children, 
  onClick, 
  disabled,
  className = '',
}: ButtonSmallProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center justify-center px-2 h-6 
        text-[12px] font-medium text-black 
        bg-[#fafafa] border border-[rgba(29,29,31,0.2)] rounded-[7px] 
        hover:bg-neutral-100 
        active:bg-neutral-200 active:scale-[0.97] 
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all
        ${className}
      `}
    >
      {children}
    </button>
  );
}

