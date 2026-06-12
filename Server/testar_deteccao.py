"""
Roda a detecção num vídeo ou imagem e imprime o resultado no terminal.
Uso: python testar_deteccao.py [caminho_video_ou_imagem]
"""
import sys
import cv2
from ultralytics import YOLO

MODEL_PATH = "best.pt"
FONTE = sys.argv[1] if len(sys.argv) > 1 else "teste.mp4"
CONF = 0.3

model = YOLO(MODEL_PATH)
print(f"\n✅ Modelo carregado. Classes disponíveis:")
for idx, nome in model.names.items():
    print(f"   [{idx}] {nome}")

cap = cv2.VideoCapture(FONTE)
if not cap.isOpened():
    print(f"\n❌ Não foi possível abrir: {FONTE}")
    sys.exit(1)

total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
fps = cap.get(cv2.CAP_PROP_FPS)
print(f"\n🎥 Vídeo: {FONTE} | {total_frames} frames | {fps:.1f} FPS")
print("-" * 50)

frame_n = 0
while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame_n += 1
    if frame_n % 30 != 0:   # analisa 1 frame por segundo
        continue

    results = model(frame, conf=CONF, verbose=False)
    deteccoes = []
    for r in results:
        for box in r.boxes:
            deteccoes.append(f"{model.names[int(box.cls)]}({float(box.conf):.2f})")

    if deteccoes:
        print(f"Frame {frame_n:04d}: {', '.join(deteccoes)}")
    else:
        print(f"Frame {frame_n:04d}: (nada detectado)")

cap.release()
print("\nFim da análise.")
