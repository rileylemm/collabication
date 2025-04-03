import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { v4 as uuidv4 } from 'uuid';
import AgentChatPanel, { ChatMessage, ContextItem } from './AgentChatPanel';
import { agentService } from '../services/agentService';

// Define FileItem interface locally instead of importing it
interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  extension?: string;
  children?: FileItem[];
  isOpen?: boolean;
}

interface AgentContainerProps {
  files?: FileItem[];
  currentFile?: FileItem;
  onInsertCode?: (code: string, language: string) => void;
  darkMode?: boolean;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`;

const AgentContainer: React.FC<AgentContainerProps> = ({
  files = [],
  currentFile,
  onInsertCode,
  darkMode = false
}) => {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Create context items from file tree for agent context selection
  const fileContextItems = useMemo(() => {
    const items: ContextItem[] = [];
    
    const processFileItem = (file: FileItem): ContextItem => ({
      id: file.id,
      type: file.type,
      path: file.path,
      name: file.name,
      selected: file.id === currentFile?.id
    });
    
    const traverse = (fileItems: FileItem[]) => {
      fileItems.forEach(item => {
        items.push(processFileItem(item));
        
        if (item.children) {
          traverse(item.children);
        }
      });
    };
    
    traverse(files);
    return items;
  }, [files, currentFile]);
  
  // Add system message when the component mounts
  useEffect(() => {
    // Add an initial system message
    setMessages([
      {
        id: uuidv4(),
        role: 'system',
        content: 'I am your agent assistant. I can help you with coding, writing, and answering questions about your project.',
        timestamp: new Date()
      }
    ]);
  }, []);
  
  // Handle sending a message to the agent
  const handleSendMessage = useCallback(async (content: string, context: ContextItem[]) => {
    try {
      // Don't allow sending a message while already generating
      if (isGenerating) return;
      
      // Create a new user message
      const userMessage: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: content,
        timestamp: new Date()
      };
      
      // Add the user message to the chat
      setMessages(prev => [...prev, userMessage]);
      
      // Create a placeholder for the assistant's response
      const assistantMessageId = uuidv4();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsGenerating(true);
      
      // Send the message to the agent service for streaming response
      let responseContent = '';
      
      await agentService.streamResponse({
        message: content,
        context,
        history: messages
      }, (chunk) => {
        // Update the content as chunks come in
        responseContent += chunk + ' ';
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: responseContent } 
              : msg
          )
        );
      });
      
      // Update the message with the final complete response
      // and clear the streaming flag
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: responseContent, isStreaming: false } 
            : msg
        )
      );
      
      setIsGenerating(false);
    } catch (error) {
      console.error('Error sending message to agent:', error);
      
      // If there was an error, update the last message
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
          return [
            ...prev.slice(0, -1),
            {
              ...lastMessage,
              content: "I apologize, but I encountered an error while processing your request.",
              isStreaming: false
            }
          ];
        }
        return prev;
      });
      
      setIsGenerating(false);
    }
  }, [messages, isGenerating]);
  
  // Handle clearing the conversation
  const handleClearConversation = useCallback(() => {
    setMessages([
      {
        id: uuidv4(),
        role: 'system',
        content: 'I am your agent assistant. I can help you with coding, writing, and answering questions about your project.',
        timestamp: new Date()
      }
    ]);
  }, []);
  
  // Handle stopping the generation
  const handleStopGeneration = useCallback(() => {
    agentService.cancelActiveRequest();
    
    // Update the last message and clear the streaming flag
    setMessages(prev => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
        return [
          ...prev.slice(0, -1),
          {
            ...lastMessage,
            content: lastMessage.content + " [Generation stopped]",
            isStreaming: false
          }
        ];
      }
      return prev;
    });
    
    setIsGenerating(false);
  }, []);
  
  return (
    <Container>
      <AgentChatPanel
        onSendMessage={handleSendMessage}
        onClearConversation={handleClearConversation}
        onStopGeneration={handleStopGeneration}
        messages={messages}
        isGenerating={isGenerating}
        availableContext={fileContextItems}
      />
    </Container>
  );
};

export default AgentContainer; 