import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, ContextItem, ToolCall } from '../components/AgentChatPanel';

// Mock agent service for MVP development

// Types for internal use
interface AgentRequestOptions {
  message: string;
  context: ContextItem[];
  history: ChatMessage[];
  abortSignal?: AbortSignal;
}

interface AgentResponse {
  content: string;
  toolCalls?: ToolCall[];
}

class AgentService {
  private activeRequest: AbortController | null = null;
  
  // Mock method to simulate sending a message to the agent
  async sendMessage(options: AgentRequestOptions): Promise<AgentResponse> {
    // Cancel any existing request
    this.cancelActiveRequest();
    
    // Create a new abort controller for this request
    this.activeRequest = new AbortController();
    const { signal } = this.activeRequest;
    
    try {
      // Simulate a delay to mimic network request
      await this.delay(1000, signal);
      
      // Generate a mock response based on the user message
      const response = this.generateMockResponse(options);
      
      // Reset the active request
      this.activeRequest = null;
      
      return response;
    } catch (error) {
      // If the request was aborted, throw a specific error
      if (signal.aborted) {
        throw new Error('Request was cancelled');
      }
      
      // Otherwise, rethrow the error
      throw error;
    }
  }
  
  // Method to cancel the active request
  cancelActiveRequest(): void {
    if (this.activeRequest) {
      this.activeRequest.abort();
      this.activeRequest = null;
    }
  }
  
  // Utility method to simulate a delay with abort support
  private async delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(), ms);
      
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('Delay aborted'));
        }, { once: true });
      }
    });
  }
  
  // Generate a mock response based on the user message
  private generateMockResponse(options: AgentRequestOptions): AgentResponse {
    const { message, context } = options;
    
    // Simple keyword-based mock responses
    if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
      return {
        content: "Hello! I'm your agent assistant. How can I help you with your project today?"
      };
    }
    
    if (message.toLowerCase().includes('help')) {
      return {
        content: "I can help you with various tasks such as:\n\n" +
          "- Writing and editing documents\n" +
          "- Generating and explaining code\n" +
          "- Answering questions about your project\n" +
          "- Providing suggestions and ideas\n" +
          "- Researching information\n\n" +
          "What would you like assistance with?"
      };
    }
    
    if (message.toLowerCase().includes('code') || message.toLowerCase().includes('function')) {
      // Create a tool call example when code is mentioned
      const toolCall: ToolCall = {
        id: uuidv4(),
        type: 'function',
        name: 'generate_code',
        args: {
          language: 'typescript',
          description: 'Simple utility function based on user request'
        },
        result: "```typescript\n" +
          "function calculateTotal(items: Array<{ price: number; quantity: number }>): number {\n" +
          "  return items.reduce((total, item) => total + (item.price * item.quantity), 0);\n" +
          "}\n" +
          "```\n\n" +
          "This function takes an array of items, each with a price and quantity, and calculates the total cost.",
        status: 'completed'
      };
      
      return {
        content: "I've created a simple utility function that might help with your request:",
        toolCalls: [toolCall]
      };
    }
    
    if (context.length > 0) {
      // If the user has selected context, acknowledge it
      const contextNames = context.map(item => item.name).join(', ');
      return {
        content: `I see you've selected these files for context: ${contextNames}.\n\nIn a real implementation, I would analyze these files to provide more relevant assistance. For now, this is a placeholder response acknowledging the context selection.`
      };
    }
    
    // Default response
    return {
      content: "I understand you'd like assistance with: \"" + message + "\".\n\n" +
        "This is a placeholder response from the mock agent service. In the full implementation, this would be replaced with an actual response from the agent backend."
    };
  }
  
  // Method to stream a response (not implemented in mock version)
  // In a real implementation, this would use Server-Sent Events or WebSockets
  async streamResponse(options: AgentRequestOptions, onChunk: (chunk: string) => void): Promise<AgentResponse> {
    // This is a simplified mock implementation that doesn't actually stream
    // It just simulates streaming by breaking the response into chunks
    
    // Cancel any existing request
    this.cancelActiveRequest();
    
    // Create a new abort controller for this request
    this.activeRequest = new AbortController();
    const { signal } = this.activeRequest;
    
    try {
      // Generate a complete response first
      const response = this.generateMockResponse(options);
      
      // Break the response into chunks and emit them with delays
      const chunks = this.breakIntoChunks(response.content);
      
      for (const chunk of chunks) {
        // Check if the request was aborted
        if (signal.aborted) {
          throw new Error('Request was cancelled');
        }
        
        // Emit the chunk
        onChunk(chunk);
        
        // Wait a bit to simulate typing
        await this.delay(100, signal);
      }
      
      // Reset the active request
      this.activeRequest = null;
      
      return response;
    } catch (error) {
      // If the request was aborted, throw a specific error
      if (this.activeRequest?.signal.aborted) {
        throw new Error('Request was cancelled');
      }
      
      // Otherwise, rethrow the error
      throw error;
    }
  }
  
  // Utility method to break text into chunks for simulated streaming
  private breakIntoChunks(text: string, chunkSize: number = 5): string[] {
    const words = text.split(' ');
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(' '));
    }
    
    return chunks;
  }
}

// Export a singleton instance
export const agentService = new AgentService();

export default agentService; 