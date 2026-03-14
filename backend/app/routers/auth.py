import httpx
from fastapi import APIRouter, Depends, HTTPException
from app.core.config import settings
from app.core.database import db
from app.core.auth import create_access_token, get_current_user, require_role
from app.schemas.auth import (
    GitHubCallbackRequest, ProfileUpdate,
    RoleAssignRequest, TokenResponse, UserResponse
)

router = APIRouter()


@router.post("/github/callback", response_model=TokenResponse)
async def github_callback(body: GitHubCallbackRequest):
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id":     settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code":          body.code,
            },
            headers={"Accept": "application/json"},
        )
    token_data = token_response.json()
    if "error" in token_data:
        raise HTTPException(status_code=400, detail=f"GitHub OAuth error: {token_data['error_description']}")
    github_token = token_data["access_token"]

    async with httpx.AsyncClient() as client:
        user_response = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {github_token}", "Accept": "application/vnd.github+json"},
        )
        email_response = await client.get(
            "https://api.github.com/user/emails",
            headers={"Authorization": f"Bearer {github_token}", "Accept": "application/vnd.github+json"},
        )
    github_user   = user_response.json()
    github_emails = email_response.json()
    primary_email = next(
        (e["email"] for e in github_emails if e["primary"] and e["verified"]),
        github_user.get("email") or f"{github_user['login']}@github.local"
    )

    existing = db.table("profiles").select("*").eq("github_username", github_user["login"]).execute()

    if existing.data:
        profile = existing.data[0]
        db.table("profiles").update({
            "avatar_url": github_user.get("avatar_url"),
            "name":       github_user.get("name") or github_user["login"],
        }).eq("id", profile["id"]).execute()
        result  = db.table("profiles").select("*").eq("id", profile["id"]).single().execute()
        profile = result.data
    else:
        # Check if a Supabase auth user already exists with this email
        # (happens if a previous login attempt failed halfway)
        existing_auth = db.auth.admin.list_users()
        auth_user = next(
            (u for u in existing_auth if u.email == primary_email),
            None
        )

        if auth_user:
            new_id = auth_user.id
        else:
            auth_result = db.auth.admin.create_user({
                "email":         primary_email,
                "email_confirm": True,
                "user_metadata": {
                    "full_name":  github_user.get("name") or github_user["login"],
                    "avatar_url": github_user.get("avatar_url"),
                }
            })
            new_id = auth_result.user.id

        # upsert = insert if not exists, update if exists (prevents duplicate key error)
        db.table("profiles").upsert({
            "id":              new_id,
            "email":           primary_email,
            "name":            github_user.get("name") or github_user["login"],
            "avatar_url":      github_user.get("avatar_url"),
            "github_username": github_user["login"],
            "role":            "intern",
        }).execute()
        result  = db.table("profiles").select("*").eq("id", new_id).single().execute()
        profile = result.data

    token = create_access_token(
        user_id = profile["id"],
        role    = profile["role"],
        email   = profile["email"],
    )
    return TokenResponse(access_token=token, user=UserResponse(**profile))


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    # Always fetch fresh from DB — JWT does not include project_id or other
    # fields that change after login (intern_role, project assignment, etc.)
    result = db.table("profiles").select("*").eq("id", current_user["id"]).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return UserResponse(**result.data)


@router.put("/me", response_model=UserResponse)
async def update_me(body: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    db.table("profiles").update(updates).eq("id", current_user["id"]).execute()
    result = db.table("profiles").select("*").eq("id", current_user["id"]).single().execute()
    return UserResponse(**result.data)


@router.get("/users", response_model=list[UserResponse])
async def list_users(_: dict = Depends(require_role("mentor", "admin"))):
    result = db.table("profiles").select("*").order("created_at").execute()
    return [UserResponse(**u) for u in result.data]


@router.put("/role", response_model=UserResponse)
async def assign_role(body: RoleAssignRequest, _: dict = Depends(require_role("admin"))):
    result = db.table("profiles").update({"role": body.role}).eq("id", body.user_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**result.data)