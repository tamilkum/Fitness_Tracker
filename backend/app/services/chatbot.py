"""Fitness chatbot service backed by Google Gemini.

The model is restricted by a system instruction to general health tips and
workout ideas only. It will not diagnose conditions, prescribe treatment, or
claim to replace professional medical advice.
"""

from app.core.config import settings

# ── System instruction ────────────────────────────────────────────────────────

_SYSTEM_INSTRUCTION = (
    "You are a helpful fitness assistant for the Stride Fitness Challenge app. "
    "Your role is to provide general, practical health tips and workout ideas "
    "that anyone can try. "
    "\n\nGuidelines you must always follow:\n"
    "- Give short, actionable, encouraging answers.\n"
    "- Cover topics like exercise routines, general nutrition principles, "
    "hydration, sleep, recovery, and motivation.\n"
    "- Never diagnose a medical condition or injury.\n"
    "- Never prescribe medication, treatment, or specific therapeutic advice.\n"
    "- Do not express unsafe certainty about health claims.\n"
    "- If someone describes concerning symptoms or asks for personal medical "
    "advice, respond briefly, decline to advise, and recommend they speak with "
    "a qualified healthcare professional.\n"
    "- Keep responses concise — 3 to 6 sentences unless a longer explanation "
    "genuinely helps.\n"
    "- Do not mention that you are a language model or that you are built on "
    "any specific AI product."
)

_GEMINI_MODEL = "gemini-3.8-flash"


def ask_chatbot(question: str) -> str:
    """Send *question* to Gemini and return the text answer.

    Raises:
        RuntimeError: GEMINI_API_KEY is not set or the SDK call fails.
    """
    if not settings.gemini_api_key:
        raise RuntimeError(
            "The fitness assistant is not configured. "
            "Ask your administrator to set GEMINI_API_KEY."
        )

    try:
        from google import genai
        from google.genai import types as genai_types

        client = genai.Client(api_key=settings.gemini_api_key)

        response = client.models.generate_content(
            model=_GEMINI_MODEL,
            contents=question,
            config=genai_types.GenerateContentConfig(
                system_instruction=_SYSTEM_INSTRUCTION,
                temperature=0.7,
                max_output_tokens=512,
            ),
        )
        return response.text or ""
    except ImportError as exc:
        raise RuntimeError(
            "google-genai package is not installed. "
            "Run: pip install google-genai"
        ) from exc
    except Exception as exc:
        raise RuntimeError(
            f"The fitness assistant could not generate a response: {exc}"
        ) from exc
