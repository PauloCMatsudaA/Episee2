from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel

from app.core.deps import get_current_user
from app.core.config import settings
from app.models.user import User

router = APIRouter(prefix="/reports", tags=["Reports"])

def get_ai_client():
    from openai import AsyncOpenAI          
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY não configurada. Adicione ao .env"
        )
    return AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

class ReportPayload(BaseModel):
    conformidade_geral: float = 0.0
    total_ocorrencias: int = 0
    dados_mensais: list = []
    dados_setor: list = []
    epis_ausentes: list = []
    periodo: Optional[str] = "mensal"

class ReportResponse(BaseModel):
    analise: str

@router.post("/generate-analysis", response_model=ReportResponse)
async def generate_analysis(
    payload: ReportPayload,
    current_user: User = Depends(get_current_user),
):
    meses_str = "\n".join(
        f"  - {d.get('mes','?')}: {d.get('taxaConformidade',0)}% "
        f"({d.get('conformes',0)} conformes / {d.get('naoConformes',0)} não conformes)"
        for d in payload.dados_mensais
    ) or "Sem dados mensais disponíveis."

    setores_str = "\n".join(
        f"  - {d.get('setor','?')}: {d.get('conformidade',0)}% "
        f"({d.get('ocorrencias',0)} ocorrências)"
        for d in payload.dados_setor
    ) or "Sem dados por setor disponíveis."

    epis_str = "\n".join(
        f"  - {d.get('epi','?')}: {d.get('ausencias',0)} ausências"
        for d in payload.epis_ausentes[:5]
    ) or "Nenhuma ausência registrada."

    prompt = f"""Você é um especialista em segurança do trabalho. Analise os dados de uso de EPIs e gere um relatório executivo em português, objetivo e profissional.

DADOS DO PERÍODO:
- Conformidade geral: {payload.conformidade_geral}%
- Total de ocorrências: {payload.total_ocorrencias}
- Período: {payload.periodo}

EVOLUÇÃO MENSAL:
{meses_str}

CONFORMIDADE POR SETOR:
{setores_str}

EPIs COM MAIOR ÍNDICE DE AUSÊNCIA:
{epis_str}

INSTRUÇÕES:
1. Inicie com uma conclusão geral (positiva ou de atenção) sobre a conformidade.
2. Destaque setores críticos e os que se saíram melhor.
3. Aponte o EPI mais problemático e sugira uma ação concreta.
4. Analise a tendência com base nos dados mensais.
5. Finalize com até 3 recomendações práticas numeradas.
6. Sem markdown, apenas texto corrido com parágrafos. Máximo 350 palavras."""

    try:
        client_ai = get_ai_client()          
        response = await client_ai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600,
            temperature=0.4,
        )
        analise = response.choices[0].message.content.strip()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Erro ao chamar a IA: {str(e)}")

    return ReportResponse(analise=analise)
