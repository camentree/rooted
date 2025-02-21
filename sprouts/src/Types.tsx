export type Role = "system" | "user" | "assistant";

export type Message = {
  message_id: string;
  exchange_id: string;
  conversation_id: number;
  role: Role;
  content: string;
  context: string | null;
  created_at_utc: number | null;
  model_id: string | null;
};

export type Conversation = {
  conversation_id: number;
  conversation_name: string;
  created_at_utc: number;
  last_modified_at_utc: number;
  messages: Message[];
};

export type Model = {
  name: string;
  model_id: string;
  client_id: string;
};

export type BackendState =
  | "idle"
  | "initialized"
  | "thinking"
  | "writing"
  | "complete"
  | "failed";

export type MessageState = {
  message_id: string;
  state: BackendState;
};
