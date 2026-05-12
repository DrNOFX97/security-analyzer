import asyncio
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
import json

from app.schemas import (
    AnalysisRunRequest, AnalysisRunResponse,
    AnalysisResultModel, ProgressEvent
)
from app.services import analyzer_service

router = APIRouter()

# In-memory job tracking
_jobs = {}  # job_id -> {"events": [...], "complete": bool, "error": str}


def _create_progress_callback(job_id: str):
    def callback(stage: str, channel: str = None, detector: str = None,
                 count: int = None, pct: int = 0):
        if job_id not in _jobs:
            _jobs[job_id] = {'events': [], 'complete': False, 'error': None}

        event = {
            'stage': stage,
            'channel': channel,
            'detector': detector,
            'count': count,
            'pct': pct
        }
        _jobs[job_id]['events'].append(event)

    return callback


def _run_analysis_sync(job_id: str, source: str, csv_path: str, hours: int):
    """Synchronous analysis function to run in executor."""
    try:
        callback = _create_progress_callback(job_id)

        result = analyzer_service.run_analysis_sync(
            source=source,
            csv_path=csv_path,
            hours=hours,
            progress_callback=callback
        )

        if job_id not in _jobs:
            _jobs[job_id] = {'events': [], 'complete': False, 'error': None}

        _jobs[job_id]['result'] = result
        _jobs[job_id]['complete'] = True

    except PermissionError as e:
        if job_id not in _jobs:
            _jobs[job_id] = {'events': [], 'complete': False, 'error': None}
        _jobs[job_id]['error'] = f'Permission denied: {str(e)}'
        _jobs[job_id]['complete'] = True

    except Exception as e:
        if job_id not in _jobs:
            _jobs[job_id] = {'events': [], 'complete': False, 'error': None}
        _jobs[job_id]['error'] = str(e)
        _jobs[job_id]['complete'] = True


@router.post('/run', response_model=AnalysisRunResponse)
async def start_analysis(request: AnalysisRunRequest, background_tasks: BackgroundTasks):
    """Start a new analysis job and return job_id immediately."""
    job_id = str(uuid.uuid4())

    # Validate eventlog requirement
    if request.source == 'eventlog' and not analyzer_service._is_admin():
        raise HTTPException(
            status_code=403,
            detail='Event Log reading requires Administrator privileges on Windows.'
        )

    # Create job entry
    _jobs[job_id] = {'events': [], 'complete': False, 'error': None}

    # Schedule analysis in background (via executor to avoid blocking)
    loop = asyncio.get_event_loop()
    loop.run_in_executor(
        None,
        _run_analysis_sync,
        job_id,
        request.source,
        request.csv_path,
        request.hours
    )

    return AnalysisRunResponse(
        job_id=job_id,
        started_at=datetime.now().isoformat()
    )


@router.get('/stream/{job_id}')
async def stream_analysis(job_id: str):
    """SSE stream for analysis progress."""
    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail='Job not found')

    async def event_generator():
        sent_events = 0

        while True:
            job = _jobs.get(job_id)
            if not job:
                break

            # Send new progress events
            new_events = job['events'][sent_events:]
            for event in new_events:
                data = json.dumps({k: v for k, v in event.items() if v is not None})
                yield f'event: progress\ndata: {data}\n\n'
                sent_events += 1

            # Check if complete
            if job['complete']:
                if job.get('error'):
                    error_data = json.dumps({'message': job['error'], 'stage': 'error'})
                    yield f'event: error\ndata: {error_data}\n\n'
                elif job.get('result'):
                    result = job['result']
                    complete_data = json.dumps({
                        'summary': result.summary.model_dump(),
                        'alerts': [a.model_dump() for a in result.alerts],
                        'duration_seconds': result.duration_seconds
                    })
                    yield f'event: complete\ndata: {complete_data}\n\n'

                break

            await asyncio.sleep(0.1)

    return StreamingResponse(event_generator(), media_type='text/event-stream')


@router.get('/latest', response_model=AnalysisResultModel)
async def get_latest_analysis():
    """Get the latest analysis result."""
    result = analyzer_service.get_latest_result()
    if not result:
        raise HTTPException(status_code=404, detail='No analysis has been run yet.')
    return result
