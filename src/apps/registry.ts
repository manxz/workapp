import { AppDefinition, AppId } from './types';

/**
 * App categories for organizing apps in the App Library
 */
export const APP_CATEGORIES = {
  PRODUCTIVITY: 'Productivity',
  SALES: 'Sales',
  MARKETING: 'Marketing',
  FINANCE: 'Finance',
} as const;

/**
 * Registry of all available apps
 * 
 * This is the single source of truth for which apps exist in the system.
 * Includes Chat, Projects, and future apps (Notes, CRM).
 * 
 * Each app has metadata for:
 * - Display in App Library
 * - Dynamic loading/code splitting
 * - Per-user enable/disable logic
 */
export const AVAILABLE_APPS: Record<AppId, AppDefinition> = {
  chat: {
    id: 'chat',
    name: 'Chat',
    icon: 'ChatCenteredText',
    component: () => import('./chat/ChatApp'),
    defaultEnabled: true,
    description: 'Team communication essentials',
    category: 'Productivity',
    canDisable: false, // Chat is always enabled
    isWIP: false,
  },
  
  projects: {
    id: 'projects',
    name: 'Projects',
    icon: 'Cube',
    component: () => import('./projects/ProjectsApp'),
    defaultEnabled: true,
    description: 'List or Kanban. Track all your issues and projects',
    category: 'Productivity',
    canDisable: true,
    isWIP: false,
  },

  // Notepad app (Lists and Notes)
  notes: {
    id: 'notes',
    name: 'Notepad',
    icon: 'Notepad',
    component: () => import('./notepad/NotepadApp'),
    defaultEnabled: false,
    description: 'Keep track of tasks and thoughts',
    category: 'Productivity',
    canDisable: true,
    isWIP: false,
  },

  // Calendar app
  calendar: {
    id: 'calendar',
    name: 'Calendar',
    icon: 'Calendar',
    component: () => import('./calendar/CalendarApp'),
    defaultEnabled: true,
    description: 'Schedule meetings and manage your time',
    category: 'Productivity',
    canDisable: true,
    isWIP: false,
  },

  crm: {
    id: 'crm',
    name: 'CRM',
    icon: 'UserCircle',
    component: () => Promise.resolve({ default: () => null }), // Placeholder
    defaultEnabled: false,
    description: 'Manage your customers and potential sales leads',
    category: 'Productivity',
    canDisable: true,
    isWIP: true,
  },
};

/**
 * Get app definition by ID
 */
export function getApp(appId: AppId): AppDefinition | undefined {
  return AVAILABLE_APPS[appId];
}

/**
 * Get all available apps as an array
 */
export function getAllApps(): AppDefinition[] {
  return Object.values(AVAILABLE_APPS);
}

/**
 * Get all apps for a specific category
 */
export function getAppsByCategory(category: string): AppDefinition[] {
  return Object.values(AVAILABLE_APPS).filter(app => app.category === category);
}

/**
 * Get all unique categories
 */
export function getAllCategories(): string[] {
  return Object.values(APP_CATEGORIES);
}

