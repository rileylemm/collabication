import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlock from '@tiptap/extension-code-block';
import Typography from '@tiptap/extension-typography';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { Extension, AnyExtension } from '@tiptap/core';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';

export interface DocumentEditorExtensionsOptions {
  placeholder?: string;
  yDoc?: Y.Doc;
  collaborationFieldName?: string;
  user?: {
    name: string;
    color: string;
  };
}

export const getExtensions = (options: DocumentEditorExtensionsOptions = {}) => {
  const extensions: AnyExtension[] = [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
      },
      codeBlock: false,
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      linkOnPaste: true,
    }),
    Image.configure({
      inline: true,
      allowBase64: true,
    }),
    CodeBlock.configure({
      languageClassPrefix: 'language-',
      exitOnTripleEnter: true,
      exitOnArrowDown: true,
    }),
    Typography,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableCell,
    TableHeader,
  ];

  // Add placeholder if provided
  if (options.placeholder) {
    extensions.push(
      Placeholder.configure({
        placeholder: options.placeholder,
      })
    );
  }

  // Add collaboration extensions if yDoc is provided
  if (options.yDoc) {
    const fieldName = options.collaborationFieldName || 'content';
    
    extensions.push(
      Collaboration.configure({
        document: options.yDoc,
        field: fieldName,
      })
    );

    // Add collaboration cursor if user information is provided
    if (options.user) {
      extensions.push(
        CollaborationCursor.configure({
          provider: null, // We handle this separately
          user: {
            name: options.user.name,
            color: options.user.color,
          },
        })
      );
    }
  }

  return extensions;
};

// Create a custom extension that syncs with Yjs changes
export const YjsExtension = Extension.create({
  name: 'yjsSync',

  addOptions() {
    return {
      yText: null as Y.Text | null,
      yUndoManager: null as Y.UndoManager | null,
    };
  },

  addKeyboardShortcuts() {
    const yUndoManager = this.options.yUndoManager;
    
    if (!yUndoManager) {
      return {
        // Return empty handlers if no undoManager is available
        'Mod-z': () => true,
        'Mod-y': () => true,
        'Mod-Shift-z': () => true,
      };
    }

    return {
      'Mod-z': () => {
        yUndoManager.undo();
        return true;
      },
      'Mod-y': () => {
        yUndoManager.redo();
        return true;
      },
      'Mod-Shift-z': () => {
        yUndoManager.redo();
        return true;
      },
    };
  },
}); 