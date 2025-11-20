import { ComponentType } from 'react';

/**
 * Available app IDs in the system
 * NOTE: More apps (todo, crm) can be added here in the future
 */
export type AppId = 'chat' | 'projects';

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
  
  /** Short description for settings */
  description?: string;
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

