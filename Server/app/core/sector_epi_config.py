# sector_epi_config.py
# Mapeamento: sector_id → conjunto de EPIs obrigatórios para aquele setor
# Os nomes devem corresponder exatamente às classes do modelo YOLO (best.pt)

# Classes disponíveis no modelo:
# "glasses", "face-mask-medical", "face-guard", "earmuffs",
# "gloves", "safety-vest", "helmet", "medical-suit", "safety-suit"

EPIS_POR_SETOR: dict[int, set[str]] = {
    1: {"helmet", "safety-vest", "glasses"},     
    2: {"helmet", "gloves", "safety-vest"},        
    3: {"safety-vest", "glasses"},                 
    4: {"safety-vest", "helmet"},                   
}

EPIS_OBRIGATORIOS_PADRAO: set[str] = {"safety-vest"}


def get_epis_obrigatorios(sector_id: int | None) -> set[str]:
    if sector_id is None:
        return EPIS_OBRIGATORIOS_PADRAO
    return EPIS_POR_SETOR.get(sector_id, EPIS_OBRIGATORIOS_PADRAO)