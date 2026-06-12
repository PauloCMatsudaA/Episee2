# EPIsee Chatbot — Guia Completo de Configuração e Deploy

## Visão Geral da Arquitetura

```
WhatsApp do Trabalhador
        ↓
Meta WhatsApp Cloud API
        ↓
  [Webhook POST /api/v1/webhook]
        ↓
  FastAPI (Python)
    ├── Tipo texto → direto para o chatbot
    └── Tipo áudio → Whisper (STT) → texto → chatbot
        ↓
  RAG: embedding da pergunta → busca FAISS → trechos NR-6
        ↓
  GPT-4o (system prompt + RAG context + histórico)
        ↓
  Resposta de texto → WhatsApp Cloud API → Trabalhador
```

---

## Pré-requisitos

- Python 3.11+
- Conta no [Meta for Developers](https://developers.facebook.com)
- Chave da API OpenAI com acesso a GPT-4o e Whisper
- URL pública para o webhook (ngrok em desenvolvimento / servidor em produção)

---

## Passo 1 — Instalar dependências

```bash
cd episee-chatbot
python -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

pip install -r requirements.txt
```

---

## Passo 2 — Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` com seus valores reais:

```env
OPENAI_API_KEY=sk-proj-...          # Sua chave OpenAI
WHATSAPP_PHONE_NUMBER_ID=1234...    # Vem do painel Meta
WHATSAPP_ACCESS_TOKEN=EAAxxxx       # Token permanente da Meta
WHATSAPP_VERIFY_TOKEN=episee_seguro # Qualquer string — você define
```

---

## Passo 3 — Gerar o índice RAG da NR-6

Este passo só precisa ser executado uma vez (ou quando adicionar novos documentos):

```bash
python -m app.rag.indexer
```

Saída esperada:
```
Carregando chunks da NR-6...
  → 15 chunks encontrados.
Gerando embeddings via OpenAI...
  → Embeddings gerados: shape (15, 1536)
Índice salvo em: data/faiss_index.bin
Metadados salvos em: data/faiss_index.meta.pkl
Indexação concluída.
```

Para adicionar mais conteúdo à base de conhecimento, edite ou adicione arquivos JSON em
`data/nr6_chunks/` seguindo o mesmo formato (lista de objetos com `id`, `titulo`, `texto`),
e execute o indexador novamente.

---

## Passo 4 — Iniciar o servidor

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Teste se está rodando:
```
GET http://localhost:8000/
→ {"status": "online", "service": "EPIsee Chatbot"}
```

---

## Passo 5 — Configurar o Webhook no Meta for Developers

### 5.1 — Expor o servidor localmente (desenvolvimento)

Use o **ngrok** para criar uma URL pública temporária:

```bash
# Instale: https://ngrok.com/download
ngrok http 8000
```

Anote a URL gerada, ex: `https://abc123.ngrok.io`

### 5.2 — Criar aplicativo no Meta for Developers

1. Acesse [developers.facebook.com](https://developers.facebook.com)
2. Crie um novo app → tipo **Business**
3. Adicione o produto **WhatsApp**
4. Em **WhatsApp > Configuração**:
   - Copie o **Phone Number ID** → coloque no `.env`
   - Gere um **Token de Acesso Temporário** (para testes) ou permanente → coloque no `.env`

### 5.3 — Registrar o Webhook

Em **WhatsApp > Configuração > Webhooks**:

| Campo | Valor |
|-------|-------|
| URL do Callback | `https://abc123.ngrok.io/api/v1/webhook` |
| Token de Verificação | O mesmo valor de `WHATSAPP_VERIFY_TOKEN` do `.env` |

Clique em **Verificar e Salvar**.

### 5.4 — Inscrever nos eventos

Ative a assinatura do campo:
- ✅ `messages`

---

## Passo 6 — Testar

1. No painel da Meta, há um número de teste gratuito para sandbox
2. Envie uma mensagem para o número de teste a partir do WhatsApp pessoal
3. Verifique os logs do servidor:

```
2026-03-25 [INFO] Processando pergunta de 5541999... 'Qual EPI é necessário para trabalho em altura?'
2026-03-25 [INFO] Resposta enviada para 5541999...
```

**Comandos para testar no WhatsApp:**
- `/ajuda` — exibe o menu de ajuda
- `/reiniciar` — limpa o histórico da conversa
- Envie um áudio perguntando sobre EPIs

---

## Deploy em Produção (Railway / Render / VPS)

### Opção A — Railway (mais fácil, gratuito para começar)

```bash
# Instale o CLI do Railway
npm install -g @railway/cli

railway login
railway init
railway up
```

Adicione as variáveis de ambiente pelo painel do Railway e atualize a URL do webhook
no Meta for Developers para a URL permanente gerada pelo Railway.

### Opção B — Render

1. Crie conta em [render.com](https://render.com)
2. Novo serviço → **Web Service** → conecte o repositório GitHub
3. Build Command: `pip install -r requirements.txt && python -m app.rag.indexer`
4. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Adicione as variáveis de ambiente pelo painel

### Opção C — VPS (Ubuntu)

```bash
# Instalar dependências
sudo apt update && sudo apt install python3.11 python3-pip nginx certbot -y

# Clonar projeto e instalar
git clone <seu-repo> /opt/episee-chatbot
cd /opt/episee-chatbot
pip install -r requirements.txt
python -m app.rag.indexer

# Criar serviço systemd
sudo nano /etc/systemd/system/episee-chatbot.service
```

Conteúdo do serviço:
```ini
[Unit]
Description=EPIsee Chatbot
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/opt/episee-chatbot
ExecStart=/usr/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
EnvironmentFile=/opt/episee-chatbot/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable episee-chatbot
sudo systemctl start episee-chatbot
```

Configure o Nginx como proxy reverso com SSL (HTTPS obrigatório para o webhook da Meta).

---

## Expandindo a Base de Conhecimento

Para adicionar novos documentos além da NR-6:

1. Crie um arquivo JSON em `data/nr6_chunks/` (ex: `politica_interna.json`)
2. Siga o formato:
```json
[
  {
    "id": "politica_uso_epi_empresa",
    "titulo": "Política Interna de EPIs — Empresa XYZ",
    "texto": "Todo funcionário deve assinar a ficha de EPI ao ingressar..."
  }
]
```
3. Execute `python -m app.rag.indexer` novamente

---

## Integração com o Backend FastAPI do EPIsee

O chatbot é um microserviço independente. Para integrá-lo ao backend principal:

- O backend principal pode chamar `POST /api/v1/webhook` internamente, ou
- Compartilhar o banco de dados para que o chatbot acesse registros de conformidade
  e responda perguntas como "Quantas vezes fui registrado sem EPI esta semana?"

---

## Estrutura do Projeto

```
episee-chatbot/
├── main.py                        # Entry point FastAPI
├── requirements.txt
├── .env.example
├── GUIA_DEPLOY.md
├── app/
│   ├── api/
│   │   └── webhook.py             # Recebe e processa mensagens do WhatsApp
│   ├── core/
│   │   └── config.py              # Configurações via variáveis de ambiente
│   ├── rag/
│   │   ├── indexer.py             # Gera o índice FAISS (executar 1x)
│   │   └── retriever.py           # Busca semântica nos documentos
│   └── services/
│       ├── chat_service.py        # Lógica GPT-4o + histórico por usuário
│       ├── audio_service.py       # STT (Whisper) + TTS
│       └── whatsapp_service.py    # Envio de mensagens via Meta API
└── data/
    ├── nr6_chunks/
    │   └── nr6_base.json          # Base de conhecimento da NR-6
    ├── faiss_index.bin            # Gerado pelo indexer.py
    └── faiss_index.meta.pkl       # Metadados do índice
```
