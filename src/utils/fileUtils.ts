import React from 'react';

// File type definitions
export type FileType = 'text' | 'code' | 'unknown';
export type CodeLanguage = 'javascript' | 'typescript' | 'python' | 'html' | 'css' | 'json' | 'unknown';
// Add a type for user-preferred file type
export type PreferredFileType = 'automatic' | 'richText' | 'markdown' | 'code';

// Map of file extensions to file types
const fileTypeMap: Record<string, FileType> = {
  // Text files
  'md': 'text',
  'txt': 'text',
  'rtf': 'text',
  'html': 'text',
  'htm': 'text',
  
  // Code files
  'js': 'code',
  'jsx': 'code',
  'ts': 'code',
  'tsx': 'code',
  'py': 'code',
  'css': 'code',
  'scss': 'code',
  'json': 'code',
};

// Map of file extensions to code languages
const codeLanguageMap: Record<string, CodeLanguage> = {
  'js': 'javascript',
  'jsx': 'javascript',
  'ts': 'typescript',
  'tsx': 'typescript',
  'py': 'python',
  'html': 'html',
  'htm': 'html',
  'css': 'css',
  'scss': 'css',
  'json': 'json',
};

// Map preferred file types to suggested file extensions
export const preferredTypeToExtension: Record<Exclude<PreferredFileType, 'automatic'>, string> = {
  'richText': 'txt',
  'markdown': 'md',
  'code': 'js', // Default code extension, can be overridden
};

/**
 * Determines the file type based on the file extension
 * @param filename The name of the file
 * @returns The file type ('text', 'code', or 'unknown')
 */
export const getFileType = (filename: string): FileType => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  return fileTypeMap[extension] || 'unknown';
};

/**
 * Determines the code language based on the file extension
 * @param filename The name of the file
 * @returns The code language
 */
export const getCodeLanguage = (filename: string): CodeLanguage => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  return codeLanguageMap[extension] || 'unknown';
};

/**
 * Determines whether to use the rich text editor or code editor
 * @param filename The name of the file
 * @returns True if the file should use the rich text editor, false for code editor
 */
export const useRichTextEditor = (filename: string): boolean => {
  const fileType = getFileType(filename);
  return fileType === 'text';
};

/**
 * Gets the appropriate file extension based on the preferred file type
 * @param preferredType The preferred file type
 * @param currentExtension The current file extension (used for code files to preserve language)
 * @returns The suggested file extension
 */
export const getExtensionForPreferredType = (
  preferredType: PreferredFileType, 
  currentExtension?: string
): string => {
  if (preferredType === 'automatic') {
    return currentExtension || 'txt';
  }
  
  if (preferredType === 'code' && currentExtension && isCodeFile(currentExtension)) {
    // Preserve the current code extension if it's valid
    return currentExtension;
  }
  
  return preferredTypeToExtension[preferredType];
};

/**
 * Converts content between different file types
 * @param content The current content
 * @param fromType The current file type
 * @param toType The target file type
 * @returns The converted content
 */
export const convertContent = (
  content: string,
  fromType: PreferredFileType,
  toType: PreferredFileType
): string => {
  // Skip conversion if types are the same or using automatic
  if (fromType === toType || fromType === 'automatic' || toType === 'automatic') {
    return content;
  }
  
  // Convert from rich text to markdown or code
  if (fromType === 'richText') {
    if (toType === 'markdown') {
      // This is a simplified conversion - a real implementation would need
      // more sophisticated conversion based on your rich text format
      return content.replace(/<h1>(.*?)<\/h1>/g, '# $1')
                   .replace(/<h2>(.*?)<\/h2>/g, '## $1')
                   .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
                   .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
                   .replace(/<em>(.*?)<\/em>/g, '*$1*')
                   .replace(/<ul>(.*?)<\/ul>/gs, (_, list) => {
                     return list.replace(/<li>(.*?)<\/li>/g, '- $1\n');
                   });
    }
    if (toType === 'code') {
      // Strip HTML tags for code
      return content.replace(/<[^>]+>/g, '');
    }
  }
  
  // Convert from markdown to rich text or code
  if (fromType === 'markdown') {
    if (toType === 'richText') {
      // This is a simplified conversion
      return content.replace(/^# (.*?)$/gm, '<h1>$1</h1>')
                   .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
                   .replace(/^- (.*?)$/gm, '<li>$1</li>')
                   .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                   .replace(/\*(.*?)\*/g, '<em>$1</em>')
                   .replace(/([^\n]+)\n\n/g, '<p>$1</p>');
    }
    if (toType === 'code') {
      // For markdown to code, we just pass the raw markdown
      return content;
    }
  }
  
  // Convert from code to rich text or markdown
  if (fromType === 'code') {
    if (toType === 'richText') {
      // Wrap in code block
      return `<pre><code>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
    }
    if (toType === 'markdown') {
      // Wrap in markdown code fence
      return '```\n' + content + '\n```';
    }
  }
  
  // Default case - return original content
  return content;
};

/**
 * Extracts the file name from a path
 * @param path File path
 * @returns The file name
 */
export const getFileName = (path: string): string => {
  return path.split('/').pop() || path;
};

/**
 * Creates a new file name with a timestamp to ensure uniqueness
 * @param baseName Base file name
 * @returns A new file name with timestamp
 */
export const createUniqueFileName = (baseName: string): string => {
  const timestamp = new Date().getTime();
  const extension = baseName.split('.').pop();
  const name = baseName.substring(0, baseName.lastIndexOf('.'));
  return `${name}_${timestamp}.${extension}`;
};

// Get file extension from filename
export const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
};

// Check if file is a text file that should use the document editor
export const isTextFile = (extension: string): boolean => {
  const textExtensions = ['txt', 'md', 'markdown', 'rtf', 'html', 'htm'];
  return textExtensions.includes(extension.toLowerCase());
};

// Check if file is a code file that should use the code editor
export const isCodeFile = (extension: string): boolean => {
  const codeExtensions = [
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'cs', 
    'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'sh', 'bash',
    'css', 'scss', 'less', 'json', 'yaml', 'yml', 'xml', 'sql'
  ];
  return codeExtensions.includes(extension.toLowerCase());
};

// Get content type based on file extension
export const getContentType = (filename: string): 'code' | 'text' | 'binary' => {
  const extension = getFileExtension(filename);
  
  if (isCodeFile(extension)) {
    return 'code';
  } else if (isTextFile(extension)) {
    return 'text';
  } else {
    return 'binary';
  }
};

/**
 * Get the default preferred file type based on the file extension
 * @param filename The filename
 * @returns The default preferred file type
 */
export const getDefaultPreferredType = (filename: string): PreferredFileType => {
  const extension = getFileExtension(filename);
  
  if (extension === 'md' || extension === 'markdown') {
    return 'markdown';
  } else if (isTextFile(extension)) {
    return 'richText';
  } else if (isCodeFile(extension)) {
    return 'code';
  } else {
    return 'automatic';
  }
};

// Determine icon to use for file based on extension
export const getFileIcon = (filename: string): React.ReactNode => {
  const extension = getFileExtension(filename);
  
  // You would implement icon selection logic here
  // For now, return null as placeholder
  return null;
};

// Get language from file extension for syntax highlighting
export const getLanguageFromExtension = (
  extension: string
): 'javascript' | 'typescript' | 'python' | 'plain' => {
  extension = extension.toLowerCase();
  
  if (extension === 'js' || extension === 'jsx') {
    return 'javascript';
  } else if (extension === 'ts' || extension === 'tsx') {
    return 'typescript';
  } else if (extension === 'py') {
    return 'python';
  } else {
    return 'plain';
  }
}; 