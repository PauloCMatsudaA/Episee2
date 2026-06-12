
import logging
from typing import Optional

logger = logging.getLogger(__name__)


async def send_noncompliance_alert(
    occurrence_id: int,
    sector_name: str,
    camera_name: str,
    epi_detected: list,
    confidence: float,
    manager_phone: Optional[str] = None,
    manager_email: Optional[str] = None,
) -> dict:
    """
    Envia alerta de não-conformidade ao gestor responsável pelo setor.

    Canais suportados (a implementar conforme integração disponível):
    - WhatsApp: via API do chatbot EPIsee (já implementado separadamente)
    - E-mail: via SMTP ou SendGrid
    - Push notification: via Firebase Cloud Messaging

    Args:
        occurrence_id: ID da ocorrência criada no banco
        sector_name: Nome do setor onde ocorreu a não-conformidade
        camera_name: Nome da câmera que detectou
        epi_detected: Lista de EPIs encontrados na imagem
        confidence: Confiança média das detecções (0.0 - 1.0)
        manager_phone: Número do gestor para WhatsApp (formato: +5511999999999)
        manager_email: E-mail do gestor

    Returns:
        dict com resultado do envio por canal
    """
    message = (
        f" *EPIsee — Alerta de Não-Conformidade*\n\n"
        f" Setor: {sector_name}\n"
        f" Câmera: {camera_name}\n"
        f" EPIs detectados: {', '.join(epi_detected) if epi_detected else 'Nenhum'}\n"
        f" Confiança: {confidence * 100:.1f}%\n"
        f" Ocorrência #{occurrence_id}\n\n"
        f"Acesse o painel para mais detalhes."
    )

    results = {}

    if manager_phone:
        try:
            logger.info(f"[STUB] WhatsApp alert para {manager_phone}: {message}")
            results["whatsapp"] = {"status": "stub", "phone": manager_phone}
        except Exception as e:
            logger.error(f"Falha ao enviar alerta WhatsApp: {e}")
            results["whatsapp"] = {"status": "error", "error": str(e)}

    if manager_email:
        try:
            logger.info(f"[STUB] E-mail alert para {manager_email}")
            results["email"] = {"status": "stub", "email": manager_email}
        except Exception as e:
            logger.error(f"Falha ao enviar e-mail de alerta: {e}")
            results["email"] = {"status": "error", "error": str(e)}

    if not results:
        logger.warning(
            f"Alerta de ocorrência #{occurrence_id} não enviado: "
            "nenhum canal de contato configurado para o gestor"
        )
        results["status"] = "no_channel_configured"

    return results


async def send_epi_request_notification(
    request_id: int,
    worker_name: str,
    epi_type: str,
    sector_name: str,
    manager_phone: Optional[str] = None,
) -> dict:
    """
    Notifica o gestor quando um trabalhador abre uma solicitação de EPI.

    Args:
        request_id: ID da solicitação no banco
        worker_name: Nome do trabalhador solicitante
        epi_type: Tipo de EPI solicitado
        sector_name: Setor do trabalhador
        manager_phone: Número do gestor para WhatsApp
    """
    message = (
        f" *EPIsee — Nova Solicitação de EPI*\n\n"
        f" Trabalhador: {worker_name}\n"
        f" EPI solicitado: {epi_type}\n"
        f" Setor: {sector_name}\n"
        f" Solicitação #{request_id}\n\n"
        f"Acesse o painel para aprovar ou rejeitar."
    )

    if manager_phone:
        logger.info(f"[STUB] WhatsApp request notification para {manager_phone}: {message}")
        return {"whatsapp": {"status": "stub", "phone": manager_phone}}

    return {"status": "no_channel_configured"}
