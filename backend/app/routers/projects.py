from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_current_user
from app.core.database import db
from app.core.config import settings
import random, re, time, jwt

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.post("/assign")
async def assign_project(current_user: dict = Depends(get_current_user)):
    """Randomly assign a project to the intern based on their role."""
    user_id = current_user["id"]
    intern_role = current_user.get("intern_role")

    if not intern_role:
        raise HTTPException(status_code=400, detail="Complete onboarding first")

    # Check if already assigned
    profile = db.table("profiles").select("project_id").eq("id", user_id).execute()
    if profile.data and profile.data[0].get("project_id"):
        existing = db.table("projects").select("*").eq("id", profile.data[0]["project_id"]).execute()
        if existing.data:
            return existing.data[0]

    # Fetch all projects for this role
    projects = db.table("projects").select("*").eq("intern_role", intern_role).execute()
    if not projects.data:
        raise HTTPException(status_code=404, detail=f"No projects found for role: {intern_role}")

    # Pick a random one
    project = random.choice(projects.data)

    # Save to profile
    db.table("profiles").update({"project_id": project["id"]}).eq("id", user_id).execute()

    return project


@router.post("/{project_id}/setup-token")
async def get_setup_token(project_id: str, current_user: dict = Depends(get_current_user)):
    result = db.table("projects").select("*").eq("id", project_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")

    project  = result.data[0]
    repo_url = project.get("repo_url", "")

    if not repo_url:
        raise HTTPException(status_code=400, detail="No GitHub repo configured for this project. Ask your mentor to add one.")

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

    return {
        "setup_url":  f"internx://setup?repo={repo}&branch={branch}&token={token}",
        "repo":       repo,
        "branch":     branch,
        "expires_in": 300,
    }


@router.get("/{project_id}")
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    """Fetch a specific project by ID."""
    result = db.table("projects").select("*").eq("id", project_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return result.data[0]


@router.get("/")
async def list_projects(current_user: dict = Depends(get_current_user)):
    """List all projects (admin use)."""
    result = db.table("projects").select("*").execute()
    return result.data