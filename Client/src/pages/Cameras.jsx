import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  Plus,
  Pencil,
  Trash2,
  Play,
  Square,
  Wifi,
  WifiOff,
} from "lucide-react";
import { camerasApi, setoresApi } from "../api/api";
import CameraPlayer from "../components/CameraPlayer";
import LoadingSpinner from "../components/LoadingSpinner";
import "../styles/Cameras.css";

const cameraInicial = {
  name: "",
  location: "",
  rtsp_url: "",
  sector_id: "",
  is_active: true,
};

function extrairErro(error, fallback = "Operação falhou.") {
  const detail = error.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((e) => e.msg).join(", ");
  if (typeof detail === "string") return detail;
  return fallback;
}

export default function Cameras() {
  const [cameras, setCameras] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [cameraEditando, setCameraEditando] = useState(null);
  const [form, setForm] = useState(cameraInicial);

  const [busca, setBusca] = useState("");
  const [somenteAtivas, setSomenteAtivas] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setCarregando(true);
    setErro("");
    try {
      const [camsRes, sectorsRes] = await Promise.all([
        camerasApi.listar(),
        setoresApi.listar(),
      ]);
      setCameras(camsRes.data || []);
      setSectors(sectorsRes.data || []);
    } catch (error) {
      setErro(extrairErro(error, "Não foi possível carregar as câmeras."));
    } finally {
      setCarregando(false);
    }
  }

  function abrirNovaCamera() {
    setCameraEditando(null);
    setForm(cameraInicial);
    setModalAberto(true);
  }

  function abrirEdicao(camera) {
    setCameraEditando(camera);
    setForm({
      name: camera.name || "",
      location: camera.location || "",
      rtsp_url: camera.rtsp_url || "",
      sector_id: camera.sector_id || "",
      is_active: camera.is_active ?? true,
    });
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setCameraEditando(null);
    setForm(cameraInicial);
  }

  function atualizarCampo(event) {
    const { name, value, type, checked } = event.target;
    setForm((anterior) => ({
      ...anterior,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function salvarCamera(event) {
    event.preventDefault();
    setSalvando(true);
    setErro("");

    const payload = {
      name: form.name,
      location: form.location || null,
      rtsp_url: form.rtsp_url || null,
      sector_id: form.sector_id ? Number(form.sector_id) : null,
      is_active: form.is_active,
    };

    try {
      if (cameraEditando) {
        await camerasApi.editar(cameraEditando.id, payload);
      } else {
        await camerasApi.criar(payload);
      }
      fecharModal();
      await carregarDados();
    } catch (error) {
      setErro(extrairErro(error, "Não foi possível salvar a câmera."));
    } finally {
      setSalvando(false);
    }
  }

  async function excluirCamera(cameraId) {
    const confirmou = window.confirm(
      "Tem certeza que deseja excluir esta câmera?",
    );
    if (!confirmou) return;
    try {
      await camerasApi.excluir(cameraId);
      await carregarDados();
    } catch (error) {
      setErro(extrairErro(error, "Não foi possível excluir a câmera."));
    }
  }

  async function iniciarDeteccao(cameraId) {
    try {
      await camerasApi.iniciarDeteccao(cameraId);
      await carregarDados();
    } catch (error) {
      setErro(extrairErro(error, "Não foi possível iniciar a detecção."));
    }
  }

  async function pararDeteccao(cameraId) {
    try {
      await camerasApi.pararDeteccao(cameraId);
      await carregarDados();
    } catch (error) {
      setErro(extrairErro(error, "Não foi possível parar a detecção."));
    }
  }

  const camerasFiltradas = useMemo(() => {
    return cameras.filter((camera) => {
      const texto = busca.toLowerCase();
      const combinaBusca =
        camera.name?.toLowerCase().includes(texto) ||
        camera.location?.toLowerCase().includes(texto) ||
        camera.sector?.name?.toLowerCase().includes(texto);
      const combinaAtiva = !somenteAtivas || camera.is_active;
      return combinaBusca && combinaAtiva;
    });
  }, [cameras, busca, somenteAtivas]);

  if (carregando) {
    return (
      <div className="page">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="page cameras-page page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Câmeras</h1>
        </div>
        <button className="btn btn-primary" onClick={abrirNovaCamera}>
          <Plus size={16} />
          Nova câmera
        </button>
      </div>

      {erro && (
        <div className="alert alert-err">
          <span>{erro}</span>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <div className="cameras-toolbar">
            <div className="field cameras-search">
              <label className="label" htmlFor="busca-camera">
                Buscar
              </label>
              <input
                id="busca-camera"
                className="input"
                type="text"
                placeholder="Buscar por nome, local ou setor"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <label className="cameras-checkbox">
              <input
                type="checkbox"
                checked={somenteAtivas}
                onChange={(e) => setSomenteAtivas(e.target.checked)}
              />
              <span>Mostrar somente câmeras ativas</span>
            </label>
          </div>
        </div>
      </div>

      {camerasFiltradas.length === 0 ? (
        <div className="card">
          <div className="card-body cameras-empty">
            <Camera size={36} />
            <h3 className="section-title">Nenhuma câmera encontrada</h3>
            <p className="section-sub">
              Cadastre uma nova câmera ou ajuste os filtros de busca.
            </p>
          </div>
        </div>
      ) : (
        <div className="cameras-grid">
          {camerasFiltradas.map((camera) => {
            const online = camera.is_active;
            const emDeteccao =
              camera.detection_active ?? camera.detecting ?? false;

            return (
              <div key={camera.id} className="card camera-card">
                <div className="camera-preview">
                  <CameraPlayer
                    key={`cam-${camera.id}-${camera.created_at}`}
                    hlsUrl={`/hls/${camera.id}/index.m3u8`}
                    cameraId={camera.id}
                  />
                </div>

                <div className="card-body">
                  <div className="camera-card-header">
                    <div>
                      <h3 className="camera-card-title">{camera.name}</h3>
                      <p className="camera-card-location">
                        {camera.location || "Sem localização"}
                      </p>
                    </div>
                    <div
                      className={online ? "badge badge-ok" : "badge badge-gray"}
                    >
                      {online ? (
                        <>
                          <Wifi size={12} />
                          Ativa
                        </>
                      ) : (
                        <>
                          <WifiOff size={12} />
                          Inativa
                        </>
                      )}
                    </div>
                  </div>

                  <div className="camera-meta">
                    <div className="camera-meta-item">
                      <span className="camera-meta-label">Setor</span>
                      <span className="camera-meta-value">
                        {camera.sector?.name || "Não definido"}
                      </span>
                    </div>
                    <div className="camera-meta-item">
                      <span className="camera-meta-label">RTSP</span>
                      <span className="camera-meta-value camera-rtsp">
                        {camera.rtsp_url || "Não informado"}
                      </span>
                    </div>
                  </div>

                  <div className="camera-actions">
                    {emDeteccao ? (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => pararDeteccao(camera.id)}
                      >
                        <Square size={14} />
                        Parar detecção
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => iniciarDeteccao(camera.id)}
                      >
                        <Play size={14} />
                        Iniciar
                      </button>
                    )}
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => abrirEdicao(camera)}
                    >
                      <Pencil size={14} />
                      Editar
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => excluirCamera(camera.id)}
                    >
                      <Trash2 size={14} />
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalAberto && (
        <div className="overlay" onClick={fecharModal}>
          <div
            className="modal modal-lg fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">
                {cameraEditando ? "Editar câmera" : "Nova câmera"}
              </h2>
            </div>

            <form onSubmit={salvarCamera} className="cameras-form">
              <div className="field">
                <label className="label" htmlFor="name">
                  Nome
                </label>
                <input
                  id="name"
                  name="name"
                  className="input"
                  value={form.name}
                  onChange={atualizarCampo}
                  placeholder="Ex.: Portão principal"
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="location">
                  Localização
                </label>
                <input
                  id="location"
                  name="location"
                  className="input"
                  value={form.location}
                  onChange={atualizarCampo}
                  placeholder="Ex.: Entrada do almoxarifado"
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="rtsp_url">
                  URL RTSP
                </label>
                <input
                  id="rtsp_url"
                  name="rtsp_url"
                  className="input"
                  value={form.rtsp_url}
                  onChange={atualizarCampo}
                  placeholder="rtsp://usuario:senha@ip:554/stream1"
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="sector_id">
                  Setor
                </label>
                <select
                  id="sector_id"
                  name="sector_id"
                  className="input select"
                  value={form.sector_id}
                  onChange={atualizarCampo}
                >
                  <option value="">Selecione um setor</option>
                  {sectors.map((sector) => (
                    <option key={sector.id} value={sector.id}>
                      {sector.name}
                    </option>
                  ))}
                </select>
              </div>

              <label className="cameras-checkbox">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={atualizarCampo}
                />
                <span>Câmera ativa</span>
              </label>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={fecharModal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={salvando}
                >
                  {salvando ? "Salvando..." : "Salvar câmera"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
