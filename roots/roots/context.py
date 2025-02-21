from .models import query_decision_agent
from .memories import fetch_relevant_memories


def _prompt_requires_broad_context(prompt: str) -> tuple[bool, str]:
    text = f"""
Determine if the query requires broad memory retrieval.
Respond with either the word 'BROAD' or the word 'SPECIFIC'.

Query: {prompt}
""".strip()
    response = "".join(query_decision_agent(text)).strip()
    return "BROAD" in response, response


def generate(prompt: str) -> str:
    #     is_broad_prompt, _is_broad_prompt_response = _prompt_requires_broad_context(prompt)
    #     print(
    #         "Using broad context?",
    #         is_broad_prompt,
    #         ": (response)=",
    #         _is_broad_prompt_response,
    #     )
    #     relevant_memories, _ = fetch_relevant_memories(prompt, broad_search=is_broad_prompt)
    #     relevant_notes: list[str] = []
    #     context = f"""
    # Relevant memories:
    # {relevant_memories}

    # Relevante notes:
    # {relevant_notes}
    # """
    # return context
    return "hi"
