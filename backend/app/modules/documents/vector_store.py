"""ChromaDB vector store operations."""

import logging
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.utils import embedding_functions
from app.core.config import settings

logger = logging.getLogger(__name__)

_client: Optional[chromadb.api.ClientAPI] = None


def get_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
    return _client


def _collection_name(workspace_id: int) -> str:
    return f"workspace_{workspace_id}"


def _get_or_create_collection(workspace_id: int):
    client = get_client()
    ef = embedding_functions.DefaultEmbeddingFunction()
    return client.get_or_create_collection(
        name=_collection_name(workspace_id),
        embedding_function=ef,
        metadata={"hnsw:space": "cosine"},
    )


def add_chunks(workspace_id: int, chunks: List[Dict[str, Any]]) -> None:
    if not chunks:
        return
    collection = _get_or_create_collection(workspace_id)
    ids = [f"doc{c['document_id']}_chunk{c['chunk_index']}" for c in chunks]
    documents = [c["text"] for c in chunks]
    metadatas = [
        {
            "document_id": c["document_id"],
            "document_name": c["document_name"],
            "chunk_index": c["chunk_index"],
        }
        for c in chunks
    ]
    # ChromaDB upsert in batches of 100
    batch_size = 100
    for i in range(0, len(ids), batch_size):
        collection.upsert(
            ids=ids[i:i+batch_size],
            documents=documents[i:i+batch_size],
            metadatas=metadatas[i:i+batch_size],
        )


def query_chunks(workspace_id: int, query: str, n_results: int = 8) -> List[Dict[str, Any]]:
    try:
        collection = _get_or_create_collection(workspace_id)
        count = collection.count()
        if count == 0:
            return []
        n = min(n_results, count)
        results = collection.query(query_texts=[query], n_results=n)
        chunks = []
        for i, doc in enumerate(results["documents"][0]):
            meta = results["metadatas"][0][i]
            distance = results["distances"][0][i] if results.get("distances") else 1.0
            chunks.append({
                "text": doc,
                "document_id": meta["document_id"],
                "document_name": meta["document_name"],
                "chunk_index": meta["chunk_index"],
                "relevance_score": round(1 - distance, 3),
            })
        return chunks
    except Exception as e:
        logger.error(f"Vector query failed: {e}")
        return []


def delete_document_chunks(workspace_id: int, document_id: int) -> None:
    try:
        collection = _get_or_create_collection(workspace_id)
        collection.delete(where={"document_id": document_id})
    except Exception as e:
        logger.error(f"Failed to delete chunks for doc {document_id}: {e}")


def delete_workspace_collection(workspace_id: int) -> None:
    try:
        client = get_client()
        client.delete_collection(_collection_name(workspace_id))
    except Exception as e:
        logger.error(f"Failed to delete collection for workspace {workspace_id}: {e}")
