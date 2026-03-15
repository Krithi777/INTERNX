from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

app = FastAPI(
    title="InternX API",
    description="AI-Powered Virtual Internship Simulator Backend",
    version="1.0.0",
    docs_url="/docs" if settings.environment == "development" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import auth, tasks, projects, mentor
app.include_router(auth.router,   prefix="/api/auth",     tags=["Auth"])
app.include_router(tasks.router)
app.include_router(projects.router)
app.include_router(mentor.router)

@app.get("/")
def root():
    return {"status": "ok", "app": "InternX API", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "healthy"}