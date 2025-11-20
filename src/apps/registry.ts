import { AppDefinition, AppId } from './types';

/**
 * Registry of all available apps
 * 
 * This is the single source of truth for which apps exist in the system.
 * Currently includes Chat and Projects. More apps (todo, crm) can be added later.
 * 
 * NOTE: This refactor sets up the foundation for user-controlled app toggling,
 * but the UI for that doesn't exist yet. For now, all apps are always enabled.
 */
export const AVAILABLE_APPS: Record<AppId, AppDefinition> = {
  chat: {
    id: 'chat',
    name: 'Chat',
    icon: 'ChatCircle',
    component: () => import('./chat/ChatApp'),
    defaultEnabled: true,
    description: 'Messaging, channels, DMs, and threads',
  },
  
  projects: {
    id: 'projects',
    name: 'Projects',
    icon: 'Kanban',
    component: () => import('./projects/ProjectsApp'),
    defaultEnabled: true, // Always enabled for now
    description: 'Project management with Kanban boards',
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

