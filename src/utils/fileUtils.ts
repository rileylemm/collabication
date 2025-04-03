// File type definitions
export type FileType = 'text' | 'code' | 'unknown';
export type CodeLanguage = 'javascript' | 'typescript' | 'python' | 'html' | 'css' | 'json' | 'unknown';

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