from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from app.schemas import AlertsPageModel, TimelineModel, TypeSummaryModel
from app.services import analyzer_service

router = APIRouter()


@router.get('/alerts', response_model=AlertsPageModel)
async def get_events(
    level: Optional[List[str]] = Query(None),
    type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    sort_by: str = Query('timestamp', pattern='^(timestamp|level_numeric)$'),
    order: str = Query('desc', pattern='^(asc|desc)$')
):
    """Get paginated and filtered alerts."""
    result = analyzer_service.get_alerts(
        page=page,
        per_page=per_page,
        levels=level,
        type_query=type,
        sort_by=sort_by,
        order=order
    )
    return AlertsPageModel(**result)


@router.get('/summary/timeline', response_model=TimelineModel)
async def get_timeline(bucket: str = Query('hour', pattern='^(hour|day)$')):
    """Get timeline data for charting."""
    result = analyzer_service.get_timeline(bucket=bucket)
    return TimelineModel(**result)


@router.get('/summary/by-type', response_model=TypeSummaryModel)
async def get_type_summary():
    """Get alert type summary."""
    result = analyzer_service.get_type_summary()
    return TypeSummaryModel(**result)
