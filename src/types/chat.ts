export type ChatType = 'group' | 'direct';

export interface Chat {
  id: string;
  type: ChatType;
  name: string;
  avatar_url?: string;
  created_at: string;
}

export interface ChatMember {
  chat_id: string;
  user_id: string;
  role: string;
}

export type MessageType = 'text' | 'file' | 'emoji';

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  type: MessageType;
  file_url?: string;
  created_at: string;
}
