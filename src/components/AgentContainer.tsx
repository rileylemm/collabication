import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { v4 as uuidv4 } from 'uuid';
import AgentChatPanel, { ChatMessage, ContextItem, ToolCall } from './AgentChatPanel';
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
  currentContent?: string;
  selectedText?: string;
  onInsertCode?: (code: string, language: string) => void;
  onInsertText?: (text: string) => void;
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
  currentContent = '',
  selectedText = '',
  onInsertCode,
  onInsertText,
  darkMode = false
}) => {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Create context items from file tree for agent context selection
  const fileContextItems = useMemo(() => {
    const items: ContextItem[] = [];
    
    // Add a special context item for the current editor content if available
    if (currentContent) {
      items.push({
        id: 'current-editor-content',
        type: 'file',
        path: currentFile?.path || 'current-file',
        name: `Current content of ${currentFile?.name || 'the editor'}`,
        selected: true,
        content: currentContent
      });
    }
    
    // Add a special context item for the selected text if available
    if (selectedText) {
      items.push({
        id: 'selected-text',
        type: 'file',
        path: currentFile?.path || 'selection',
        name: 'Selected text',
        selected: true,
        content: selectedText
      });
    }
    
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
  }, [files, currentFile, currentContent, selectedText]);
  
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
  
  // Handle tool call results, particularly for code insertion
  const handleToolCallCompleted = useCallback((toolCall: ToolCall) => {
    // Handle code generation tool calls
    if (toolCall.type === 'function' && toolCall.name === 'generate_code' && toolCall.result) {
      // Extract code and language from the result
      const codeMatch = toolCall.result.match(/```(\w+)?\n([\s\S]*?)\n```/);
      if (codeMatch && onInsertCode) {
        const language = codeMatch[1] || 'text';
        const code = codeMatch[2];
        
        // Provide a button or UI element to insert the code
        // This would typically involve adding a button to the message component
        // For now, we'll just log that the function exists
        console.log(`Code can be inserted: ${language}, ${code.substring(0, 20)}...`);
      }
    }
  }, [onInsertCode]);
  
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
      
      // Add editor-specific context to the request
      const enhancedContext = context.map(item => {
        // If this is the current file or selected text
        if (item.id === 'current-editor-content' || item.id === 'selected-text') {
          return {
            ...item,
            content: item.content || ''
          };
        }
        return item;
      });
      
      // Send the message to the agent service for streaming response
      let responseContent = '';
      
      const response = await agentService.streamResponse({
        message: content,
        context: enhancedContext,
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
      
      // Check for any tool calls in the response
      if (response.toolCalls && response.toolCalls.length > 0) {
        // Update the message with the tool calls
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: responseContent, isStreaming: false, toolCalls: response.toolCalls } 
              : msg
          )
        );
        
        // Process the tool calls
        response.toolCalls.forEach(handleToolCallCompleted);
      } else {
        // Update the message with the final complete response
        // and clear the streaming flag
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: responseContent, isStreaming: false } 
              : msg
          )
        );
      }
      
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
  }, [messages, isGenerating, handleToolCallCompleted]);
  
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
  
  // Function to allow insertion of code from a tool call
  const insertCodeFromToolCall = useCallback((toolCall: ToolCall) => {
    if (!onInsertCode) return;
    
    // Extract code and language from the result
    const codeMatch = toolCall.result?.match(/```(\w+)?\n([\s\S]*?)\n```/);
    if (codeMatch) {
      const language = codeMatch[1] || 'text';
      const code = codeMatch[2];
      
      // Insert the code into the editor
      onInsertCode(code, language);
    }
  }, [onInsertCode]);
  
  return (
    <Container>
      <AgentChatPanel
        onSendMessage={handleSendMessage}
        onClearConversation={handleClearConversation}
        onStopGeneration={handleStopGeneration}
        messages={messages}
        isGenerating={isGenerating}
        availableContext={fileContextItems}
        onInsertCode={insertCodeFromToolCall}
        onInsertText={onInsertText}
      />
    </Container>
  );
};

export default AgentContainer; 