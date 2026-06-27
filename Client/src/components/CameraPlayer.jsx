import { useEffect, useRef, useState } from "react";
import Hls from "hls.js/dist/hls.min.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function buildSrc(baseUrl) {
  return `${API_BASE}${baseUrl}?t=${Date.now()}`;
}

export default function CameraPlayer({ hlsUrl }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [streamDisponivel, setStreamDisponivel] = useState(null);

  useEffect(() => {
    if (!hlsUrl) {
      setStreamDisponivel(false);
      return;
    }

    const src = buildSrc(hlsUrl);

    const controller = new AbortController();
    fetch(src, { method: "GET", signal: controller.signal })
      .then((res) => {
        setStreamDisponivel(res.ok);
        res.body?.cancel();
      })
      .catch(() => {
        setStreamDisponivel(false);
      });
    return () => controller.abort();
  }, [hlsUrl]);

  useEffect(() => {
    if (!streamDisponivel) return;

    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const src = buildSrc(hlsUrl);

    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        manifestLoadingMaxRetry: 6,
        manifestLoadingRetryDelay: 500,
        startPosition: -1,
      });

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.loadSource(buildSrc(hlsUrl));
            hls.startLoad();
          } else {
            hls.destroy();
            setStreamDisponivel(false);
          }
        }
      });

      hlsRef.current = hls;
      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.play().catch(() => {});
    }
  }, [streamDisponivel, hlsUrl]);

  if (!hlsUrl || streamDisponivel === false) {
    return (
      <div
        style={{
          width: "100%",
          aspectRatio: "16/9",
          background: "#111",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ff4444",
          fontSize: "13px",
          fontWeight: 500,
          textAlign: "center",
          padding: "16px",
        }}
      >
        Stream não disponível. Verifique se a câmera está ativa.
      </div>
    );
  }

  if (streamDisponivel === null) {
    return (
      <div
        style={{
          width: "100%",
          aspectRatio: "16/9",
          background: "#111",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#aaa",
          fontSize: "13px",
        }}
      >
        Conectando ao stream...
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      controls
      autoPlay
      muted
      playsInline
      style={{ width: "100%", borderRadius: "8px", background: "#000" }}
    />
  );
}
