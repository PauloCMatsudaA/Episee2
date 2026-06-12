"""
Treino do modelo EPIsee com o dataset SH17.

Executar da pasta Server/:
    python train_sh17.py

Pré-requisitos:
    pip install ultralytics albumentations opencv-python
    Download do SH17: https://zenodo.org/records/12659325
    Extraia em:  Server/datasets/SH17/

Estrutura esperada:
    datasets/SH17/
        images/train/
        images/val/
        labels/train/
        labels/val/
        data.yaml
"""

import os
from pathlib import Path
from ultralytics import YOLO

# ── Paths ────────────────────────────────────────────────────────────────────
BASE     = Path(__file__).parent
DATA     = BASE / "datasets" / "SH17" / "data.yaml"
OUTPUT   = BASE / "runs" / "sh17_train"
WEIGHTS  = "yolo11s.pt"   # ponto de partida: yolo11s (bom balanço velocidade/precisão)
# Opções:  yolo11n.pt (mais leve/rápido)  |  yolo11m.pt (mais pesado/preciso)

assert DATA.exists(), f"data.yaml não encontrado em {DATA}. Baixe o SH17 em https://zenodo.org/records/12659325"

# ── data.yaml (gerado automaticamente se não existir) ────────────────────────
# O SH17 já traz o data.yaml mas, se não tiver, usamos este:
DEFAULT_YAML = """
path: ./datasets/SH17
train: images/train
val:   images/val

nc: 17
names:
  0: person
  1: head
  2: face
  3: glasses
  4: face-mask-medical
  5: face-guard
  6: ear
  7: earmuffs
  8: hands
  9: gloves
  10: foot
  11: shoes
  12: safety-vest
  13: belt
  14: helmet
  15: medical-suit
  16: safety-suit
"""

if not DATA.exists():
    DATA.write_text(DEFAULT_YAML)
    print(f"[TREINO] data.yaml gerado em {DATA}")

# ── Modelo base ─────────────────────────────────────────────────────────────
model = YOLO(WEIGHTS)
print(f"[TREINO] Modelo base: {WEIGHTS}")
print(f"[TREINO] Dataset: {DATA}")

# ── Treino ───────────────────────────────────────────────────────────────────
results = model.train(
    data=str(DATA),
    project=str(OUTPUT),
    name="episee_sh17",

    # ── Imagem e batch ──────────────────────────────────────────────────────
    imgsz=832,          # 832 dá boa precisão para objetos pequenos (capacete distante)
    batch=16,           # reduza para 8 se der OOM
    rect=True,          # batches com aspect-ratio similar → menos padding, + rápido

    # ── Épocas e scheduler ─────────────────────────────────────────────────
    epochs=150,
    patience=30,        # early stopping: para se não melhorar em 30 épocas
    warmup_epochs=5,
    cos_lr=True,        # cosine LR decay → converge melhor
    lr0=0.01,
    lrf=0.005,

    # ── Augmentations que ajudam no seu caso ────────────────────────────────
    hsv_h=0.015,        # variação de matiz (iluminação industrial)
    hsv_s=0.7,
    hsv_v=0.4,
    degrees=10.0,       # rotação leve — capacete pode aparecer inclinado
    translate=0.1,
    scale=0.6,          # scale jitter grande → aprende capacete pequeno/grande
    flipud=0.0,         # pessoa de cabeça pra baixo não faz sentido
    fliplr=0.5,
    mosaic=1.0,         # mosaic: crucial para objetos pequenos (head, ear)
    mixup=0.15,
    copy_paste=0.3,     # copia instâncias entre imagens → ajuda classes raras
    erasing=0.4,        # random erasing → simula oclusão (capacete na mão!)

    # ── Otimizador ──────────────────────────────────────────────────────────
    optimizer="AdamW",
    weight_decay=0.0005,
    momentum=0.937,

    # ── Conf e IoU para treino ──────────────────────────────────────────────
    box=7.5,
    cls=0.5,
    dfl=1.5,

    # ── Hardware ────────────────────────────────────────────────────────────
    device=0,           # GPU 0; use 'cpu' se não tiver GPU
    workers=8,
    amp=True,           # mixed precision fp16: + rápido, - VRAM
    cache=True,         # cacheia imagens em RAM: treino muito mais rápido

    # ── Checkpoints e saída ─────────────────────────────────────────────────
    save=True,
    save_period=25,
    exist_ok=True,
    plots=True,
    verbose=True,
)

print(f"\n[TREINO] Concluído!")
best = Path(str(OUTPUT)) / "episee_sh17" / "weights" / "best.pt"
print(f"[TREINO] Melhor modelo salvo em: {best}")
print(f"[TREINO] Copie para Server/best.pt para usar na detecção:")
print(f"         cp {best} {BASE / 'best.pt'}")

# ── Validação final ──────────────────────────────────────────────────────────
print("\n[TREINO] Rodando validação final...")
val_model = YOLO(str(best))
metrics = val_model.val(data=str(DATA), imgsz=832, conf=0.25, iou=0.6)
print(f"[VAL] mAP50: {metrics.box.map50:.4f}")
print(f"[VAL] mAP50-95: {metrics.box.map:.4f}")
