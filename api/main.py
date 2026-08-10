"""
FastAPI application main module. Re-exports the application from api.index for backwards compatibility.
"""
from api.index import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
