from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os

from app.routers import system, analysis, events

app = FastAPI(
    title='Security Analyzer API',
    description='Backend for Windows Security Log Analysis Dashboard',
    version='2.0'
)

# CORS middleware - allows frontend dev server to call API
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'http://localhost:3000'],  # Vite + fallback
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Register routers
app.include_router(system.router, prefix='/api/system', tags=['System'])
app.include_router(analysis.router, prefix='/api/analysis', tags=['Analysis'])
app.include_router(events.router, prefix='/api/events', tags=['Events'])


# Mount static files in production (if frontend build exists)
dist_path = Path(__file__).parent.parent / 'frontend' / 'dist'
if dist_path.exists():
    # Serve SPA - any unmatched route returns index.html
    app.mount('/', StaticFiles(directory=dist_path, html=True), name='static')


@app.get('/health')
async def health_check():
    """Health check endpoint."""
    return {'status': 'ok', 'api_version': '2.0'}


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)
