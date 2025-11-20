"use client";

import { createContext, useContext, ReactNode } from 'react';

/**
 * Cross-app communication interface
 * 
 * This allows apps to interact with each other without tight coupling.
 * Examples:
 * - Create a project task from a chat message
 * - Link a chat conversation to a project
 * - Open a specific app/view from another app
 */
export type AppCommunication = {
  /** Navigate to a specific app and optional sub-view */
  navigateToApp: (appId: string, params?: Record<string, any>) => void;
  
  /** Create a project task (callable from Chat) */
  createProjectTask?: (projectId: string, taskData: {
    title: string;
    description?: string;
    status?: string;
  }) => Promise<void>;
  
  /** Open chat for a specific conversation (callable from Projects) */
  openChat?: (conversationId: string) => void;
  
  /** Trigger a global notification */
  showNotification?: (message: string, type?: 'success' | 'error' | 'info') => void;
  
  /** Get current active app */
  getCurrentApp: () => string;
  
  /** Pass data between apps */
  shareData?: (data: any) => void;
};

const AppContext = createContext<AppCommunication | null>(null);

export function AppProvider({ 
  children, 
  value 
}: { 
  children: ReactNode; 
  value: AppCommunication;
}) {
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * Hook for apps to access cross-app communication
 * 
 * @example
 * // In ChatApp
 * const { navigateToApp, createProjectTask } = useAppCommunication();
 * 
 * // Create task from chat message
 * await createProjectTask?.('project-123', {
 *   title: 'Bug: Login not working',
 *   description: 'Reported by user in chat'
 * });
 * 
 * @example
 * // In ProjectsApp
 * const { openChat } = useAppCommunication();
 * 
 * // Open chat for discussing a task
 * openChat?.('channel-general');
 */
export function useAppCommunication() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppCommunication must be used within AppProvider');
  }
  return context;
}

