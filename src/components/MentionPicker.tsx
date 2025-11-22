/**
 * Mention Picker Component
 * 
 * Dropdown that appears when typing @ in chat input.
 * Shows filtered list of users with keyboard navigation.
 */

import { useState, useEffect, useRef } from "react";

export type User = {
  id: string;
  name: string;
  avatar: string;
};

type MentionPickerProps = {
  users: User[];
  query: string;
  onSelect: (user: User) => void;
  onClose: () => void;
  position: { top: number; left: number };
};

export default function MentionPicker({
  users,
  query,
  onSelect,
  onClose,
  position,
}: MentionPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Filter users based on query
  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(query.toLowerCase())
  );

  // Reset selected index when filtered users change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredUsers.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (filteredUsers[selectedIndex]) {
          onSelect(filteredUsers[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredUsers, selectedIndex, onSelect, onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (filteredUsers.length === 0) {
    return null;
  }

  return (
    <div
      ref={pickerRef}
      className="fixed bg-white border border-[rgba(29,29,31,0.2)] rounded-[12px] w-[200px] flex flex-col gap-[2px] py-[4px] shadow-lg z-[9999]"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateY(calc(-100% - 8px))', // Position above with 8px gap
      }}
    >
      {filteredUsers.map((user, index) => (
        <div
          key={user.id}
          className={`flex items-center h-[24px] px-[6px] py-[4px] rounded-[8px] mx-[4px] cursor-pointer ${
            index === selectedIndex ? "bg-[#f5f5f5]" : ""
          }`}
          onClick={() => onSelect(user)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <div className="flex gap-[4px] items-center flex-1">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-[16px] h-[16px] rounded-full object-cover"
            />
            <p className="font-['Inter'] font-medium text-[12px] text-black">
              {user.name}
            </p>
          </div>
          {index === selectedIndex && (
            <span className="text-[10px] font-medium text-black px-1 py-[2px] bg-[#f5f5f5] border border-[rgba(29,29,31,0.1)] rounded-[5px] leading-none tracking-[0.025px]">
              Enter
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

