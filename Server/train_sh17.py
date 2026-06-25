import os
from pathlib import Path
from ultralytics import YOLO

BASE     = Path(__file__).parent
DATA     = BASE / "datasets" / "SH17" / "data.yaml"
OUTPUT   = BASE / "runs" / "sh17_train"
WEIGHTS  = "yolo11s.pt"   

assert DATA.exists(), f"data.yaml não encontrado em {DATA}. Baixe o SH17 em https://zenodo.org/records/12659325"

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

model = YOLO(WEIGHTS)
print(f"[TREINO] Modelo base: {WEIGHTS}")
print(f"[TREINO] Dataset: {DATA}")

results = model.train(
    data=str(DATA),
    project=str(OUTPUT),
    name="episee_sh17",

    imgsz=832,          
    batch=16,           
    rect=True,          

    epochs=150,
    patience=30,        
    warmup_epochs=5,
    cos_lr=True,        
    lr0=0.01,
    lrf=0.005,

    hsv_h=0.015,        
    hsv_s=0.7,
    hsv_v=0.4,
    degrees=10.0,       
    translate=0.1,
    scale=0.6,          
    flipud=0.0,         
    fliplr=0.5,
    mosaic=1.0,         
    mixup=0.15,
    copy_paste=0.3,     
    erasing=0.4,        

    optimizer="AdamW",
    weight_decay=0.0005,
    momentum=0.937,

    box=7.5,
    cls=0.5,
    dfl=1.5,

    device=0,           
    workers=8,
    amp=True,           
    cache=True,         

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

print("\n[TREINO] Rodando validação final...")
val_model = YOLO(str(best))
metrics = val_model.val(data=str(DATA), imgsz=832, conf=0.25, iou=0.6)
print(f"[VAL] mAP50: {metrics.box.map50:.4f}")
print(f"[VAL] mAP50-95: {metrics.box.map:.4f}")
