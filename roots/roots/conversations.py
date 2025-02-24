from typing import Optional
from datetime import datetime, UTC


from .types import Conversation, Message
from .sql import client

DATABASE_FILE = "data/conversations.db"


def write_default_name():
    today = datetime.today().strftime("%Y/%m/%Y-%m-%d")
    return f"conversations/{today}"


def initialize_database(database_file: str = DATABASE_FILE) -> None:
    with client(database_file) as cursor:
        cursor.execute(
            """
                CREATE TABLE IF NOT EXISTS conversations (
                    conversation_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    conversation_name TEXT NOT NULL,
                    created_at_utc INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                    last_modified_at_utc INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
                )
            """
        )
        cursor.execute(
            """
                CREATE TABLE IF NOT EXISTS messages (
                    message_id TEXT PRIMARY KEY,
                    exchange_id TEXT NOT NULL,
                    conversation_id INTEGER NOT NULL,
                    role TEXT CHECK(role IN ('user', 'assistant', 'system')) NOT NULL,
                    content TEXT NOT NULL,
                    context TEXT,
                    model_id TEXT,
                    created_at_utc INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
                )
            """
        )


def create(
    name: Optional[str] = None, database_file: str = DATABASE_FILE
) -> Conversation:
    name = name or write_default_name()
    with client(database_file) as cursor:
        cursor.execute("SELECT * FROM conversations WHERE conversation_name = ?", (name,))
        record = cursor.fetchone()
        if record is not None:
            return fetch(record["conversation_id"])

        cursor.execute(
            """
                INSERT INTO conversations (conversation_name)
                VALUES (?)
                RETURNING *
            """,
            (name,),
        )
        new_conversation = cursor.fetchone()
    new_conversation["messages"] = []
    return new_conversation


def update(
    conversation_id: int,
    name: Optional[str] = None,
    database_file: str = DATABASE_FILE,
) -> Conversation:
    last_modified_at_utc = datetime.now(UTC).timestamp()
    with client(database_file) as cursor:
        if name is not None:
            cursor.execute(
                """
                UPDATE conversations
                SET conversation_name = ?, last_modified_at_utc = ?
                WHERE conversation_id = ?
                RETURNING conversation_id
                """,
                (name, last_modified_at_utc, conversation_id),
            )
        else:
            cursor.execute(
                """
                UPDATE conversations
                SET last_modified_at_utc = ?
                WHERE conversation_id = ?
                RETURNING conversation_id
                """,
                (last_modified_at_utc, conversation_id),
            )
        if cursor.fetchone() is None:
            raise ValueError("Could not update conversation")
    return fetch(conversation_id)


def fetch(conversation_id: int, database_file: str = DATABASE_FILE) -> Conversation:
    with client(database_file) as cursor:
        cursor.execute(
            """
            SELECT *
            FROM conversations
            WHERE conversation_id = ?;
            """,
            (conversation_id,),
        )
        conversation = cursor.fetchone()

        cursor.execute(
            """
            SELECT *
            FROM messages
            WHERE conversation_id = ?
            ORDER BY created_at_utc ASC;
            """,
            (conversation_id,),
        )
        messages = cursor.fetchall()
    conversation["messages"] = messages
    return conversation


def drop(conversation_id: int, database_file: str = DATABASE_FILE) -> None:
    with client(database_file) as cursor:
        cursor.execute(
            """
            DELETE FROM conversations
            WHERE conversation_id = ?
            """,
            (conversation_id,),
        )
        if cursor.fetchone() is None:
            raise ValueError("Could not drop conversation")


def clean_database(database_file: str = DATABASE_FILE) -> None:
    with client(database_file) as cursor:
        cursor.execute(
            """
            DELETE FROM conversations
            WHERE conversation_id NOT IN (
                SELECT DISTINCT conversation_id
                FROM messages
            )
            """
        )


def fetch_all(database_file: str = DATABASE_FILE) -> list[Conversation]:
    with client(database_file) as cursor:
        cursor.execute(
            """
            SELECT *
            FROM conversations
            ORDER BY last_modified_at_utc
            """
        )
        conversations = cursor.fetchall()

    for conversation in conversations:
        conversation["messages"] = []
    return conversations


def exists(conversation_id: int, database_file: str = DATABASE_FILE) -> bool:
    with client(database_file) as cursor:
        cursor.execute(
            """
            SELECT conversation_id
            FROM conversations
            WHERE conversation_id = ?;
            """,
            (conversation_id,),
        )
        result = cursor.fetchone()
    return result is not None


def save_message(message: Message, database_file: str = DATABASE_FILE) -> Message:
    with client(database_file) as cursor:
        cursor.execute(
            """
            INSERT INTO messages
            (message_id, exchange_id, conversation_id, model_id, role, content, context)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            RETURNING *
            """,
            (
                message["message_id"],
                message["exchange_id"],
                message["conversation_id"],
                message.get("model_id", None),
                message["role"],
                message["content"],
                message.get("context", None),
            ),
        )
        message = cursor.fetchone()

    update(int(message["conversation_id"]))
    return message
