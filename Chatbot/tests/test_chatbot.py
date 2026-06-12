"""
Testes básicos do chatbot EPIsee.
Execute: pytest tests/ -v

IMPORTANTE: Requer OPENAI_API_KEY configurado no .env para os testes de integração.
"""
import pytest
import json
from pathlib import Path


# ── Testes unitários (sem API) ──────────────────────────────────────────────

def test_nr6_chunks_existem():
    """Verifica se os chunks da NR-6 foram criados corretamente."""
    chunks_path = Path("data/nr6_chunks/nr6_base.json")
    assert chunks_path.exists(), "Arquivo de chunks da NR-6 não encontrado."

    with open(chunks_path, encoding="utf-8") as f:
        chunks = json.load(f)

    assert len(chunks) > 0, "A base de conhecimento está vazia."
    for chunk in chunks:
        assert "id" in chunk, f"Chunk sem 'id': {chunk}"
        assert "titulo" in chunk, f"Chunk sem 'titulo': {chunk}"
        assert "texto" in chunk, f"Chunk sem 'texto': {chunk}"
        assert len(chunk["texto"]) > 50, f"Texto muito curto no chunk '{chunk['id']}'"


def test_config_carrega():
    """Verifica se o arquivo .env.example tem todos os campos necessários."""
    env_example = Path(".env.example").read_text(encoding="utf-8")
    campos_obrigatorios = [
        "OPENAI_API_KEY",
        "WHATSAPP_PHONE_NUMBER_ID",
        "WHATSAPP_ACCESS_TOKEN",
        "WHATSAPP_VERIFY_TOKEN",
    ]
    for campo in campos_obrigatorios:
        assert campo in env_example, f"Campo '{campo}' não encontrado no .env.example"


def test_estrutura_projeto():
    """Verifica se todos os arquivos do projeto estão presentes."""
    arquivos_esperados = [
        "main.py",
        "requirements.txt",
        ".env.example",
        "app/api/webhook.py",
        "app/core/config.py",
        "app/rag/indexer.py",
        "app/rag/retriever.py",
        "app/services/chat_service.py",
        "app/services/audio_service.py",
        "app/services/whatsapp_service.py",
        "data/nr6_chunks/nr6_base.json",
    ]
    for arquivo in arquivos_esperados:
        assert Path(arquivo).exists(), f"Arquivo não encontrado: {arquivo}"



@pytest.mark.integration
def test_indexer_gera_indice(tmp_path, monkeypatch):
    """Testa se o indexer consegue criar o índice FAISS (requer OpenAI API)."""
    pytest.skip("Teste de integração — requer OPENAI_API_KEY válida")


@pytest.mark.integration  
def test_chat_responde_pergunta_epi():
    """Testa uma pergunta real ao chatbot (requer OpenAI API)."""
    pytest.skip("Teste de integração — requer OPENAI_API_KEY válida e índice gerado")
