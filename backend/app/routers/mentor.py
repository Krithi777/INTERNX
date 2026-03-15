from fastapi import APIRouter, Depends, BackgroundTasks, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from app.core.auth import get_current_user
from app.core.database import db
from app.services import mentor as mentor_service

router = APIRouter(prefix="/api/mentor", tags=["Mentor"])


class ChatMessage(BaseModel):
    message: str

class PRReviewRequest(BaseModel):
    task_id: str
    pr_diff: str


@router.websocket("/chat/{task_id}")
async def mentor_chat(task_id: str, websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            user_message = data.get("message", "")
            user_id = data.get("user_id", "")

            if not user_message or not user_id:
                await websocket.send_text("[ERROR] Missing message or user_id")
                continue

            async for token in mentor_service.stream_mentor_response(
                task_id=task_id,
                user_id=user_id,
                user_message=user_message,
            ):
                await websocket.send_text(token)

            await websocket.send_text("[DONE]")

    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_text(f"[ERROR] {str(e)}")
        await websocket.close()


@router.get("/sessions/{task_id}")
async def get_chat_history(
    task_id: str,
    current_user: dict = Depends(get_current_user),
):
    history = mentor_service.get_session_history(
        task_id=task_id,
        user_id=current_user["id"],
    )
    return {"task_id": task_id, "messages": history}


@router.post("/review")
async def trigger_review(
    body: PRReviewRequest,
    background_tasks: BackgroundTasks,
):
    task_id = body.task_id
    pr_diff = body.pr_diff

    async def run_review():
        try:
            print(f"Starting review for task {task_id}")
            review = await mentor_service.review_pr(task_id=task_id, pr_diff=pr_diff)
            print(f"Review result: {review}")

            improvements = review.get("improvements", [])
            missing = review.get("missing_requirements", [])

            feedback_parts = []
            if review.get("summary"):
                feedback_parts.append(review["summary"])
            if missing:
                feedback_parts.append("Missing: " + ", ".join(missing))
            if improvements:
                feedback_parts.append("Improve: " + " | ".join(improvements))

            full_feedback = "\n\n".join(feedback_parts)

            score = review.get("score", 0)
            new_status = "done" if score >= 70 else "in_progress"

            db.table("tasks").update({
                "score": score,
                "feedback": full_feedback,
                "status": new_status,
            }).eq("id", task_id).execute()

            if new_status == "in_progress":
                print(f"Score {score} is below 70 — task remains in progress")
            else:
                print(f"Score {score} — task marked as done")

        except Exception as e:
            print(f"Review failed: {e}")

    background_tasks.add_task(run_review)
    return {"status": "review_started", "task_id": task_id}


@router.get("/summary/{user_id}")
async def get_learning_summary(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    from groq import Groq
    from app.core.config import settings

    ai_client = Groq(api_key=settings.groq_api_key)

    tasks_result = (
        db.table("tasks")
        .select("title, description, score, feedback")
        .eq("assigned_to", user_id)
        .eq("status", "done")
        .execute()
    )
    tasks = tasks_result.data or []

    if not tasks:
        return {"summary": "No completed tasks yet."}

    task_list = "\n".join(
        f"- {t['title']} (score: {t.get('score', 'N/A')}): {t.get('feedback', '')}"
        for t in tasks
    )

    prompt = f"""
A software engineering intern has completed these tasks:
{task_list}

Write a 3-paragraph professional learning summary for their portfolio.
Highlight skills demonstrated, improvement over time, and readiness for real internships.
Keep it encouraging and specific.
""".strip()

    response = ai_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
    )
    return {"summary": response.choices[0].message.content}