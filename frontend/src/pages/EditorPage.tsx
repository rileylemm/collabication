import React, { useState } from 'react';
import styled from 'styled-components';
import Editor from '../components/Editor';

const EditorContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 1rem;
`;

const EditorHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const DocumentTitle = styled.input`
  font-size: 1.5rem;
  border: none;
  border-bottom: 2px solid transparent;
  outline: none;
  padding: 0.5rem 0;
  background: transparent;
  color: ${props => props.theme.colors.text};
  
  &:focus {
    border-bottom: 2px solid ${props => props.theme.colors.primary};
  }
`;

const EditorToolbar = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.5rem;
  border-radius: ${props => props.theme.borderRadius.small};
  background-color: ${props => props.theme.colors.backgroundAlt};
`;

const ToolbarButton = styled.button`
  background: none;
  border: none;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  border-radius: ${props => props.theme.borderRadius.small};
  color: ${props => props.theme.colors.text};
  
  &:hover {
    background-color: ${props => props.theme.colors.backgroundHover};
  }
`;

const EditorPage: React.FC = () => {
  const [documentTitle, setDocumentTitle] = useState('Untitled Document');
  const [documentContent, setDocumentContent] = useState('<p>Start typing here...</p>');

  return (
    <EditorContainer>
      <EditorHeader>
        <DocumentTitle 
          value={documentTitle}
          onChange={(e) => setDocumentTitle(e.target.value)}
          placeholder="Document Title"
        />
      </EditorHeader>
      
      <EditorToolbar>
        <ToolbarButton>Bold</ToolbarButton>
        <ToolbarButton>Italic</ToolbarButton>
        <ToolbarButton>Underline</ToolbarButton>
        <ToolbarButton>Code</ToolbarButton>
        <ToolbarButton>Link</ToolbarButton>
      </EditorToolbar>
      
      <Editor 
        content={documentContent}
        onChange={setDocumentContent}
      />
    </EditorContainer>
  );
};

export default EditorPage; 