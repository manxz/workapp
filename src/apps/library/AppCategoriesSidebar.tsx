import React from 'react';
import { getAllCategories } from '@/apps/registry';

interface AppCategoriesSidebarProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

/**
 * Categories sidebar for the App Library.
 * 
 * Reuses the existing sidebar styling pattern from ProjectsSidebar.
 * Shows list of app categories (Productivity, Sales, Marketing, Finance).
 * Only Productivity is enabled - others are disabled/coming soon.
 */
export default function AppCategoriesSidebar({
  selectedCategory,
  onSelectCategory,
}: AppCategoriesSidebarProps) {
  const categories = getAllCategories();
  
  // Only Productivity is enabled for now
  const enabledCategories = ['Productivity'];

  return (
    <div className="bg-neutral-100 border-r border-neutral-200 h-screen w-[200px] flex flex-col gap-2 py-4 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-1.5 h-6">
        <h2 className="text-lg font-medium text-black">
          Apps
        </h2>
      </div>

      {/* Categories Section */}
      <div className="flex flex-col w-full">
        {/* Categories List */}
        <div className="flex flex-col px-2">
          {categories.map((category) => {
            const isSelected = category === selectedCategory;
            const isEnabled = enabledCategories.includes(category);
            
            return (
              <div key={category} className="relative">
                <div
                  className={`flex items-center justify-between w-full px-2 py-1.5 rounded-[7px] transition-colors ${
                    isSelected && isEnabled
                      ? 'bg-neutral-200'
                      : isEnabled
                      ? 'hover:bg-neutral-200'
                      : ''
                  }`}
                >
                  <button
                    onClick={() => isEnabled && onSelectCategory(category)}
                    disabled={!isEnabled}
                    className="flex-1 text-left"
                  >
                    <p
                      className={`text-[13px] font-semibold ${
                        isEnabled ? 'text-black' : 'text-neutral-400'
                      }`}
                    >
                      {category}
                    </p>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

