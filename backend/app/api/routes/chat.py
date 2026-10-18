from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.services.chatbot import ask_chatbot


router = APIRouter(
    prefix="/chat",
    tags=["chat"],
)


class ChatRequest(BaseModel):
    question: str = Field(
        min_length=1,
        max_length=100000000,
        description="A general health-tip or workout question.",
    )


class ChatResponse(BaseModel):
    answer: str


@router.post(
    "/",
    response_model=ChatResponse,
)
def fitness_chat(payload: ChatRequest):
    """Ask the fitness assistant a general health or workout question.

    This endpoint does not provide medical diagnoses or treatment advice.
    """
    try:
        answer = ask_chatbot(payload.question.strip())
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )

    return ChatResponse(answer=answer)
