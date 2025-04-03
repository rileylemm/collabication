import React, { useEffect } from 'react';
import { useEditor, EditorContent, Editor as TiptapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { Markdown } from 'tiptap-markdown';
import styled from 'styled-components';

interface EditorProps {
  content?: string;
  onChange?: (html: string) => void;
  onChangeMarkdown?: (markdown: string) => void;
  isMarkdownMode?: boolean;
  placeholder?: string;
  onEditorReady?: (editor: TiptapEditor | null) => void;
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
      
      code {
        background-color: transparent;
        color: inherit;
        padding: 0;
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
  }
`;

const Editor: React.FC<EditorProps> = ({ 
  content = '', 
  onChange, 
  onChangeMarkdown,
  isMarkdownMode = false,
  placeholder = 'Start typing here...',
  onEditorReady
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
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