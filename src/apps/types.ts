import { ComponentType } from 'react';

/**
 * Available app IDs in the system
 */
export type AppId = 'chat' | 'projects' | 'notes' | 'crm';

/**
 * App metadata and configuration
 */
export type AppDefinition = {
  /** Unique identifier */
  id: AppId;
  
  /** Display name */
  name: string;
  
  /** Icon name from Phosphor Icons */
  icon: string;
  
  /** Lazy-loaded component */
  component: () => Promise<{ default: ComponentType<any> }>;
  
  /** Whether this app is enabled by default for new users */
  defaultEnabled: boolean;
  
  /** Short description for App Library */
  description: string;
  
  /** Category for grouping in App Library (e.g., "Productivity", "Sales") */
  category: string;
  
  /** Whether this app can be disabled by users (Chat is always enabled) */
  canDisable: boolean;
  
  /** Whether this app is still in development (shows WIP badge) */
  isWIP: boolean;
};

/**
 * Props passed to each app component
 * 
 * Apps receive minimal props and use AppContext for cross-app communication.
 */
export type AppProps = {
  /** Optional props for specific app needs */
  [key: string]: any;
};

