"use client";

import { useState } from "react";
import { Plus, CaretDown } from "@phosphor-icons/react";
import ProgressIndicator from "./ProgressIndicator";

type List = {
  id: string;
  name: string;
  completed: number;
  total: number;
};

type NotepadSidebarProps = {
  lists: List[];
  selectedId?: string;
  selectedType?: "list" | "note";
  onSelectList?: (list: List) => void;
  onCreateList?: () => void;
};

export default function NotepadSidebar({
  lists,
  selectedId,
  selectedType,
  onSelectList,
  onCreateList,
}: NotepadSidebarProps) {
  return (
    <div className="bg-neutral-100 border-r border-neutral-200 flex flex-col h-screen w-[200px] py-4 fixed left-16 top-0">
      <div className="flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-center justify-between pl-4 py-1.5 h-6">
          <h2 className="text-lg font-medium text-black">Notepad</h2>
        </div>

        {/* Lists Section */}
        <div className="flex flex-col w-full">
          {/* Lists Header */}
          <div className="px-2 pr-2">
            <div className="flex items-center justify-between pl-2 pr-0 py-1.5">
              <div className="flex items-center gap-0.5">
                <p className="text-[13px] font-semibold text-neutral-500">Lists</p>
                <CaretDown size={16} className="text-neutral-500" weight="bold" />
              </div>
              <button
                onClick={onCreateList}
                className="text-black hover:bg-neutral-200 rounded-md w-6 h-6 flex items-center justify-center transition-colors"
              >
                <Plus size={16} weight="regular" />
              </button>
            </div>
          </div>

          {/* Lists */}
          <div className="flex flex-col px-2">
          {lists.map((list) => (
            <div key={list.id} className="relative group">
              <div
                className={`flex items-center justify-between w-full px-2 py-1.5 rounded-[7px] transition-colors cursor-pointer ${
                  selectedId === list.id && selectedType === "list"
                    ? "bg-neutral-200"
                    : "hover:bg-neutral-200"
                }`}
                onClick={() => onSelectList?.(list)}
              >
                <p
                  className={`text-[13px] text-black ${
                    selectedId === list.id && selectedType === "list"
                      ? "font-semibold"
                      : "font-medium"
                  }`}
                >
                  {list.name}
                </p>

                <div className="flex items-center gap-0.5">
                  <span className="text-[12px] font-medium text-neutral-500">
                    {list.completed}/{list.total}
                  </span>
                  <ProgressIndicator
                    completed={list.completed}
                    total={list.total}
                    size="small"
                  />
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>

        {/* Notes Section - Placeholder for future */}
        <div className="flex flex-col w-full mt-2">
          {/* Notes Header */}
          <div className="px-2 pr-2">
            <div className="flex items-center justify-between pl-2 pr-0 py-1.5">
              <div className="flex items-center gap-0.5">
                <p className="text-[13px] font-semibold text-neutral-500">Notes</p>
                <CaretDown size={16} className="text-neutral-500" weight="bold" />
              </div>
              <button className="text-black hover:bg-neutral-200 rounded-md w-6 h-6 flex items-center justify-center transition-colors">
                <Plus size={16} weight="regular" />
              </button>
            </div>
          </div>

          {/* Notes List - Coming soon */}
          <div className="flex flex-col px-2">
            <p className="text-[12px] text-neutral-400 px-2 py-1.5">
              Coming soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

