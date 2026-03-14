from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.auth import get_current_user
from app.core.database import db
from app.core.config import settings
import random, re, time, jwt, json
from urllib.parse import quote

router = APIRouter(prefix="/api/projects", tags=["projects"])


class RepoUrlBody(BaseModel):
    repo_url: str


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
            return existing.data[0]

    projects = db.table("projects").select("*").eq("intern_role", intern_role).execute()
    if not projects.data:
        raise HTTPException(status_code=404, detail=f"No projects found for role: {intern_role}")

    project = random.choice(projects.data)
    db.table("profiles").update({"project_id": project["id"]}).eq("id", user_id).execute()
    return project


@router.get("/{project_id}")
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    result = db.table("projects").select("*").eq("id", project_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return result.data[0]


@router.patch("/{project_id}/repo")
async def update_repo_url(project_id: str, body: RepoUrlBody, current_user: dict = Depends(get_current_user)):
    """Save or update the GitHub repo URL for a project."""
    repo_url = body.repo_url.strip()
    if not repo_url:
        raise HTTPException(status_code=400, detail="repo_url is required")
    if "github.com" not in repo_url:
        raise HTTPException(status_code=400, detail="Must be a valid GitHub URL")

    result = db.table("projects").update({"repo_url": repo_url}).eq("id", project_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")

    return {"repo_url": repo_url}


@router.post("/{project_id}/setup-token")
async def get_setup_token(project_id: str, current_user: dict = Depends(get_current_user)):
    result = db.table("projects").select("*").eq("id", project_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")

    project  = result.data[0]
    repo_url = project.get("repo_url", "")

    if not repo_url:
        raise HTTPException(status_code=400, detail="No GitHub repo configured for this project.")

    match = re.search(r"github\.com[/:](.+?/.+?)(?:\.git)?$", repo_url.strip())
    if not match:
        raise HTTPException(status_code=400, detail=f"Invalid GitHub URL: {repo_url}")
    repo = match.group(1).rstrip("/")

    username = (
        current_user.get("github_username")
        or current_user.get("name", "intern").lower().replace(" ", "-")
    )
    branch = f"{username}-dev"
    token  = jwt.encode(
        {"user_id": current_user["id"], "repo": repo, "branch": branch, "exp": time.time() + 300},
        settings.jwt_secret, algorithm="HS256"
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

    setup_url = f"internx://setup?repo={repo}&branch={branch}&token={token}"
    if folder_structure:
        setup_url += f"&folderStructure={quote(json.dumps(folder_structure))}"

    return {
        "setup_url":  setup_url,
        "repo":       repo,
        "branch":     branch,
        "expires_in": 300,
    }