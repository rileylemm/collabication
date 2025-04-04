import React, { useEffect } from 'react';
import { useEditor, EditorContent, Editor as TiptapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { Markdown } from 'tiptap-markdown';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import styled from 'styled-components';

// Import languages for syntax highlighting
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import css from 'highlight.js/lib/languages/css';
import html from 'highlight.js/lib/languages/xml'; // XML is used for HTML
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';

// Create a custom lowlight instance with our languages
const lowlight = createLowlight(common);
lowlight.register('javascript', javascript);
lowlight.register('typescript', typescript);
lowlight.register('python', python);
lowlight.register('css', css);
lowlight.register('html', html);
lowlight.register('json', json);
lowlight.register('markdown', markdown);

interface EditorProps {
  content?: string;
  onChange?: (html: string) => void;
  onChangeMarkdown?: (markdown: string) => void;
  isMarkdownMode?: boolean;
  placeholder?: string;
  onEditorReady?: (editor: TiptapEditor | null) => void;
  readOnly?: boolean;
}

const EditorContainer = styled.div<{ isMarkdownMode: boolean }>`
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.medium};
  overflow: hidden;
  height: 100%;
  
  .ProseMirror {
    padding: 1rem;
    min-height: 500px;
    outline: none;
    font-family: ${props => props.isMarkdownMode ? 'monospace' : 'inherit'};
    
    p {
      margin: 0.5rem 0;
    }
    
    h1, h2, h3, h4, h5, h6 {
      margin: 1rem 0 0.5rem;
      color: ${props => props.theme.colors.primary};
    }
    
    ul, ol {
      padding-left: 1.5rem;
    }
    
    blockquote {
      border-left: 3px solid ${props => props.theme.colors.border};
      padding-left: 1rem;
      color: ${props => props.theme.colors.textSecondary};
    }
    
    code {
      background-color: ${props => props.theme.colors.surface};
      color: ${props => props.theme.colors.secondary};
      padding: 0.2rem 0.4rem;
      border-radius: ${props => props.theme.borderRadius.small};
      font-family: monospace;
    }
    
    pre {
      background-color: ${props => props.theme.colors.surface};
      border-radius: ${props => props.theme.borderRadius.medium};
      padding: 0.75rem;
      overflow-x: auto;
      margin: 1rem 0;
      
      code {
        background-color: transparent;
        color: inherit;
        padding: 0;
        font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
      }
    }
    
    /* Code block styles */
    .hljs-comment,
    .hljs-quote {
      color: #999;
    }

    .hljs-keyword,
    .hljs-selector-tag,
    .hljs-builtin {
      color: #7c4dff;
    }

    .hljs-string,
    .hljs-attr {
      color: #2e7d32;
    }

    .hljs-number,
    .hljs-literal {
      color: #f57c00;
    }

    .hljs-title,
    .hljs-name {
      color: #1976d2;
    }

    .hljs-tag {
      color: #1976d2;
    }

    .hljs-meta {
      color: #aaa;
    }

    /* Dark theme adjustments */
    .dark-theme & {
      .hljs-comment,
      .hljs-quote {
        color: #b0bec5;
      }

      .hljs-keyword,
      .hljs-selector-tag,
      .hljs-builtin {
        color: #ce93d8;
      }

      .hljs-string,
      .hljs-attr {
        color: #a5d6a7;
      }

      .hljs-number,
      .hljs-literal {
        color: #ffcc80;
      }

      .hljs-title,
      .hljs-name {
        color: #90caf9;
      }
    }

    .ProseMirror-placeholder {
      color: ${props => props.theme.colors.textSecondary};
      pointer-events: none;
    }

    a {
      color: ${props => props.theme.colors.primary};
      text-decoration: underline;
      cursor: pointer;
    }
    
    /* Code block language selector */
    .code-block-language-select {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      font-size: 0.75rem;
      color: #999;
      background: transparent;
      border: 1px solid #ddd;
      border-radius: 3px;
      padding: 0.1rem 0.3rem;
    }
  }
`;

const Editor: React.FC<EditorProps> = ({ 
  content = '', 
  onChange, 
  onChangeMarkdown,
  isMarkdownMode = false,
  placeholder = 'Start typing here...',
  onEditorReady,
  readOnly
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable the default code block as we'll use the lowlight one
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Highlight,
      Underline,
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'code-block',
        },
        languageClassPrefix: 'language-',
      }),
      Markdown.configure({
        html: true,
        tightLists: true,
        tightListClass: 'tight',
        bulletListMarker: '-',
        linkify: true,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: isMarkdownMode ? 'markdown-mode' : 'richtext-mode',
      },
    },
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
      
      if (onChangeMarkdown) {
        const markdown = editor.storage.markdown.getMarkdown();
        onChangeMarkdown(markdown);
      }
    },
  });

  // Update the editor content when the isMarkdownMode changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(true);
    }
  }, [editor, isMarkdownMode]);

  // Notify the parent component about the editor instance
  useEffect(() => {
    if (onEditorReady) {
      onEditorReady(editor);
    }
    
    return () => {
      if (onEditorReady) {
        onEditorReady(null);
      }
    };
  }, [editor, onEditorReady]);

  return (
    <EditorContainer isMarkdownMode={isMarkdownMode}>
      <EditorContent editor={editor} />
    </EditorContainer>
  );
};

export default Editor; 