#!/usr/bin/env python

from collections import defaultdict

from flask import Flask, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit

from roots import conversations, models, context, memories
from roots.types import Message


SUMMARIZE_HISTORY_AT = 50

app = Flask(__name__)
CORS(app)

socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    ping_interval=5,
    ping_timeout=10,
    logger=True,
    engineio_logger=True,
)
stream_allowed: dict[str, bool] = {}
chat_histories: dict[str, list[models.ChatMessage]] = defaultdict(list)


@socketio.on("initialize")
def handle_initialization():
    conversations.initialize_database()
    memories.initialize_database()
    emit("initialized")


@socketio.on("request_conversation")
def handle_conversation_request(data: dict[str | int, str] | None = None):
    data = data or {}
    conversation_id = data.get("conversation_id", None)
    conversation_name = data.get("conversation_name", None)

    session_id = request.sid  # type: ignore

    if conversation_id is None or not conversations.exists(int(conversation_id)):
        conversation = conversations.create(conversation_name)
    else:
        conversation = conversations.fetch(int(conversation_id))

    emit("conversation_response", conversation)
    history: list[models.ChatMessage] = [
        {"role": message["role"], "content": message["content"]}
        for message in conversation["messages"]
    ]
    if len(history) >= SUMMARIZE_HISTORY_AT:
        history = models.summarize_history(history)
    chat_histories[session_id] += history


@socketio.on("update_conversation")
def handle_conversation_update(data: dict[str, str]):
    conversation_id = int(data["conversation_id"])
    conversation = conversations.update(
        conversation_id=conversation_id,
        name=data.get("name", None),
    )
    emit("conversation_update", conversation)


@socketio.on("new_message")
def handle_new_message(data: dict):
    session_id = request.sid  # type: ignore

    if not stream_allowed.get(session_id, True):
        stream_allowed[session_id] = True
        return

    user_message: Message = data["user_message"]
    assistant_message: Message = data["assistant_message"]

    emit(
        "backend_update",
        {
            "message_id": assistant_message["message_id"],
            "state": "thinking",
        },
    )

    is_memorable, memory = memories.is_memorable(user_message["content"])
    if is_memorable:
        print("Saving memory: ", memory)
        memories.add(memory)
        user_message["context"] = f"Memory saved: {memory}"
        emit(
            "message_metadata_response",
            {
                "message_id": user_message["message_id"],
                "context": memory,
            },
        )

    conversations.save_message(user_message)

    additional_context = context.generate(user_message["content"])

    if additional_context:
        chat_prompt = "\n\n".join((additional_context, user_message["content"]))
        assistant_message["context"] = additional_context
    else:
        chat_prompt = user_message["content"]

    chat_histories[session_id].append(
        {"role": user_message["role"], "content": chat_prompt}
    )
    chat = models.query(
        assistant_message["model_id"],  # type: ignore
        messages=chat_histories[session_id],
    )

    response = ""
    for token in chat:
        response += token
        emit(
            "backend_update",
            {
                "message_id": assistant_message["message_id"],
                "state": "writing",
            },
        )
        emit(
            "message_stream_response",
            {
                "message_id": assistant_message["message_id"],
                "content": token,
            },
        )

    assistant_message["content"] = response
    conversations.save_message(assistant_message)
    emit(
        "message_metadata_response",
        {
            "message_id": assistant_message["message_id"],
            "context": additional_context,
        },
    )
    emit(
        "backend_update",
        {
            "message_id": assistant_message["message_id"],
            "state": "complete",
        },
    )
    chat_histories[session_id].append({"role": "assistant", "content": response})


@socketio.on("request_conversations")
def handle_request_conversations():
    current_conversations = conversations.fetch_all()
    emit("conversations_response", current_conversations)


@socketio.on("request_models")
def handle_request_models():
    available_models = models.available_models()
    emit("models_response", available_models)


@socketio.on("stop")
def handle_stop():
    stream_allowed[request.sid] = False  # type: ignore


@socketio.on("disconnect")
def handle_disconnect():
    session_id = request.sid  # type: ignore
    if session_id in chat_histories:
        del chat_histories[session_id]

    if session_id in stream_allowed:
        del stream_allowed[session_id]

    try:
        conversations.clean_database()
    except Exception as error:  # pylint: disable=broad-exception-caught
        print("Could not clean database")
        print(error)


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5001, debug=True)
