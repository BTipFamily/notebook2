"""RAG engine supporting Anthropic Claude and MetLife MetIQ LLMs."""

import asyncio
import logging
import re
from typing import List, Dict, Any, Optional

import anthropic
import requests as _requests

from app.core.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an intelligent enterprise knowledge analyst. Your role is to help employees understand, analyze, and extract insights from internal company documents.

**Core Principles:**
1. Answer questions based on the provided document context only
2. Always cite your sources using the format: **[Source: Document Name]**
3. If information isn't in the context, clearly say: "This information isn't available in the uploaded documents."
4. Be precise, professional, and concise
5. Never hallucinate or make up information

**Citation Format:**
When referencing specific information, use: **[Source: <document_name>]**
Multiple sources: **[Source: Doc A, Doc B]**

**Response Style:**
- For executives: Lead with the key takeaway, then supporting details
- For technical questions: Be thorough with exact details
- For summaries: Use structured headings and bullet points
- For action items: Use numbered lists"""


def _build_context(chunks: List[Dict]) -> str:
    if not chunks:
        return "No documents available."
    parts = []
    seen_docs = set()
    for chunk in chunks:
        doc_name = chunk["document_name"]
        # Include all retrieved chunks — ChromaDB already returns only the top-N
        # most relevant results via HNSW search, so further score filtering would
        # incorrectly drop content for broad meta-queries ("summarize", "simplify").
        header = f"[Document: {doc_name}]" if doc_name not in seen_docs else f"[Document: {doc_name} (continued)]"
        seen_docs.add(doc_name)
        parts.append(f"{header}\n{chunk['text']}")
    return "\n\n---\n\n".join(parts) if parts else "No relevant content found."


def _extract_citations(content: str, chunks: List[Dict]) -> List[Dict]:
    """Parse [Source: X] markers from AI response and link to document metadata."""
    citations = []
    pattern = r'\[Source:\s*([^\]]+)\]'
    matches = re.findall(pattern, content)

    doc_map = {}
    for chunk in chunks:
        doc_map[chunk["document_name"]] = chunk["document_id"]

    seen = set()
    for match in matches:
        for doc_name_part in match.split(","):
            name = doc_name_part.strip()
            if name and name not in seen:
                seen.add(name)
                # Fuzzy match document names
                doc_id = None
                for known_name, did in doc_map.items():
                    if name.lower() in known_name.lower() or known_name.lower() in name.lower():
                        doc_id = did
                        name = known_name
                        break
                citations.append({"document_name": name, "document_id": doc_id})

    return citations


def _get_client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


def _get_metiq_client():
    """Build and return a MetIQ LangChain client using settings."""
    try:
        from langchain_metiq import MetIQ, MetIQConfig
    except ImportError as exc:
        raise RuntimeError(
            "langchain-metiq is not installed. "
            "Run: pip install langchain-metiq"
        ) from exc
    session = _requests.Session()
    session.headers.update({
        "api-key": settings.METIQ_API_KEY,
        "Ocp-Apim-Subscription-Key": settings.OCP_APIM_SUBSCRIPTION_KEY,
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
    })
    config = MetIQConfig(
        use_case_id=settings.METIQ_USE_CASE_ID,
        client_id="innovation_api",
        endpoint=settings.METIQ_ENDPOINT,
        subscription_key=settings.OCP_APIM_SUBSCRIPTION_KEY,
        session=session,
    )
    return MetIQ(config=config)


def _call_metiq(prompt: str) -> str:
    """Send a plain-text prompt to MetIQ and return the response string."""
    metiq = _get_metiq_client()
    response = metiq.chat(prompt)
    if hasattr(response, "generations"):
        return response.generations[0].message.content
    return str(response)


async def _chat_metiq(
    query: str,
    workspace_name: str,
    chunks: List[Dict],
    history: List[Dict[str, str]],
) -> Dict[str, Any]:
    """MetIQ-backed RAG chat — formats context + history into a single prompt."""
    context = _build_context(chunks)

    history_text = ""
    for msg in history[-8:]:
        role = "User" if msg["role"] == "user" else "Assistant"
        history_text += f"{role}: {msg['content']}\n"

    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        + (f"Previous conversation:\n{history_text}\n" if history_text else "")
        + f"Workspace: {workspace_name}\n\n"
        f"<context>\n{context}\n</context>\n\n"
        f"Question: {query}"
    )

    content = await asyncio.to_thread(_call_metiq, prompt)
    citations = _extract_citations(content, chunks)
    return {
        "content": content,
        "citations": citations,
        "input_tokens": 0,
        "output_tokens": 0,
    }


async def _generate_quick_summary_metiq(text: str, doc_name: str) -> str:
    """MetIQ-backed document summary."""
    prompt = (
        f"Summarize this document in 2-3 sentences.\n"
        f"Document: {doc_name}\n\nContent:\n{text[:4000]}"
    )
    return await asyncio.to_thread(_call_metiq, prompt)


async def _generate_report_metiq(
    report_type: str,
    workspace_name: str,
    all_chunks: List[Dict],
    custom_instructions: Optional[str] = None,
) -> str:
    """MetIQ-backed report generation."""
    context = _build_context(all_chunks[:30])

    REPORT_PROMPTS = {
        "executive_summary": "Generate a professional Executive Summary with Overview, Key Findings, Strategic Implications, Recommended Actions, Risks & Mitigations, and Key Metrics. Cite sources as **[Source: Doc Name]**.",
        "action_items": "Extract all action items and next steps, grouped by High / Medium / Low priority. Cite sources as **[Source: Doc Name]**.",
        "risk_analysis": "Perform a comprehensive risk analysis: Risk Register table, Top 5 Critical Risks, Dependency Map, and Recommendations. Cite sources as **[Source: Doc Name]**.",
        "meeting_prep": "Create a Meeting Preparation Brief: Context, Key Topics, Open Issues, Data Points, Stakeholder Positions, Suggested Agenda, and Pre-Meeting Checklist.",
        "faq": "Generate 15-25 FAQ Q&A pairs organised into logical categories. Cite sources as **[Source: Doc Name]**.",
        "technical_deep_dive": "Create a Technical Deep Dive: Architecture Overview, Component Breakdown, Technical Specifications, Integration Points, Data Flow, Known Issues, and Implementation Notes. Cite with **[Source: Doc Name]**.",
    }

    task = REPORT_PROMPTS.get(report_type, REPORT_PROMPTS["executive_summary"])
    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"Workspace: {workspace_name}\n\n"
        f"<documents>\n{context}\n</documents>\n\n"
        f"{task}"
    )
    if custom_instructions:
        prompt += f"\n\nAdditional instructions: {custom_instructions}"
    return await asyncio.to_thread(_call_metiq, prompt)


async def chat(
    query: str,
    workspace_name: str,
    chunks: List[Dict],
    history: List[Dict[str, str]],
) -> Dict[str, Any]:
    """Core RAG chat — routes to Anthropic or MetIQ based on AI_PROVIDER setting."""
    if settings.AI_PROVIDER == "metiq":
        return await _chat_metiq(query, workspace_name, chunks, history)

    client = _get_client()

    context = _build_context(chunks)

    # Build messages with prompt caching on context (stays same across turns)
    messages = []
    for msg in history[-8:]:  # Last 8 messages for context window
        messages.append({"role": msg["role"], "content": msg["content"]})

    # Current user message includes the retrieved context
    user_content = [
        {
            "type": "text",
            "text": f"<workspace>{workspace_name}</workspace>\n\n<context>\n{context}\n</context>",
            "cache_control": {"type": "ephemeral"},  # Cache the document context
        },
        {
            "type": "text",
            "text": f"\n\nQuestion: {query}",
        },
    ]
    messages.append({"role": "user", "content": user_content})

    system_with_cache = [
        {
            "type": "text",
            "text": SYSTEM_PROMPT,
            "cache_control": {"type": "ephemeral"},  # Cache the system prompt
        }
    ]

    response = client.messages.create(
        model=settings.AI_MODEL,
        max_tokens=4096,
        system=system_with_cache,
        messages=messages,
        extra_headers={"anthropic-beta": "prompt-caching-2024-07-31"},
    )

    content = response.content[0].text
    citations = _extract_citations(content, chunks)

    return {
        "content": content,
        "citations": citations,
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
    }


async def generate_quick_summary(text: str, doc_name: str) -> str:
    """Generate a brief document summary for the document card."""
    if settings.AI_PROVIDER == "metiq":
        return await _generate_quick_summary_metiq(text, doc_name)

    client = _get_client()
    response = client.messages.create(
        model=settings.AI_MODEL,
        max_tokens=300,
        messages=[{
            "role": "user",
            "content": f"Summarize this document in 2-3 sentences. Document: {doc_name}\n\nContent:\n{text[:4000]}",
        }],
    )
    return response.content[0].text


async def generate_report(
    report_type: str,
    workspace_name: str,
    all_chunks: List[Dict],
    custom_instructions: Optional[str] = None,
) -> str:
    """Generate a structured report from workspace documents."""
    if settings.AI_PROVIDER == "metiq":
        return await _generate_report_metiq(report_type, workspace_name, all_chunks, custom_instructions)

    client = _get_client()

    context = _build_context(all_chunks[:30])  # Top 30 most relevant chunks

    REPORT_PROMPTS = {
        "executive_summary": """Generate a professional Executive Summary from these documents.

Structure:
# Executive Summary — {workspace}

## Overview
[2-3 sentence high-level summary]

## Key Findings
- [Finding 1]
- [Finding 2]
- [Finding 3]

## Strategic Implications
[2-3 key business implications]

## Recommended Actions
1. [Action 1] — Owner: [suggested] | Timeline: [suggested]
2. [Action 2] — Owner: [suggested] | Timeline: [suggested]

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|-----------|
| ... | ... | ... |

## Key Metrics & Milestones
[List key metrics or dates found in documents]

Use professional business language. Cite sources with **[Source: Doc Name]**.""",

        "action_items": """Extract all action items, tasks, and next steps from these documents.

# Action Items — {workspace}

Format each item as:
- [ ] **[Action]** — Responsible: [person/team if mentioned] | Due: [date if mentioned] | Priority: [High/Medium/Low] | **[Source: Doc]**

Group by:
## High Priority
## Medium Priority
## Low Priority / Backlog

Be exhaustive — capture every task, TODO, next step, or commitment mentioned.""",

        "risk_analysis": """Perform a comprehensive risk analysis from these documents.

# Risk Analysis — {workspace}

## Risk Register
| # | Risk Description | Category | Likelihood | Impact | Risk Score | Mitigation | Owner | **Source** |
|---|-----------------|----------|-----------|--------|-----------|-----------|-------|--------|
| 1 | ... | ... | H/M/L | H/M/L | H/M/L | ... | ... | ... |

## Top 5 Critical Risks
[Detail the top 5 risks with full analysis]

## Dependency Map
[List key dependencies that create risk]

## Recommendations
[Prioritized risk mitigation recommendations]""",

        "meeting_prep": """Create a Meeting Preparation Brief from these documents.

# Meeting Prep Brief — {workspace}

## Context & Background
[Key background needed to understand the topic]

## Key Topics to Discuss
1. [Topic 1] — Questions to ask
2. [Topic 2] — Questions to ask

## Open Issues & Decisions Needed
- [ ] [Issue 1]
- [ ] [Issue 2]

## Data Points & Metrics to Know
[Key numbers, stats, dates from documents]

## Stakeholder Positions
[Any positions or concerns mentioned in documents]

## Suggested Agenda
1. [Item] — [Time allocation]

## Pre-Meeting Checklist
- [ ] Review [doc]
- [ ] Prepare answer on [topic]""",

        "faq": """Generate a comprehensive FAQ document from these materials.

# Frequently Asked Questions — {workspace}

Format each Q&A pair as:

## [Category]

**Q: [Question]**
A: [Clear, concise answer] **[Source: Doc Name]**

Cover:
- Common questions employees would ask
- Technical questions
- Process/policy questions
- "How do I..." questions
- "What is..." questions

Organize into logical categories. Aim for 15-25 Q&A pairs.""",

        "technical_deep_dive": """Create a Technical Deep Dive document from these materials.

# Technical Deep Dive — {workspace}

## Architecture Overview
[System/technical overview]

## Component Breakdown
[Each major component with details]

## Technical Specifications
[Key specs, requirements, constraints]

## Integration Points
[APIs, dependencies, interfaces]

## Data Flow
[How data moves through the system]

## Known Issues & Limitations
[Technical debt, bugs, constraints]

## Implementation Notes
[Important technical decisions and rationale]

Be precise and thorough. Include all technical details found in documents. Cite with **[Source: Doc Name]**.""",
    }

    prompt_template = REPORT_PROMPTS.get(report_type, REPORT_PROMPTS["executive_summary"])
    prompt = prompt_template.replace("{workspace}", workspace_name)
    if custom_instructions:
        prompt += f"\n\nAdditional instructions: {custom_instructions}"

    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": f"<workspace>{workspace_name}</workspace>\n\n<documents>\n{context}\n</documents>",
                    "cache_control": {"type": "ephemeral"},
                },
                {
                    "type": "text",
                    "text": f"\n\n{prompt}",
                },
            ],
        }
    ]

    response = client.messages.create(
        model=settings.AI_MODEL,
        max_tokens=8192,
        system=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
        messages=messages,
        extra_headers={"anthropic-beta": "prompt-caching-2024-07-31"},
    )
    return response.content[0].text
