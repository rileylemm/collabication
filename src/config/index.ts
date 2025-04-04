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

// Helper type for deeply partial objects
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Record<string, any> ? DeepPartial<T[P]> : T[P];
};

// Environment-specific configuration overrides
const environmentConfig: Record<string, DeepPartial<AppConfig>> = {
  development: {
    api: {
      baseUrl: 'http://localhost:4000',
      timeout: 30000,
    },
    collaboration: {
      serverUrl: 'ws://localhost:1234',
      reconnectInterval: 2000,
      maxReconnectAttempts: 10,
    },
    logging: {
      level: 'debug',
      enableConsole: true,
      enableRemote: false,
      remoteEndpoint: '/api/logs',
    },
    features: {
      offlineMode: true,
      realTimeCollaboration: true,
      agentAssistance: true,
      fileHistory: true,
      autoSave: true,
    },
  },
  
  production: {
    api: {
      baseUrl: '/api',
      timeout: 30000,
    },
    collaboration: {
      serverUrl: typeof window !== 'undefined' ? `wss://collab.${window.location.hostname}` : 'wss://collab.example.com',
      reconnectInterval: 2000,
      maxReconnectAttempts: 10,
    },
    logging: {
      level: process.env.REACT_APP_LOG_LEVEL || 'error',
      enableConsole: false,
      enableRemote: true,
      remoteEndpoint: '/api/logs',
    },
    features: {
      offlineMode: true,
      realTimeCollaboration: true,
      agentAssistance: true,
      fileHistory: true,
      autoSave: true,
    },
  },
  
  test: {
    api: {
      baseUrl: 'http://localhost:4000',
      timeout: 30000,
    },
    collaboration: {
      serverUrl: 'ws://localhost:1234',
      reconnectInterval: 2000,
      maxReconnectAttempts: 10,
    },
    features: {
      offlineMode: false,
      realTimeCollaboration: false,
      agentAssistance: false,
      fileHistory: true,
      autoSave: true,
    },
    logging: {
      level: 'error',
      enableConsole: false,
      enableRemote: false,
      remoteEndpoint: '/api/logs',
    },
  },
};

// Custom environment variables from .env files
const envConfig: DeepPartial<AppConfig> = {
  api: {
    baseUrl: process.env.REACT_APP_API_URL,
    timeout: process.env.REACT_APP_API_TIMEOUT ? parseInt(process.env.REACT_APP_API_TIMEOUT, 10) : undefined,
  },
  collaboration: {
    serverUrl: process.env.REACT_APP_COLLAB_SERVER_URL,
    reconnectInterval: process.env.REACT_APP_COLLAB_RECONNECT_INTERVAL ? parseInt(process.env.REACT_APP_COLLAB_RECONNECT_INTERVAL, 10) : undefined,
    maxReconnectAttempts: process.env.REACT_APP_COLLAB_MAX_RECONNECT_ATTEMPTS ? parseInt(process.env.REACT_APP_COLLAB_MAX_RECONNECT_ATTEMPTS, 10) : undefined,
  },
  github: {
    authRedirectUrl: process.env.REACT_APP_GITHUB_CALLBACK_URL,
    scope: process.env.REACT_APP_GITHUB_SCOPE || undefined,
  },
  logging: {
    level: process.env.REACT_APP_LOG_LEVEL || undefined,
    enableConsole: process.env.REACT_APP_LOG_CONSOLE ? process.env.REACT_APP_LOG_CONSOLE === 'true' : undefined,
    enableRemote: process.env.REACT_APP_LOG_REMOTE ? process.env.REACT_APP_LOG_REMOTE === 'true' : undefined,
    remoteEndpoint: process.env.REACT_APP_LOG_ENDPOINT || undefined,
  },
};

// Merge configurations
const currentEnv = process.env.NODE_ENV || 'development';
const envSpecificConfig = environmentConfig[currentEnv] || {};

// Deep merge helper
function deepMerge<T extends Record<string, any>>(target: T, source: DeepPartial<T>): T {
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
function stripUndefined<T extends Record<string, any>>(obj: T): DeepPartial<T> {
  const result: DeepPartial<T> = {};
  
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
// Create a new variable to avoid type issues
const finalMergedConfig = deepMerge(mergedConfig, definedEnvConfig);

// Create the final config object with all properties guaranteed to exist
const config: AppConfig = {
  api: {
    baseUrl: finalMergedConfig.api?.baseUrl ?? defaultConfig.api.baseUrl,
    timeout: finalMergedConfig.api?.timeout ?? defaultConfig.api.timeout,
  },
  collaboration: {
    serverUrl: finalMergedConfig.collaboration?.serverUrl ?? defaultConfig.collaboration.serverUrl,
    reconnectInterval: finalMergedConfig.collaboration?.reconnectInterval ?? defaultConfig.collaboration.reconnectInterval,
    maxReconnectAttempts: finalMergedConfig.collaboration?.maxReconnectAttempts ?? defaultConfig.collaboration.maxReconnectAttempts,
  },
  github: {
    authRedirectUrl: finalMergedConfig.github?.authRedirectUrl ?? defaultConfig.github.authRedirectUrl,
    scope: finalMergedConfig.github?.scope ?? defaultConfig.github.scope,
  },
  storage: {
    authToken: finalMergedConfig.storage?.authToken ?? defaultConfig.storage.authToken,
    githubToken: finalMergedConfig.storage?.githubToken ?? defaultConfig.storage.githubToken,
    userSettings: finalMergedConfig.storage?.userSettings ?? defaultConfig.storage.userSettings,
    editorState: finalMergedConfig.storage?.editorState ?? defaultConfig.storage.editorState,
    recentFiles: finalMergedConfig.storage?.recentFiles ?? defaultConfig.storage.recentFiles,
  },
  features: {
    offlineMode: finalMergedConfig.features?.offlineMode ?? defaultConfig.features.offlineMode,
    realTimeCollaboration: finalMergedConfig.features?.realTimeCollaboration ?? defaultConfig.features.realTimeCollaboration,
    agentAssistance: finalMergedConfig.features?.agentAssistance ?? defaultConfig.features.agentAssistance,
    fileHistory: finalMergedConfig.features?.fileHistory ?? defaultConfig.features.fileHistory,
    autoSave: finalMergedConfig.features?.autoSave ?? defaultConfig.features.autoSave,
  },
  app: {
    name: finalMergedConfig.app?.name ?? defaultConfig.app.name,
    version: finalMergedConfig.app?.version ?? defaultConfig.app.version,
    documentTypes: (finalMergedConfig.app?.documentTypes || defaultConfig.app.documentTypes).filter(Boolean) as string[],
    maxFileSize: finalMergedConfig.app?.maxFileSize ?? defaultConfig.app.maxFileSize,
    autoSaveInterval: finalMergedConfig.app?.autoSaveInterval ?? defaultConfig.app.autoSaveInterval,
  },
  logging: {
    level: finalMergedConfig.logging?.level ?? defaultConfig.logging.level,
    enableConsole: finalMergedConfig.logging?.enableConsole ?? defaultConfig.logging.enableConsole,
    enableRemote: finalMergedConfig.logging?.enableRemote ?? defaultConfig.logging.enableRemote,
    remoteEndpoint: finalMergedConfig.logging?.remoteEndpoint ?? defaultConfig.logging.remoteEndpoint,
  },
  security: {
    allowedOrigins: (finalMergedConfig.security?.allowedOrigins || defaultConfig.security.allowedOrigins) as string[],
    contentSecurityPolicy: {
      defaultSrc: finalMergedConfig.security?.contentSecurityPolicy?.defaultSrc as string[] || defaultConfig.security.contentSecurityPolicy.defaultSrc,
      scriptSrc: finalMergedConfig.security?.contentSecurityPolicy?.scriptSrc as string[] || defaultConfig.security.contentSecurityPolicy.scriptSrc,
      styleSrc: finalMergedConfig.security?.contentSecurityPolicy?.styleSrc as string[] || defaultConfig.security.contentSecurityPolicy.styleSrc,
      imgSrc: finalMergedConfig.security?.contentSecurityPolicy?.imgSrc as string[] || defaultConfig.security.contentSecurityPolicy.imgSrc,
      connectSrc: finalMergedConfig.security?.contentSecurityPolicy?.connectSrc as string[] || defaultConfig.security.contentSecurityPolicy.connectSrc,
    },
  },
  performance: {
    debounceTime: finalMergedConfig.performance?.debounceTime ?? defaultConfig.performance.debounceTime,
    throttleTime: finalMergedConfig.performance?.throttleTime ?? defaultConfig.performance.throttleTime,
    lazyLoadThreshold: finalMergedConfig.performance?.lazyLoadThreshold ?? defaultConfig.performance.lazyLoadThreshold,
    maxConcurrentDownloads: finalMergedConfig.performance?.maxConcurrentDownloads ?? defaultConfig.performance.maxConcurrentDownloads,
  },
};

// Export the merged configuration
export default config;

// For simpler imports, export individual sections
export const apiConfig = config.api;
export const collaborationConfig = config.collaboration;
export const githubConfig = config.github;
export const storageConfig = config.storage;
export const featureConfig = config.features;
export const appConfig = config.app;
export const loggingConfig = config.logging;
export const securityConfig = config.security;
export const performanceConfig = config.performance; 