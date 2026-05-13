from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel

from app.services.wazuh_api_service import wazuh_api_service

router = APIRouter()


# ------------------------------------------------------------------
# Config models
# ------------------------------------------------------------------

class WazuhConfigUpdate(BaseModel):
    host: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    verify_ssl: Optional[bool] = None


class ActiveResponseRequest(BaseModel):
    agent_id: str
    command_key: str
    arguments: Optional[List[str]] = None


# ------------------------------------------------------------------
# Status & Config
# ------------------------------------------------------------------

@router.get('/status')
async def get_status():
    available = wazuh_api_service.is_available()
    return {
        'available': available,
        'url': wazuh_api_service.base_url,
        'host': wazuh_api_service.host,
        'port': wazuh_api_service.port,
    }


@router.get('/config')
async def get_config():
    return wazuh_api_service.get_config()


@router.put('/config')
async def update_config(cfg: WazuhConfigUpdate):
    updates = cfg.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail='No fields to update')
    wazuh_api_service.save_config(updates)
    return {'saved': True, 'url': wazuh_api_service.base_url}


# ------------------------------------------------------------------
# Agents
# ------------------------------------------------------------------

@router.get('/agents')
async def get_agents(status: Optional[str] = Query(None)):
    if not wazuh_api_service.is_available():
        raise HTTPException(status_code=503, detail='Wazuh API unavailable')
    agents = wazuh_api_service.get_agents(status=status)
    return {'agents': agents, 'total': len(agents)}


@router.get('/agents/{agent_id}')
async def get_agent(agent_id: str):
    if not wazuh_api_service.is_available():
        raise HTTPException(status_code=503, detail='Wazuh API unavailable')
    agent = wazuh_api_service.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail='Agent not found')
    return agent


# ------------------------------------------------------------------
# Vulnerabilities
# ------------------------------------------------------------------

@router.get('/agents/{agent_id}/vulnerabilities')
async def get_vulnerabilities(
    agent_id: str,
    severity: Optional[str] = Query(None),
):
    if not wazuh_api_service.is_available():
        raise HTTPException(status_code=503, detail='Wazuh API unavailable')
    vulns = wazuh_api_service.get_vulnerabilities(agent_id, severity=severity)
    summary = wazuh_api_service.get_vulnerability_summary(agent_id)
    return {'vulnerabilities': vulns, 'summary': summary, 'total': len(vulns)}


# ------------------------------------------------------------------
# Compliance (SCA)
# ------------------------------------------------------------------

@router.get('/agents/{agent_id}/compliance')
async def get_compliance(agent_id: str):
    if not wazuh_api_service.is_available():
        raise HTTPException(status_code=503, detail='Wazuh API unavailable')
    policies = wazuh_api_service.get_sca_policies(agent_id)
    return {'policies': policies, 'total': len(policies)}


@router.get('/agents/{agent_id}/compliance/{policy_id}')
async def get_compliance_checks(agent_id: str, policy_id: str):
    if not wazuh_api_service.is_available():
        raise HTTPException(status_code=503, detail='Wazuh API unavailable')
    checks = wazuh_api_service.get_sca_checks(agent_id, policy_id)
    passed = sum(1 for c in checks if c.get('result') == 'passed')
    failed = sum(1 for c in checks if c.get('result') == 'failed')
    return {'checks': checks, 'passed': passed, 'failed': failed, 'total': len(checks)}


# ------------------------------------------------------------------
# Active Response
# ------------------------------------------------------------------

@router.post('/active-response')
async def trigger_active_response(req: ActiveResponseRequest):
    if not wazuh_api_service.is_available():
        raise HTTPException(status_code=503, detail='Wazuh API unavailable')
    result = wazuh_api_service.trigger_active_response(
        agent_id=req.agent_id,
        command_key=req.command_key,
        arguments=req.arguments,
    )
    if not result['success']:
        raise HTTPException(status_code=500, detail=result.get('error', 'Failed'))
    return result


# ------------------------------------------------------------------
# Alerts
# ------------------------------------------------------------------

@router.get('/alerts')
async def get_wazuh_alerts(
    limit: int = Query(100, ge=1, le=500),
    level: Optional[int] = Query(None),
):
    if not wazuh_api_service.is_available():
        raise HTTPException(status_code=503, detail='Wazuh API unavailable')
    alerts = wazuh_api_service.get_alerts(limit=limit, level=level)
    return {'alerts': alerts, 'total': len(alerts)}
