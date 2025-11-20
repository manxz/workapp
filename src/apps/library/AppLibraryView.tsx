import React, { useState } from 'react';
import AppCategoriesSidebar from './AppCategoriesSidebar';
import AppCard from './AppCard';
import DisableAppModal from './DisableAppModal';
import { getAppsByCategory, APP_CATEGORIES } from '@/apps/registry';
import { AppDefinition } from '@/apps/types';

interface AppLibraryViewProps {
  sharedToggleApp: (appId: string) => Promise<boolean>;
  sharedIsAppEnabled: (appId: string) => boolean;
}

/**
 * App Library main view.
 * 
 * Allows users to browse apps by category and toggle them on/off.
 * - Shows categories sidebar (reuses existing pattern)
 * - Shows app cards in a grid
 * - Handles toggle logic with confirmation modal for disabling
 * - Per-user preferences stored in database
 * - Uses shared state from parent to ensure Sidebar updates immediately
 */
export default function AppLibraryView({ sharedToggleApp, sharedIsAppEnabled }: AppLibraryViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(APP_CATEGORIES.PRODUCTIVITY);
  const [appToDisable, setAppToDisable] = useState<AppDefinition | null>(null);

  const appsInCategory = getAppsByCategory(selectedCategory);

  /**
   * Handles toggle click.
   * - If enabling: Toggle immediately
   * - If disabling: Show confirmation modal
   */
  const handleToggle = (appId: string) => {
    const app = appsInCategory.find(a => a.id === appId);
    if (!app) return;

    const currentlyEnabled = sharedIsAppEnabled(appId);

    if (currentlyEnabled) {
      // Disabling: Show confirmation
      setAppToDisable(app);
    } else {
      // Enabling: Immediate toggle
      sharedToggleApp(appId);
    }
  };

  /**
   * Confirms disabling an app
   */
  const handleConfirmDisable = async () => {
    if (appToDisable) {
      await sharedToggleApp(appToDisable.id);
      setAppToDisable(null);
    }
  };

  /**
   * Cancels disabling an app
   */
  const handleCancelDisable = () => {
    setAppToDisable(null);
  };

  return (
    <>
      {/* App Library Container - accounts for main Sidebar (64px) */}
      <div className="flex h-screen ml-16 w-full">
        {/* Categories Sidebar */}
        <AppCategoriesSidebar
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        {/* Main Content */}
        <div className="flex-1 bg-white flex flex-col min-w-0">
          {/* Header */}
          <div className="border-b border-[rgba(29,29,31,0.1)] py-4 px-4">
            <div className="h-6 flex items-center">
              <p className="text-base font-medium text-[#1d1d1f]">
                {selectedCategory}
              </p>
            </div>
          </div>

          {/* App Cards Grid */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="flex gap-[18px] flex-wrap">
              {appsInCategory.map((app) => (
                <AppCard
                  key={app.id}
                  app={app}
                  isEnabled={sharedIsAppEnabled(app.id)}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Disable Confirmation Modal */}
      {appToDisable && (
        <DisableAppModal
          app={appToDisable}
          onConfirm={handleConfirmDisable}
          onCancel={handleCancelDisable}
        />
      )}
    </>
  );
}

