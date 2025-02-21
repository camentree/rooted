from typing import TypedDict, Generator
import copy
import os

import openai
import anthropic
import ollama
from tenacity import retry, stop_after_attempt, wait_fixed

from .types import Role, Model


class ChatMessage(TypedDict):
    role: Role
    content: str


ModelIterResponse = Generator[str, None, None]


MODELS: list[Model] = [
    {"name": "GPT-4o (OpenAI)", "model_id": "gpt-4o", "client_id": "openai"},
    {
        "name": "GPT-3.5-turbo (OpenAI)",
        "model_id": "gpt-3.5-turbo",
        "client_id": "openai",
    },
    {
        "name": "Claude 3 Sonnet (Anthropic)",
        "model_id": "claude-3-5-sonnet-latest",
        "client_id": "anthropic",
    },
    {
        "name": "Claude 3 Haiku (Anthropic)",
        "model_id": "claude-3-5-haiku-latest",
        "client_id": "anthropic",
    },
    {"name": "Mistal-7b (Local)", "model_id": "mistral", "client_id": "ollama"},
]
DECISION_MODEL = "mistral"
MODEL_LOOKUP: dict[str, Model] = {model["model_id"]: model for model in MODELS}
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ANTHROPIC_API_KEY = os.getenv("OPENAI_API_KEY")


def initialize() -> dict[str, bool]:
    return {model["model_id"]: _check_model(model["model_id"]) for model in MODELS}


def _check_model(model_id: str) -> bool:
    try:
        list(query(model_id, messages=[{"role": "user", "content": "Model check"}]))
        return True
    except Exception:  # pylint: disable=broad-exception-caught
        return False


def query_ollama(model_id: str, messages: list[ChatMessage]) -> ModelIterResponse:
    response = ollama.chat(model=model_id, messages=messages, stream=True)
    for chunk in response:
        yield chunk.message.content or ""


def query_openai(model_id: str, messages: list[ChatMessage]) -> ModelIterResponse:
    client = openai.OpenAI(api_key=OPENAI_API_KEY)
    response = client.chat.completions.create(
        model=model_id,
        messages=messages,  # type: ignore
        temperature=0.7,
        stream=True,
    )
    for chunk in response:
        yield chunk.choices[0].delta.content or ""  # type: ignore


def query_anthropic(
    model_id: str, messages: list[ChatMessage], max_tokens: int = 1024
) -> ModelIterResponse:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    with client.messages.stream(
        model=model_id,
        messages=messages,  # type: ignore
        max_tokens=max_tokens,
    ) as stream:
        yield from stream.text_stream


@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
def query(model_id: str, messages: list[ChatMessage]) -> ModelIterResponse:
    model = MODEL_LOOKUP[model_id]
    client = model["client_id"]

    if client == "openai":
        return query_openai(model_id, messages)

    if client == "anthropic":
        return query_anthropic(model_id, messages)

    if client == "ollama":
        return query_ollama(model_id, messages)

    raise ValueError(f"Unknown model client: {client}")


def query_decision_agent(prompt: str) -> ModelIterResponse:
    messages: list[ChatMessage] = [
        {"role": "system", "content": "You are trying to help the user classify text."},
        {"role": "user", "content": prompt},
    ]
    return query_ollama(DECISION_MODEL, messages=messages)


def available_models() -> list[Model]:
    # model_availability = initialize()
    # return [model for model in MODELS if model_availability[model["name"]]]
    return MODELS


def summarize_history(history: list[ChatMessage]) -> list[ChatMessage]:
    messages = copy.deepcopy(history)
    sumarization_request = """
    Summarize our entire conversation so far into 2000 words or fewer, so that another
    LLM can continue our conversation from where we left off.
    """.strip()
    history.append({"role": "user", "content": sumarization_request})
    summarized_history = "".join(query_ollama(model_id="mistral", messages=messages))
    return [{"role": "assistant", "content": summarized_history}]
