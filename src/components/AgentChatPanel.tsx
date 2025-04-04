import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { v4 as uuidv4 } from 'uuid';

// Types for the chat interface
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: string;
  name: string;
  args: Record<string, any>;
  result?: string;
  status: 'pending' | 'running' | 'completed' | 'error';
}

export interface ContextItem {
  id: string;
  type: 'file' | 'folder';
  path: string;
  name: string;
  selected: boolean;
  content?: string;
}

interface AgentChatPanelProps {
  onSendMessage: (message: string, context: ContextItem[]) => Promise<void>;
  onClearConversation: () => void;
  onStopGeneration: () => void;
  messages: ChatMessage[];
  isGenerating: boolean;
  availableContext: ContextItem[];
  onInsertCode?: (toolCall: ToolCall) => void;
  onInsertText?: (text: string) => void;
}

// Styled components for the chat interface
const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: ${props => props.theme.colors.background};
  border-left: 1px solid ${props => props.theme.colors.border};
`;

const ChatHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const ChatTitle = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  color: ${props => props.theme.colors.text};
`;

const ChatHeaderActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const HeaderButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.text};
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: ${props => props.theme.borderRadius.small};
  font-size: 0.9rem;
  
  &:hover {
    background-color: ${props => props.theme.colors.hoverBackground};
  }
`;

const ChatMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const MessageContainer = styled.div<{ role: 'user' | 'assistant' | 'system' }>`
  display: flex;
  flex-direction: column;
  padding: 0.75rem;
  border-radius: ${props => props.theme.borderRadius.medium};
  background-color: ${props => 
    props.role === 'user' 
      ? props.theme.colors.surface 
      : props.role === 'assistant' 
        ? props.theme.colors.surfaceHighlight 
        : props.theme.colors.surfaceAlt};
  max-width: 95%;
  align-self: ${props => props.role === 'user' ? 'flex-end' : 'flex-start'};
`;

const MessageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const MessageRole = styled.span`
  font-weight: 500;
  font-size: 0.85rem;
  color: ${props => props.theme.colors.textSecondary};
  text-transform: capitalize;
`;

const MessageTimestamp = styled.span`
  font-size: 0.75rem;
  color: ${props => props.theme.colors.textTertiary};
`;

const MessageContent = styled.div`
  font-size: 0.95rem;
  line-height: 1.5;
  white-space: pre-wrap;
  
  p {
    margin: 0.5rem 0;
    &:first-child {
      margin-top: 0;
    }
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  code {
    font-family: monospace;
    background-color: ${props => props.theme.colors.codeBackground};
    padding: 0.2rem 0.4rem;
    border-radius: ${props => props.theme.borderRadius.small};
  }
  
  pre {
    background-color: ${props => props.theme.colors.codeBackground};
    padding: 0.75rem;
    border-radius: ${props => props.theme.borderRadius.small};
    overflow-x: auto;
    margin: 0.75rem 0;
    
    code {
      background-color: transparent;
      padding: 0;
    }
  }
`;

const ToolCallContainer = styled.div`
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.small};
  margin: 0.5rem 0;
  overflow: hidden;
`;

const ToolCallHeader = styled.div`
  background-color: ${props => props.theme.colors.toolCallBackground};
  padding: 0.5rem;
  font-size: 0.85rem;
  font-weight: 500;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ToolCallName = styled.span`
  color: ${props => props.theme.colors.primary};
`;

const ToolCallStatus = styled.span<{ status: ToolCall['status'] }>`
  font-size: 0.75rem;
  padding: 0.2rem 0.4rem;
  border-radius: ${props => props.theme.borderRadius.small};
  background-color: ${props => {
    switch (props.status) {
      case 'pending': return props.theme.colors.warning + '20';
      case 'running': return props.theme.colors.info + '20';
      case 'completed': return props.theme.colors.success + '20';
      case 'error': return props.theme.colors.error + '20';
      default: return 'transparent';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'pending': return props.theme.colors.warning;
      case 'running': return props.theme.colors.info;
      case 'completed': return props.theme.colors.success;
      case 'error': return props.theme.colors.error;
      default: return props.theme.colors.text;
    }
  }};
`;

const ToolCallContent = styled.div`
  padding: 0.75rem;
  font-family: monospace;
  font-size: 0.85rem;
  background-color: ${props => props.theme.colors.surface};
  white-space: pre-wrap;
`;

const ToolCallResult = styled.div`
  padding: 0.75rem;
  border-top: 1px solid ${props => props.theme.colors.border};
  font-size: 0.85rem;
  white-space: pre-wrap;
`;

const ChatInput = styled.div`
  border-top: 1px solid ${props => props.theme.colors.border};
  padding: 1rem;
`;

const MessageForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ContextSelector = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const ContextBadge = styled.div<{ selected: boolean }>`
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
  border-radius: ${props => props.theme.borderRadius.small};
  background-color: ${props => props.selected ? props.theme.colors.primary + '20' : props.theme.colors.surface};
  color: ${props => props.selected ? props.theme.colors.primary : props.theme.colors.text};
  border: 1px solid ${props => props.selected ? props.theme.colors.primary : props.theme.colors.border};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  
  &:hover {
    background-color: ${props => props.selected ? props.theme.colors.primary + '30' : props.theme.colors.hoverBackground};
  }
`;

const TextAreaWrapper = styled.div`
  position: relative;
`;

const MessageTextArea = styled.textarea`
  width: 100%;
  min-height: 60px;
  max-height: 180px;
  padding: 0.75rem 3rem 0.75rem 0.75rem;
  border-radius: ${props => props.theme.borderRadius.medium};
  border: 1px solid ${props => props.theme.colors.border};
  background-color: ${props => props.theme.colors.inputBackground};
  color: ${props => props.theme.colors.text};
  font-family: inherit;
  font-size: 0.95rem;
  resize: none;
  outline: none;
  
  &:focus {
    border-color: ${props => props.theme.colors.primary};
  }
  
  &::placeholder {
    color: ${props => props.theme.colors.textTertiary};
  }
`;

const SendButton = styled.button<{ disabled: boolean }>`
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  background-color: ${props => props.disabled ? props.theme.colors.disabledBackground : props.theme.colors.primary};
  color: ${props => props.disabled ? props.theme.colors.textTertiary : props.theme.colors.textOnPrimary};
  border: none;
  border-radius: ${props => props.theme.borderRadius.small};
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  
  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.primaryDark};
  }
`;

const StopGenerationButton = styled.button`
  width: 100%;
  padding: 0.75rem;
  border-radius: ${props => props.theme.borderRadius.medium};
  border: 1px solid ${props => props.theme.colors.error};
  background-color: ${props => props.theme.colors.error + '10'};
  color: ${props => props.theme.colors.error};
  font-weight: 500;
  cursor: pointer;
  
  &:hover {
    background-color: ${props => props.theme.colors.error + '20'};
  }
`;

const InsertCodeButton = styled.button`
  margin-top: 0.5rem;
  padding: 0.25rem 0.5rem;
  background-color: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${props => props.theme.borderRadius.small};
  font-size: 0.8rem;
  cursor: pointer;
  
  &:hover {
    background-color: ${props => props.theme.colors.primaryDark || props.theme.colors.primary + '80'};
  }
`;

const formatTimestamp = (timestamp: Date): string => {
  return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const AgentChatPanel: React.FC<AgentChatPanelProps> = ({
  onSendMessage,
  onClearConversation,
  onStopGeneration,
  messages,
  isGenerating,
  availableContext,
  onInsertCode,
  onInsertText
}) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedContext, setSelectedContext] = useState<ContextItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isGenerating) return;
    
    try {
      await onSendMessage(inputValue, selectedContext);
      setInputValue('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter without Shift
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleContext = (context: ContextItem) => {
    setSelectedContext(prev => {
      const isSelected = prev.some(item => item.id === context.id);
      
      if (isSelected) {
        return prev.filter(item => item.id !== context.id);
      } else {
        return [...prev, { ...context, selected: true }];
      }
    });
  };

  const renderToolCalls = (toolCalls: ToolCall[]) => {
    return (
      <>
        {toolCalls.map((toolCall) => (
          <ToolCallContainer key={toolCall.id}>
            <ToolCallHeader>
              <ToolCallName>{toolCall.name}</ToolCallName>
              <ToolCallStatus status={toolCall.status}>
                {toolCall.status}
              </ToolCallStatus>
            </ToolCallHeader>
            
            {toolCall.result && (
              <ToolCallResult>
                {toolCall.result}
                
                {toolCall.type === 'function' && 
                 toolCall.name === 'generate_code' && 
                 onInsertCode && (
                  <InsertCodeButton 
                    onClick={() => onInsertCode(toolCall)}
                  >
                    Insert Code into Editor
                  </InsertCodeButton>
                )}
              </ToolCallResult>
            )}
          </ToolCallContainer>
        ))}
      </>
    );
  };

  return (
    <ChatContainer>
      <ChatHeader>
        <ChatTitle>Agent Assistant</ChatTitle>
        <ChatHeaderActions>
          <HeaderButton onClick={onClearConversation}>
            Clear conversation
          </HeaderButton>
        </ChatHeaderActions>
      </ChatHeader>
      
      <ChatMessages>
        {messages.map(message => (
          <MessageContainer key={message.id} role={message.role}>
            <MessageHeader>
              <MessageRole>{message.role}</MessageRole>
              <MessageTimestamp>{formatTimestamp(message.timestamp)}</MessageTimestamp>
            </MessageHeader>
            <MessageContent>
              {message.content}
            </MessageContent>
            {message.toolCalls && message.toolCalls.length > 0 && (
              <div>
                {renderToolCalls(message.toolCalls)}
              </div>
            )}
          </MessageContainer>
        ))}
        <div ref={messagesEndRef} />
      </ChatMessages>
      
      <ChatInput>
        <MessageForm onSubmit={handleSubmit}>
          {availableContext.length > 0 && (
            <ContextSelector>
              {availableContext.map(context => (
                <ContextBadge 
                  key={context.id}
                  selected={selectedContext.some(item => item.id === context.id)}
                  onClick={() => toggleContext(context)}
                >
                  {context.type === 'file' ? '📄' : '📁'} {context.name}
                </ContextBadge>
              ))}
            </ContextSelector>
          )}
          
          {isGenerating ? (
            <StopGenerationButton type="button" onClick={onStopGeneration}>
              Stop generation
            </StopGenerationButton>
          ) : (
            <TextAreaWrapper>
              <MessageTextArea
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask your agent assistant..."
                disabled={isGenerating}
              />
              <SendButton 
                type="submit" 
                disabled={!inputValue.trim() || isGenerating}
              >
                ➤
              </SendButton>
            </TextAreaWrapper>
          )}
        </MessageForm>
      </ChatInput>
    </ChatContainer>
  );
};

export default AgentChatPanel; 