"use client";

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import ButtonSmall from '@/components/ButtonSmall';

type CalendarHeaderProps = {
  monthLabel: string;
  yearLabel: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
};

export default function CalendarHeader({
  monthLabel,
  yearLabel,
  onPrevWeek,
  onNextWeek,
  onToday,
}: CalendarHeaderProps) {
  return (
    <div className="flex-shrink-0 h-14 flex items-center px-4 border-b border-neutral-200 bg-white">
      {/* Left: Today button, then navigation arrows, then month/year */}
      <div className="flex items-center gap-3">
        {/* Today button */}
        <ButtonSmall onClick={onToday}>
          Today
        </ButtonSmall>
        
        {/* Navigation arrows */}
        <div className="flex items-center gap-1">
          <button
            onClick={onPrevWeek}
            className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-neutral-200 transition-colors"
            aria-label="Previous week"
          >
            <CaretLeft size={16} className="text-[#1d1d1f]" />
          </button>
          <button
            onClick={onNextWeek}
            className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-neutral-200 transition-colors"
            aria-label="Next week"
          >
            <CaretRight size={16} className="text-[#1d1d1f]" />
          </button>
        </div>
        
        {/* Month/Year label */}
        <div className="flex items-center gap-2 font-medium text-[16px]">
          <span className="text-[#1d1d1f]">{monthLabel}</span>
          <span className="text-[#7d7d7f]">{yearLabel}</span>
        </div>
      </div>
    </div>
  );
}
