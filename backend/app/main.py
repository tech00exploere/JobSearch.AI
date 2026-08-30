import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import health, chat, model, jobs

app = FastAPI(
    title="JobSearch.ai API",
    description=(
        "Backend API for JobSearch.ai — An agentic AI platform that discovers relevant jobs, "
        "analyzes job descriptions, evaluates resume fit, generates tailored non-hallucinated application materials, "
        "and prepares applications for human-approved submission."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Always allow localhost for development
ALLOW_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Add production frontend URL if set (e.g. https://jobsearch.vercel.app)
frontend_url = os.getenv("FRONTEND_URL", "")
if frontend_url:
    ALLOW_ORIGINS.append(frontend_url.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(chat.router, prefix="/api", tags=["Agent Chat"])
app.include_router(jobs.router, prefix="/api", tags=["Jobs & Applications"])
app.include_router(model.router, prefix="/api", tags=["Agent Metadata"])


@app.get("/", tags=["Root"])
async def root() -> dict:
    """Root endpoint — status and docs link"""
    return {
        "message": "JobSearch.ai — AI Job Search & Application Agent Backend is running",
        "docs": "/docs",
        "version": "1.0.0",
    }

