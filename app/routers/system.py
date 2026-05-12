from fastapi import APIRouter
from app.schemas import SystemInfoModel
from app.services import analyzer_service

router = APIRouter()


@router.get('/info', response_model=SystemInfoModel)
async def get_system_info():
    info = analyzer_service.get_system_info()
    return SystemInfoModel(**info)
