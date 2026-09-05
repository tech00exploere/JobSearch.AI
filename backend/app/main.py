import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import health, chat, model, jobs, career_scans, discovered_jobs, job_discovery
from app.auth import router as auth_router

app = FastAPI(
    title="JobSearch.ai API",
    description=(
        "Backend API for JobSearch.ai — An agentic AI platform that discovers relevant jobs, "
        "analyzes job descriptions, evaluates resume fit, generates tailored non-hallucinated application materials, "
        "and empowers candidates with tailored materials for direct manual application."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Always allow localhost & Vercel deployments for development and production
ALLOW_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://job-search-ai-ten.vercel.app",
]

frontend_url = os.getenv("FRONTEND_URL", "")
if frontend_url:
    for url in frontend_url.split(","):
        cleaned = url.strip().rstrip("/")
        if cleaned and cleaned not in ALLOW_ORIGINS:
            ALLOW_ORIGINS.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include Routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(auth_router.router, prefix="/api", tags=["Authentication"])
app.include_router(chat.router, prefix="/api", tags=["Agent Chat"])
app.include_router(jobs.router, prefix="/api", tags=["Jobs & Applications"])
app.include_router(model.router, prefix="/api", tags=["Agent Metadata"])
app.include_router(career_scans.router, prefix="/api", tags=["Career Scans"])
app.include_router(discovered_jobs.router, prefix="/api", tags=["Discovered Jobs"])
app.include_router(job_discovery.router, prefix="/api", tags=["Web Job Discovery"])


@app.get("/", tags=["Root"])
async def root() -> dict:
    """Root endpoint — status and docs link"""
    return {
        "message": "JobSearch.ai — AI Job Search & Application Agent Backend is running",
        "docs": "/docs",
        "version": "1.0.0",
    }

