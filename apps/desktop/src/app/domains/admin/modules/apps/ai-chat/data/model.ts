export type MessageRole = 'user' | 'assistant';

export type MessagePart = {
  type: 'text' | 'code';
  value: string;
  language?: string;
};

export type Message = {
  id: string;
  role: MessageRole;
  content: string | MessagePart[];
  createdAt: string;
  streaming?: boolean;
  toolsUsed?: string[];
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
};

