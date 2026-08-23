export type MessageRole = 'user' | 'assistant';

export type MessagePart = {
  type: 'text' | 'code';
  value: string;
  language?: string;
};

export type ToolCallItem = {
  id?: string;
  name: string;
  args?: Record<string, any> | string;
  result?: any;
  status?: 'running' | 'success' | 'error';
  durationMs?: number;
}

export type Message = {
  id: string;
  role: MessageRole;
  content: string | MessagePart[];
  images?: string[];
  createdAt: string;
  streaming?: boolean;
  isThinking?: boolean;
  thinkingContent?: string;
  thinkingDurationMs?: number;
  toolsUsed?: string[];
  toolCalls?: ToolCallItem[];
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
};
