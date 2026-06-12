

import asyncio


async def analyze_frame_stub(camera_id: int, frame_data: bytes) -> dict:

    await asyncio.sleep(0)

    return {
        "status": "stub",
        "message": (
            "Implementação do YOLOv8 pendente. "
            "Consulte as instruções completas em app/services/detection_service.py"
        ),
        "camera_id": camera_id,
        "frame_size_bytes": len(frame_data),
        "detections": [],
        "epi_detected": [],
        "confidence": 0.0,
        "instructions": {
            "step_1": "Prepare o dataset de EPIs com anotações no formato YOLO",
            "step_2": "pip install ultralytics",
            "step_3": "Treine com YOLO('yolov8n.pt').train(data='dataset/data.yaml', epochs=100)",
            "step_4": "Substitua esta função pela implementação na seção 3 do docstring",
            "step_5": "Integre a leitura RTSP usando OpenCV (seção 4 do docstring)",
        },
    }
