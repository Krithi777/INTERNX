from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.auth import get_current_user
from app.core.database import db
from app.core.config import settings
import random, re, time, jwt, json, uuid
from urllib.parse import quote
from datetime import datetime, timezone

router = APIRouter(prefix="/api/projects", tags=["projects"])


class RepoUrlBody(BaseModel):
    repo_url: str


def assign_tasks_to_user(project_id: str, user_id: str):
    existing = db.table("tasks").select("id") \
        .eq("project_id", project_id) \
        .eq("assigned_to", user_id) \
        .execute()
    if existing.data:
        return

    all_tasks = db.table("tasks").select("*") \
        .eq("project_id", project_id) \
        .is_("assigned_to", "null") \
        .execute()

    if not all_tasks.data:
        return

    now = datetime.now(timezone.utc).isoformat()
    new_tasks = []
    for task in all_tasks.data:
        new_tasks.append({
            "id":          str(uuid.uuid4()),
            "project_id":  project_id,
            "assigned_to": user_id,
            "title":       task["title"],
            "description": task.get("description"),
            "priority":    task.get("priority", "medium"),
            "status":      "todo",
            "due_date":    task.get("due_date"),
            "sprint_id":   task.get("sprint_id"),
            "resources":   task.get("resources"),
            "intern_role": task.get("intern_role"),
            "created_at":  now,
            "updated_at":  now,
        })

    if new_tasks:
        db.table("tasks").insert(new_tasks).execute()


def get_user_project_settings(project_id: str, user_id: str):
    """Get per-user settings for a specific project."""
    result = db.table("user_projects").select("*") \
        .eq("user_id", user_id) \
        .eq("project_id", project_id) \
        .execute()
    return result.data[0] if result.data else {}


def upsert_user_project_settings(project_id: str, user_id: str, data: dict):
    """Save or update per-user project settings."""
    existing = db.table("user_projects").select("id") \
        .eq("user_id", user_id) \
        .eq("project_id", project_id) \
        .execute()

    payload = {
        "user_id":    user_id,
        "project_id": project_id,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        **data,
    }

    if existing.data:
        db.table("user_projects").update(payload) \
            .eq("user_id", user_id) \
            .eq("project_id", project_id) \
            .execute()
    else:
        db.table("user_projects").insert(payload).execute()


@router.get("/")
async def list_projects(current_user: dict = Depends(get_current_user)):
    result = db.table("projects").select("*").execute()
    return result.data


@router.post("/assign")
async def assign_project(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    intern_role = current_user.get("intern_role")

    if not intern_role:
        raise HTTPException(status_code=400, detail="Complete onboarding first")

    profile = db.table("profiles").select("project_id").eq("id", user_id).execute()
    if profile.data and profile.data[0].get("project_id"):
        existing = db.table("projects").select("*").eq("id", profile.data[0]["project_id"]).execute()
        if existing.data:
            assign_tasks_to_user(existing.data[0]["id"], user_id)
            project = dict(existing.data[0])
            s = get_user_project_settings(project["id"], user_id)
            project["user_repo_url"] = s.get("github_repo_url", "")
            return project

    projects = db.table("projects").select("*").eq("intern_role", intern_role).execute()
    if not projects.data:
        raise HTTPException(status_code=404, detail=f"No projects found for role: {intern_role}")

    project = dict(random.choice(projects.data))
    db.table("profiles").update({"project_id": project["id"]}).eq("id", user_id).execute()
    assign_tasks_to_user(project["id"], user_id)
    project["user_repo_url"] = ""
    return project


@router.get("/{project_id}")
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    result = db.table("projects").select("*").eq("id", project_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")
    project = dict(result.data[0])
    s = get_user_project_settings(project_id, current_user["id"])
    project["user_repo_url"] = s.get("github_repo_url", "")
    return project


@router.patch("/{project_id}/repo")
async def update_repo_url(
    project_id: str,
    body: RepoUrlBody,
    current_user: dict = Depends(get_current_user)
):
    """Save this user's personal GitHub repo URL for this project."""
    repo_url = body.repo_url.strip()
    if not repo_url:
        raise HTTPException(status_code=400, detail="repo_url is required")
    if "github.com" not in repo_url:
        raise HTTPException(status_code=400, detail="Must be a valid GitHub URL")

    result = db.table("projects").select("id").eq("id", project_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")

    upsert_user_project_settings(project_id, current_user["id"], {
        "github_repo_url": repo_url
    })
    return {"repo_url": repo_url}


@router.post("/{project_id}/setup-token")
async def get_setup_token(project_id: str, current_user: dict = Depends(get_current_user)):
    result = db.table("projects").select("*").eq("id", project_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")

    project = result.data[0]

    # Use this user's personal repo URL — NOT the shared project one
    s = get_user_project_settings(project_id, current_user["id"])
    repo_url = s.get("github_repo_url", "")

    if not repo_url:
        raise HTTPException(
            status_code=400,
            detail="No GitHub repo configured. Add your repo URL in the Overview tab first."
        )

    match = re.search(r"github\.com[/:](.+?/.+?)(?:\.git)?$", repo_url.strip())
    if not match:
        raise HTTPException(status_code=400, detail=f"Invalid GitHub URL: {repo_url}")
    repo = match.group(1).rstrip("/")

    username = (
        current_user.get("github_username")
        or current_user.get("name", "intern").lower().replace(" ", "-")
    )
    branch = f"{username}-dev"
    token = jwt.encode(
        {"user_id": current_user["id"], "repo": repo, "branch": branch, "exp": time.time() + 300},
        settings.jwt_secret,
        algorithm="HS256"
    )

    raw_structure = project.get("folder_structure")
    folder_structure = None
    if isinstance(raw_structure, dict):
        folder_structure = raw_structure
    elif isinstance(raw_structure, str):
        try:
            folder_structure = json.loads(raw_structure)
        except Exception:
            folder_structure = None

    # ── Resolve task_id so the CLI writes it into .internx.json automatically ──
    # This means `internx pr` works with zero env vars after setup.
    task_id = None
    try:
        task_result = db.table("tasks").select("id") \
            .eq("project_id", project_id) \
            .eq("assigned_to", current_user["id"]) \
            .order("created_at", desc=False) \
            .limit(1) \
            .execute()
        if task_result.data:
            task_id = task_result.data[0]["id"]
    except Exception:
        pass  # non-fatal — CLI falls back to $INTERNX_TASK_ID env var if absent

    setup_url = f"internx://setup?repo={repo}&branch={branch}&token={token}"
    if task_id:
        setup_url += f"&task_id={task_id}"
    # InternX JWT — lets CLI call /api/mentor/review without extra login
    internx_token = jwt.encode(
        {"user_id": current_user["id"], "exp": time.time() + 86400 * 30},  # 30 days
        settings.jwt_secret,
        algorithm="HS256"
    )
    setup_url += f"&internx_token={internx_token}"
    # Backend URL — CLI needs this to know where to POST /api/mentor/review
    backend_url = getattr(settings, "backend_url", "http://127.0.0.1:8000")
    setup_url += f"&api_url={quote(backend_url)}"
    if folder_structure:
        setup_url += f"&folderStructure={quote(json.dumps(folder_structure))}"

    return {"setup_url": setup_url, "repo": repo, "branch": branch, "task_id": task_id, "expires_in": 300}