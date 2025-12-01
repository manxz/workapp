"use client";

import { useState } from 'react';

export type RecurringDeleteOption = 'this' | 'all' | 'following';

type RecurringDeleteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (option: RecurringDeleteOption) => void;
  eventTitle: string;
};

/**
 * Modal for deleting recurring events with radio button options:
 * - Delete this event only
 * - Delete this and all following events  
 * - Delete all events in series
 */
export default function RecurringDeleteModal({ 
  isOpen, 
  onClose, 
  onConfirm,
}: RecurringDeleteModalProps) {
  const [selectedOption, setSelectedOption] = useState<RecurringDeleteOption>('this');
  
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(selectedOption);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50" 
      style={{ backgroundColor: 'rgba(29, 29, 31, 0.55)' }} 
      onClick={onClose}
    >
      <div 
        className="bg-[#fafafa] border border-[rgba(29,29,31,0.1)] rounded-2xl p-4 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <h2 className="font-semibold text-[16px] text-[#1d1d1f]">
          Delete recurring event
        </h2>

        {/* Radio Options */}
        <div className="border border-[rgba(29,29,31,0.1)] rounded-lg overflow-hidden w-[208px]">
          {/* This event */}
          <label 
            className={`flex gap-2 items-center h-[31px] px-2 cursor-pointer border-b border-[rgba(29,29,31,0.1)] ${
              selectedOption === 'this' ? 'bg-[#fafafa]' : 'bg-white'
            }`}
          >
            <div className="flex items-center justify-center w-4 h-4">
              <div className={`w-[13px] h-[13px] rounded-full border border-[#1d1d1f] flex items-center justify-center`}>
                {selectedOption === 'this' && (
                  <div className="w-2 h-2 rounded-full bg-[#1d1d1f]" />
                )}
              </div>
            </div>
            <input 
              type="radio" 
              name="deleteOption" 
              value="this"
              checked={selectedOption === 'this'}
              onChange={() => setSelectedOption('this')}
              className="sr-only"
            />
            <span className="text-[12px] font-medium text-[#1d1d1f]">This event</span>
          </label>

          {/* This and following events */}
          <label 
            className={`flex gap-2 items-center h-[31px] px-2 cursor-pointer border-b border-[rgba(29,29,31,0.1)] ${
              selectedOption === 'following' ? 'bg-[#fafafa]' : 'bg-white'
            }`}
          >
            <div className="flex items-center justify-center w-4 h-4">
              <div className={`w-[13px] h-[13px] rounded-full border border-[#1d1d1f] flex items-center justify-center`}>
                {selectedOption === 'following' && (
                  <div className="w-2 h-2 rounded-full bg-[#1d1d1f]" />
                )}
              </div>
            </div>
            <input 
              type="radio" 
              name="deleteOption" 
              value="following"
              checked={selectedOption === 'following'}
              onChange={() => setSelectedOption('following')}
              className="sr-only"
            />
            <span className="text-[12px] font-medium text-[#1d1d1f]">This and following events</span>
          </label>

          {/* All events */}
          <label 
            className={`flex gap-2 items-center h-[31px] px-2 cursor-pointer ${
              selectedOption === 'all' ? 'bg-[#fafafa]' : 'bg-white'
            }`}
          >
            <div className="flex items-center justify-center w-4 h-4">
              <div className={`w-[13px] h-[13px] rounded-full border border-[#1d1d1f] flex items-center justify-center`}>
                {selectedOption === 'all' && (
                  <div className="w-2 h-2 rounded-full bg-[#1d1d1f]" />
                )}
              </div>
            </div>
            <input 
              type="radio" 
              name="deleteOption" 
              value="all"
              checked={selectedOption === 'all'}
              onChange={() => setSelectedOption('all')}
              className="sr-only"
            />
            <span className="text-[12px] font-medium text-[#1d1d1f]">All events</span>
          </label>
        </div>

        {/* Footer Buttons */}
        <div className="flex gap-2 items-center justify-end">
          <button
            onClick={onClose}
            className="bg-white border border-[rgba(29,29,31,0.1)] text-black text-[12px] font-medium px-2 h-6 rounded-[7px] hover:bg-neutral-50 transition-colors flex items-center justify-center"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="bg-[#1d1d1f] border border-[rgba(29,29,31,0.2)] text-white text-[12px] font-medium px-2 h-6 rounded-[7px] hover:bg-[#3d3d3f] transition-colors flex items-center justify-center"
          >
            Ok
          </button>
        </div>
      </div>
    </div>
  );
}
