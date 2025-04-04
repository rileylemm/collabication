/**
 * Application Configuration
 * 
 * This module provides a consistent interface for accessing environment-specific
 * configuration values throughout the application.
 */

// Environment detection
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const isTest = process.env.NODE_ENV === 'test';

// Default configuration
const defaultConfig = {
  // API endpoints
  api: {
    baseUrl: isDevelopment ? 'http://localhost:4000' : '/api',
    timeout: 30000, // 30 seconds
  },
  
  // Collaboration server
  collaboration: {
    serverUrl: isDevelopment
      ? 'ws://localhost:1234'
      : (typeof window !== 'undefined' ? `wss://collab.${window.location.hostname}` : 'wss://collab.example.com'),
    reconnectInterval: 2000, // 2 seconds
    maxReconnectAttempts: 10,
  },
  
  // GitHub integration
  github: {
    authRedirectUrl: isDevelopment
      ? 'http://localhost:3000/auth/github/callback'
      : (typeof window !== 'undefined' ? `${window.location.origin}/auth/github/callback` : 'https://app.example.com/auth/github/callback'),
    scope: 'repo user',
  },
  
  // Local storage keys
  storage: {
    authToken: 'collabication-auth-token',
    githubToken: 'collabication-github-token',
    userSettings: 'collabication-user-settings',
    editorState: 'collabication-editor-state',
    recentFiles: 'collabication-recent-files',
  },
  
  // Feature flags
  features: {
    offlineMode: true,
    realTimeCollaboration: true,
    agentAssistance: true,
    fileHistory: true,
    autoSave: true,
  },
  
  // Application settings
  app: {
    name: 'Collabication',
    version: process.env.REACT_APP_VERSION || '0.1.0',
    documentTypes: ['md', 'txt', 'js', 'ts', 'jsx', 'tsx', 'py', 'json', 'html', 'css'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    autoSaveInterval: 5000, // 5 seconds
  },
  
  // Logging configuration
  logging: {
    level: isDevelopment ? 'debug' : 'error',
    enableConsole: isDevelopment,
    enableRemote: isProduction,
    remoteEndpoint: '/api/logs',
  },
  
  // Security settings
  security: {
    allowedOrigins: isDevelopment
      ? ['http://localhost:3000']
      : ['https://app.example.com'],
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", isDevelopment ? 'ws://localhost:1234' : 'wss://*.example.com'],
    },
  },
  
  // Performance settings
  performance: {
    debounceTime: 300, // 300ms
    throttleTime: 100, // 100ms
    lazyLoadThreshold: 1000, // 1000px
    maxConcurrentDownloads: 5,
  },
};

// Type for the configuration object
export type AppConfig = typeof defaultConfig;

// Environment-specific configuration overrides
type EnvConfig = Partial<AppConfig>;

const environmentConfig: Record<string, EnvConfig> = {
  development: {
    api: {
      baseUrl: 'http://localhost:4000',
    },
    collaboration: {
      serverUrl: 'ws://localhost:1234',
    },
    logging: {
      level: 'debug',
    },
  },
  
  production: {
    api: {
      baseUrl: '/api',
    },
    logging: {
      level: process.env.REACT_APP_LOG_LEVEL || 'error',
    },
  },
  
  test: {
    api: {
      baseUrl: 'http://localhost:4000',
    },
    features: {
      offlineMode: false,
      realTimeCollaboration: false,
      agentAssistance: false,
    },
    logging: {
      level: 'error',
      enableConsole: false,
      enableRemote: false,
    },
  },
};

// Custom environment variables from .env files
const envConfig: EnvConfig = {
  api: {
    baseUrl: process.env.REACT_APP_API_URL,
    timeout: process.env.REACT_APP_API_TIMEOUT ? parseInt(process.env.REACT_APP_API_TIMEOUT, 10) : undefined,
  },
  collaboration: {
    serverUrl: process.env.REACT_APP_COLLAB_SERVER_URL,
  },
  github: {
    authRedirectUrl: process.env.REACT_APP_GITHUB_CALLBACK_URL,
  },
};

// Merge configurations
const currentEnv = process.env.NODE_ENV || 'development';
const envSpecificConfig = environmentConfig[currentEnv] || {};

// Deep merge helper
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const output = { ...target };
  
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (
        typeof source[key] === 'object' && 
        !Array.isArray(source[key]) && 
        source[key] !== null
      ) {
        output[key] = deepMerge(output[key] || {} as any, source[key] as any);
      } else {
        if (source[key] !== undefined) {
          output[key] = source[key] as any;
        }
      }
    }
  }
  
  return output;
}

// Merge environment-specific config with default config
let mergedConfig = deepMerge(defaultConfig, envSpecificConfig);

// Merge .env variables (only defined ones)
function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        const stripped = stripUndefined(value as any);
        if (Object.keys(stripped).length > 0) {
          result[key] = stripped as any;
        }
      } else if (value !== undefined) {
        result[key] = value;
      }
    }
  }
  
  return result;
}

// Apply only defined environment variables
const definedEnvConfig = stripUndefined(envConfig);
mergedConfig = deepMerge(mergedConfig, definedEnvConfig);

// Export the merged configuration
export default mergedConfig;

// For simpler imports, export individual sections
export const apiConfig = mergedConfig.api;
export const collaborationConfig = mergedConfig.collaboration;
export const githubConfig = mergedConfig.github;
export const storageConfig = mergedConfig.storage;
export const featureConfig = mergedConfig.features;
export const appConfig = mergedConfig.app;
export const loggingConfig = mergedConfig.logging;
export const securityConfig = mergedConfig.security;
export const performanceConfig = mergedConfig.performance; 