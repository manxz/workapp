"use client";

import { useState, useMemo, useCallback, memo } from "react";
import { Plus, CaretDown, Users } from "@phosphor-icons/react";
import ProgressIndicator from "./ProgressIndicator";
import { Note } from "@/hooks/useNotes";

type List = {
  id: string;
  name: string;
  completed: number;
  total: number;
  is_shared?: boolean; // New: indicates if list has collaborators
  collaborator_count?: number; // New: number of collaborators
};

type NotepadSidebarProps = {
  lists: List[];
  notes: Note[];
  notesLoading?: boolean;
  selectedId?: string;
  selectedType?: "list" | "note";
  onSelectList?: (list: List) => void;
  onSelectNote?: (note: Note) => void;
  onCreateList?: () => void;
  onCreateNote?: () => void;
};

// Helper function to group notes by time period
function groupNotesByTime(notes: Note[]) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const groups: Record<string, Note[]> = {
    Yesterday: [],
    'Previous 7 days': [],
  };

  notes.forEach((note) => {
    const noteDate = new Date(note.updated_at);
    const isToday = noteDate.toDateString() === now.toDateString();
    const isYesterday = noteDate.toDateString() === yesterday.toDateString();
    const isWithinSevenDays = noteDate >= sevenDaysAgo;

    if (isYesterday) {
      groups['Yesterday'].push(note);
    } else if (isWithinSevenDays && !isToday) {
      groups['Previous 7 days'].push(note);
    }
  });

  return groups;
}

// Memoize individual list item component
const ListItem = memo(({ 
  list, 
  isSelected, 
  onSelect 
}: { 
  list: List; 
  isSelected: boolean; 
  onSelect: (list: List) => void;
}) => (
  <div className="relative group">
    <div
      className={`flex items-center justify-between w-full px-2 py-1.5 rounded-[7px] transition-colors cursor-pointer ${
        isSelected ? "bg-neutral-200" : "hover:bg-neutral-200"
      }`}
      onClick={() => onSelect(list)}
    >
      <div className="flex items-center gap-1">
        <p className={`text-[13px] text-black ${isSelected ? "font-semibold" : "font-medium"}`}>
          {list.name}
        </p>
        {list.is_shared && (
          <Users size={14} weight="fill" className="text-[#6A6A6A] flex-shrink-0" />
        )}
      </div>
      <div className="flex items-center gap-[2px]">
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
));
ListItem.displayName = 'ListItem';

// Memoize individual note card component
const NoteCard = memo(({ 
  note, 
  isSelected, 
  onSelect 
}: { 
  note: Note; 
  isSelected: boolean; 
  onSelect: (note: Note) => void;
}) => (
  <div className="relative group">
    <div
      className={`border border-[rgba(29,29,31,0.1)] rounded-lg p-2 flex flex-col cursor-pointer transition-colors ${
        isSelected ? "bg-[#e0e0e0]" : "bg-[#fafafa] hover:bg-neutral-200"
      }`}
      onClick={() => onSelect(note)}
    >
      <p className="text-[13px] text-[#1d1d1f] font-semibold truncate">
        {note.title || 'New note'}
      </p>
      <div className="flex gap-2 items-start">
        <p className="text-[12px] font-medium text-[rgba(29,29,31,0.6)] whitespace-nowrap">
          {new Date(note.updated_at).toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: '2-digit',
          })}
        </p>
        <p className="text-[12px] font-medium text-[rgba(29,29,31,0.4)] truncate flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
          {note.preview || 'No preview'}
        </p>
      </div>
    </div>
  </div>
));
NoteCard.displayName = 'NoteCard';

function NotepadSidebar({
  lists,
  notes,
  notesLoading = false,
  selectedId,
  selectedType,
  onSelectList,
  onSelectNote,
  onCreateList,
  onCreateNote,
}: NotepadSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    Yesterday: true,
    'Previous 7 days': true,
  });

  const groupedNotes = useMemo(() => groupNotesByTime(notes), [notes]);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  return (
    <div className="bg-neutral-100 border-r border-neutral-200 flex flex-col h-screen w-[240px] py-4 fixed left-16 top-0 overflow-y-auto">
      <div className="flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-center justify-between pl-4 py-1.5 h-6">
          <h2 className="text-lg font-medium text-black">Notepad</h2>
        </div>

        {/* My Lists Section */}
        <div className="flex flex-col w-full">
          {/* My Lists Header */}
          <div className="px-2 pr-2">
            <div className="flex items-center justify-between pl-2 pr-0 py-1.5">
              <div className="flex items-center gap-0.5">
                <p className="text-[13px] font-semibold text-neutral-500">My lists</p>
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

          {/* My Lists */}
          <div className="flex flex-col px-2">
          {(() => {
            const myLists = lists.filter(list => !list.is_shared || (list.collaborator_count || 0) === 0);
            console.log('[NotepadSidebar] My lists:', myLists.map(l => l.name));
            return myLists;
          })().map((list) => (
            <ListItem
              key={list.id}
              list={list}
              isSelected={selectedId === list.id && selectedType === "list"}
              onSelect={onSelectList!}
            />
          ))}
          </div>
        </div>

        {/* Shared Lists Section */}
        {lists.some(list => list.is_shared && (list.collaborator_count || 0) > 0) && (
          <div className="flex flex-col w-full mt-4">
            {/* Shared Lists Header */}
            <div className="px-2 pr-2">
              <div className="flex items-center justify-between pl-2 pr-0 py-1.5">
                <div className="flex items-center gap-0.5">
                  <p className="text-[13px] font-semibold text-neutral-500">Shared</p>
                  <CaretDown size={16} className="text-neutral-500" weight="bold" />
                </div>
              </div>
            </div>

            {/* Shared Lists */}
            <div className="flex flex-col px-2">
            {lists.filter(list => list.is_shared && (list.collaborator_count || 0) > 0).map((list) => (
              <ListItem
                key={list.id}
                list={list}
                isSelected={selectedId === list.id && selectedType === "list"}
                onSelect={onSelectList!}
              />
            ))}
            </div>
          </div>
        )}

        {/* Notes Section - Commented out for future Docs app */}
        {/* <div className="flex flex-col w-full">
          <div className="px-2 pr-2">
            <div className="flex items-center justify-between pl-2 pr-0 py-1.5">
              <div className="flex items-center gap-0.5">
                <p className="text-[13px] font-semibold text-neutral-500">Notes</p>
              </div>
              <button
                onClick={onCreateNote}
                className="text-black hover:bg-neutral-200 rounded-md w-6 h-6 flex items-center justify-center transition-colors"
              >
                <Plus size={16} weight="regular" />
              </button>
            </div>
          </div>

          {notes.length > 0 && (
            <div className="flex flex-col gap-2 px-2">
              {notes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  isSelected={selectedId === note.id && selectedType === "note"}
                  onSelect={onSelectNote!}
                />
              ))}
            </div>
          )}
        </div> */}
      </div>
    </div>
  );
}

export default memo(NotepadSidebar);
