import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import styled from 'styled-components';

interface EditorProps {
  content?: string;
  onChange?: (html: string) => void;
}

const EditorContainer = styled.div`
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.medium};
  overflow: hidden;
  
  .ProseMirror {
    padding: 1rem;
    min-height: 500px;
    outline: none;
    
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
  }
`;

const Editor: React.FC<EditorProps> = ({ content = '', onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  return (
    <EditorContainer>
      <EditorContent editor={editor} />
    </EditorContainer>
  );
};

export default Editor; 