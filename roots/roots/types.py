from typing import Optional, TypedDict, Literal


Role = Literal["system", "user", "assistant"]


class Message(TypedDict):
    message_id: str
    exchange_id: str
    conversation_id: int
    role: Role
    content: str
    context: Optional[str]
    model_id: Optional[str]
    created_at_utc: Optional[int]


class Conversation(TypedDict):
    conversation_id: int
    conversation_name: str
    created_at_utc: int
    last_modified_at_utc: int
    messages: list[Message]


class Model(TypedDict):
    name: str
    model_id: str
    client_id: str


BackendState = Literal["idle", "initialized", "thinking", "writing", "complete", "failed"]


class MessageState(TypedDict):
    message_id: str
    state: BackendState
