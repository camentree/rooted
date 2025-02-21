import os

import faiss  # type: ignore
import numpy as np

from .sql import client
from ._embedding import embed, construct_index
from .models import query_decision_agent

MEMORY_INDEX_FILE = "data/memory_embeddings.index"
MEMORY_DB_FILE = "data/memory_store.db"


def initialize_database():
    with client(MEMORY_DB_FILE) as cursor:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS memories (
                memory_id INTEGER PRIMARY KEY AUTOINCREMENT,
                memory TEXT UNIQUE
            )
        """
        )
    index = construct_index()
    faiss.write_index(faiss.IndexIDMap(index), MEMORY_INDEX_FILE)


def add(text):
    with client(MEMORY_DB_FILE) as cursor:
        cursor.execute(
            "INSERT OR IGNORE INTO memories (memory) VALUES (?) RETURNING memory_id",
            (text,),
        )
        result = cursor.fetchone()
        if result is None:
            return
        memory_id = result["memory_id"]

        embedding = embed(text)
        index = faiss.read_index(MEMORY_INDEX_FILE)
        if not isinstance(index, faiss.IndexIDMap):
            index = faiss.IndexIDMap(index)
        index.add_with_ids(
            np.array([embedding], dtype=np.float32),
            np.array([memory_id], dtype=np.int64),
        )
        faiss.write_index(index, MEMORY_INDEX_FILE)


def fetch_relevant_memories(
    query: str, broad_search: bool = False, k: int = 3
) -> tuple[list[str], list[float]]:
    if broad_search:
        with client(MEMORY_DB_FILE) as cursor:
            cursor.execute("SELECT memory FROM memories")
            memories = cursor.fetchall()
        results: list[str] = [memory["memory"] for memory in memories]
        distances = [-1.0] * len(results)
        print(f"Memories found: {len(results):,}")
        return results, distances

    index = faiss.read_index(MEMORY_INDEX_FILE)
    print("emedding memory query")
    embedding = embed(query)
    print("searching")
    _distances, _indices = index.search(np.array([embedding], dtype=np.float32), k)

    distances = _distances[0]
    indices = _indices[0]

    print("finding memories")
    results = []
    with client(MEMORY_DB_FILE) as cursor:
        for memory_id in indices:
            if memory_id != -1:
                cursor.execute(
                    "SELECT memory FROM memories WHERE memory_id = ?", (int(memory_id),)
                )
                memory = cursor.fetchone()
                if memory:
                    results.append(memory["memory"])
    print(f"Memories found: {len(results):,}")
    return results, distances


def rebuild_database():
    with client(MEMORY_DB_FILE) as cursor:
        cursor.execute("SELECT memory_id, memory FROM memories")
        memories = cursor.fetchall()

    if not memories:
        print("No memories found. Skipping index rebuild.")
        return

    embeddings = []
    ids = []
    for memory in memories:
        embeddings.append(embed(memory["memory"]))
        ids.append(memory["memory_id"])

    index = construct_index()
    index = faiss.IndexIDMap(index)
    index.add_with_ids(  # pylint: disable=no-value-for-parameter
        np.vstack(embeddings).astype(np.float32),
        np.array(ids, dtype=np.int64),
    )

    faiss.write_index(index, MEMORY_INDEX_FILE)
    print(f"Rebuilt SQLite database with {len(memories)} memories.")


def is_memorable(prompt: str) -> tuple[bool, str]:
    text = f"""
Analyze the following text. If it contains important facts, user preferences, habits, or recurring behaviors, summarize just the key takeaways in a concise format.
Otherwise, respond with only the word 'None'.

Text:
{prompt}
    """.strip()
    summary = "".join(query_decision_agent(text))
    return "none" not in summary.lower(), summary.strip()


def _destroy_database():
    with client(MEMORY_DB_FILE) as cursor:
        cursor.execute("DROP TABLE IF EXISTS memories")

    for filepath in (MEMORY_DB_FILE, MEMORY_INDEX_FILE):
        if os.path.exists(filepath):
            os.remove(filepath)
