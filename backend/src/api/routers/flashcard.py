import os
import uuid

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, status
from fastapi.responses import FileResponse

from ..schemas.flashcard import (
    FlashcardRequest,
    FlashcardInfo,
)

from ...agents.flashcard_agent.schema import FlashcardConfig
from ...db.database import get_db_context
from ...db.models.db_user import User
from ...services.flashcard_service import FlashcardService
from ...utils.auth import get_current_active_user


router = APIRouter(
    prefix="/flashcard",
    tags=["flashcard"],
    responses={404: {"description": "Not found"}},
)
flashcard_Service = FlashcardService()


@router.post("/generate")
async def generate_flashcards(
    flashcard_request: FlashcardRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user)
) -> FlashcardInfo:
    """Initiate flashcard creation as a background task and return a task ID for WebSocket progress updates."""

    with (get_db_context() as db):
        # Create empty flashcard_deck in the database

        flashcard_deck = None
        """
        flashcard_deck = flashcard_crud.create_new_flashcards(
            db=db,
            user_id=str(current_user.id),
            query_=flashcard_request.description,
            difficulty=flashcard_request.difficulty,
            status= FlashcardStatus.CREATING
        )
        """

        if not flashcard_deck:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create course in the database"
            )

        task_id = str(uuid.uuid4())
        # Add the long-running course creation to background tasks
        # The agent_service.create_course will need to be modified to accept ws_manager and task_id
        background_tasks.add_task(
            flashcard_Service.create_flashcards,
            user_id=str(current_user.id),
            deck_id=flashcard_deck.id,
            request=flashcard_request,
            task_id=task_id
        )

        return FlashcardInfo(
            deck_id=int(flashcard_deck.id),
            status=flashcard_deck.status.value,  # Convert enum to string
            completed_flashcard_count=0
        )


@router.get("/tasks/{task_id}/download")
async def download_flashcards(
    task_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Download the generated flashcard deck."""
    
    file_path = flashcard_Service.get_download_path(task_id)
    if file_path is None or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found or task not completed")
    
    return FileResponse(
        path=file_path,
        filename=f"flashcards_{task_id}.apkg",
        media_type="application/octet-stream"
    )
