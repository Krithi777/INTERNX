from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_current_user
from app.core.database import db

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


@router.get("/my-tasks")
async def get_my_tasks(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    profile = db.table("profiles").select("project_id").eq("id", user_id).execute()
    project_id = profile.data[0].get("project_id") if profile.data else None

    if project_id:
        result = db.table("tasks").select("*").eq("assigned_to", user_id).eq("project_id", project_id).execute()
    else:
        result = db.table("tasks").select("*").eq("assigned_to", user_id).execute()

    return result.data or []


@router.get("/sprints/active")
async def get_active_sprint(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    profile = db.table("profiles").select("project_id").eq("id", user_id).execute()
    project_id = profile.data[0].get("project_id") if profile.data else None

    if project_id:
        tasks = db.table("tasks").select("sprint_id").eq("project_id", project_id).limit(1).execute()
        if tasks.data and tasks.data[0].get("sprint_id"):
            sprint_id = tasks.data[0]["sprint_id"]
            sprint = db.table("sprints").select("*").eq("id", sprint_id).execute()
            return sprint.data or []

    result = db.table("sprints").select("*").eq("is_active", True).limit(1).execute()
    return result.data or []


@router.get("/active-task")
async def get_active_task(current_user: dict = Depends(get_current_user)):
    """Returns the current user's active in_progress task — used by CLI to auto-detect task ID"""
    user_id = current_user["id"]
    result = (
        db.table("tasks")
        .select("id, title, status")
        .eq("assigned_to", user_id)
        .eq("status", "in_progress")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        return {"task_id": None, "title": None}
    return {"task_id": result.data[0]["id"], "title": result.data[0]["title"]}


@router.get("/{task_id}")
async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    result = db.table("tasks").select("*").eq("id", task_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Task not found")
    return result.data[0]


@router.patch("/{task_id}/status")
async def update_task_status(task_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    valid_statuses = ["todo", "in_progress", "review", "done"]
    status = body.get("status")
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    result = db.table("tasks").update({"status": status}).eq("id", task_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Task not found")
    return result.data[0]


@router.patch("/{task_id}")
async def update_task(task_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    allowed = {"title", "description", "status", "priority", "due_date", "resources"}
    update_data = {k: v for k, v in body.items() if k in allowed}
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    result = db.table("tasks").update(update_data).eq("id", task_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Task not found")
    return result.data[0]