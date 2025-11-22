"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import {
  TextHOne,
  Highlighter,
  Circle,
  TextB,
  TextItalic,
  TextUnderline,
  TextStrikethrough,
  TextAlignLeft,
  TextAlignCenter,
  TextAlignRight,
  TextAlignJustify,
  Trash,
} from '@phosphor-icons/react';

interface RichTextEditorProps {
  content: string;
  title: string;
  onContentChange: (content: string) => void;
  onTitleChange: (title: string) => void;
  onDelete: () => void;
}

// Memoize highlight colors array to prevent recreation on every render
const HIGHLIGHT_COLORS = [
  { name: 'Yellow', color: '#FFE085' },
  { name: 'Green', color: '#A7F3D0' },
  { name: 'Blue', color: '#BAE6FD' },
  { name: 'Pink', color: '#FBCFE8' },
  { name: 'Purple', color: '#DDD6FE' },
] as const;

export default function RichTextEditor({
  content,
  title,
  onContentChange,
  onTitleChange,
  onDelete,
}: RichTextEditorProps) {
  // Local state for title to make input responsive
  const [localTitle, setLocalTitle] = useState(title);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#FFE085');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [, forceUpdate] = useState({});

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1],
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Underline,
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none font-medium text-[13px] text-[#1d1d1f]',
      },
    },
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML());
      forceUpdate({}); // Force re-render to update button states
    },
    onSelectionUpdate: () => {
      forceUpdate({}); // Force re-render when selection changes
    },
  });

  // Update editor content when prop changes (for switching notes)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Update local title when prop changes (for switching notes)
  useEffect(() => {
    setLocalTitle(title);
    // Auto-focus title input when a new note is created (empty title)
    if (title === '') {
      // Small delay to ensure component is fully mounted
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 0);
    }
  }, [title]);

  // Memoize title change handler to prevent recreation
  const handleTitleChange = useCallback((newTitle: string) => {
    setLocalTitle(newTitle);
    onTitleChange(newTitle);
  }, [onTitleChange]);

  // Memoize color picker toggle
  const toggleColorPicker = useCallback(() => {
    setShowColorPicker(prev => !prev);
  }, []);

  // Memoize color selection handler
  const handleColorSelect = useCallback((color: string) => {
    setSelectedColor(color);
    editor?.chain().focus().toggleHighlight({ color }).run();
    setShowColorPicker(false);
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen flex-1 relative overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-center px-4 py-2 flex-shrink-0 h-14">
        <div className="flex items-center max-w-[680px] w-full justify-between">
          {/* Formatting buttons container with 8px gap */}
          <div className="flex items-center gap-2">
            {/* H1 Button */}
            <div className="border border-[rgba(29,29,31,0.1)] rounded-lg flex items-center gap-px overflow-hidden">
              <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={`p-2 transition-colors ${
                  editor.isActive('heading', { level: 1 }) ? 'bg-[#1d1d1f] hover:bg-[#1d1d1f]' : 'hover:bg-neutral-200'
                }`}
              >
                <TextHOne size={16} weight="regular" className={editor.isActive('heading', { level: 1 }) ? 'text-white hover:text-white/70 transition-colors' : ''} />
              </button>
            </div>

            {/* Highlighter + Color */}
            <div className="border border-[rgba(29,29,31,0.1)] rounded-lg relative">
              <button
                onClick={toggleColorPicker}
                className="flex items-center gap-1 p-2 hover:bg-neutral-200 transition-colors w-full overflow-hidden rounded-lg"
              >
                <Highlighter size={16} weight="regular" />
                <Circle size={16} weight="fill" style={{ color: selectedColor }} />
              </button>

              {/* Color Picker Dropdown */}
              {showColorPicker && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-[rgba(29,29,31,0.1)] rounded-lg shadow-lg p-2 flex gap-1 z-50">
                  {HIGHLIGHT_COLORS.map((item) => (
                    <button
                      key={item.color}
                      onClick={() => handleColorSelect(item.color)}
                      className={`w-4 h-4 rounded-full border-2 hover:scale-110 transition-transform ${
                        selectedColor === item.color ? 'border-black' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: item.color }}
                      title={item.name}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Text Formatting */}
            <div className="border border-[rgba(29,29,31,0.1)] rounded-lg flex items-center gap-px overflow-hidden">
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-2 transition-colors ${
                  editor.isActive('bold') ? 'bg-[#1d1d1f] hover:bg-[#1d1d1f]' : 'hover:bg-neutral-200'
                }`}
              >
                <TextB size={16} weight="regular" className={editor.isActive('bold') ? 'text-white hover:text-white/70 transition-colors' : ''} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-2 transition-colors ${
                  editor.isActive('italic') ? 'bg-[#1d1d1f] hover:bg-[#1d1d1f]' : 'hover:bg-neutral-200'
                }`}
              >
                <TextItalic size={16} weight="regular" className={editor.isActive('italic') ? 'text-white hover:text-white/70 transition-colors' : ''} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`p-2 transition-colors ${
                  editor.isActive('underline') ? 'bg-[#1d1d1f] hover:bg-[#1d1d1f]' : 'hover:bg-neutral-200'
                }`}
              >
                <TextUnderline size={16} weight="regular" className={editor.isActive('underline') ? 'text-white hover:text-white/70 transition-colors' : ''} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={`p-2 transition-colors ${
                  editor.isActive('strike') ? 'bg-[#1d1d1f] hover:bg-[#1d1d1f]' : 'hover:bg-neutral-200'
                }`}
              >
                <TextStrikethrough size={16} weight="regular" className={editor.isActive('strike') ? 'text-white hover:text-white/70 transition-colors' : ''} />
              </button>
            </div>

            {/* Text Alignment */}
            <div className="border border-[rgba(29,29,31,0.1)] rounded-lg flex items-center gap-px overflow-hidden">
              <button
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={`p-2 transition-colors ${
                  editor.isActive({ textAlign: 'left' }) ? 'bg-[#1d1d1f] hover:bg-[#1d1d1f]' : 'hover:bg-neutral-200'
                }`}
              >
                <TextAlignLeft size={16} weight="regular" className={editor.isActive({ textAlign: 'left' }) ? 'text-white hover:text-white/70 transition-colors' : ''} />
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={`p-2 transition-colors ${
                  editor.isActive({ textAlign: 'center' }) ? 'bg-[#1d1d1f] hover:bg-[#1d1d1f]' : 'hover:bg-neutral-200'
                }`}
              >
                <TextAlignCenter size={16} weight="regular" className={editor.isActive({ textAlign: 'center' }) ? 'text-white hover:text-white/70 transition-colors' : ''} />
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={`p-2 transition-colors ${
                  editor.isActive({ textAlign: 'right' }) ? 'bg-[#1d1d1f] hover:bg-[#1d1d1f]' : 'hover:bg-neutral-200'
                }`}
              >
                <TextAlignRight size={16} weight="regular" className={editor.isActive({ textAlign: 'right' }) ? 'text-white hover:text-white/70 transition-colors' : ''} />
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                className={`p-2 transition-colors ${
                  editor.isActive({ textAlign: 'justify' }) ? 'bg-[#1d1d1f] hover:bg-[#1d1d1f]' : 'hover:bg-neutral-200'
                }`}
              >
                <TextAlignJustify size={16} weight="regular" className={editor.isActive({ textAlign: 'justify' }) ? 'text-white hover:text-white/70 transition-colors' : ''} />
              </button>
            </div>
          </div>

          {/* Delete Button - separate */}
          <button
            onClick={onDelete}
            className="flex items-center justify-center rounded-lg w-8 h-8 hover:bg-neutral-200 transition-colors"
          >
            <Trash size={16} weight="regular" />
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-[680px] mx-auto">
          {/* Title Input */}
          <input
            ref={titleInputRef}
            type="text"
            value={localTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Untitled"
            className="w-full text-base font-semibold text-[#1d1d1f] bg-transparent outline-none mb-2 placeholder:text-neutral-400"
          />

          {/* Rich Text Editor */}
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

