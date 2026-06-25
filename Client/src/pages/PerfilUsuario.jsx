import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Shield,
  Building2,
  Phone,
  Calendar,
  Camera,
  Check,
  Save,
  ChevronLeft,
  LogOut,
  Send,
  Link,
  Unlink,
  Copy,
} from "lucide-react";
import api from "../api/api";

const estatisticasUsuario = [
  { rotulo: "Ocorrências revisadas", valor: "247", icone: Shield },
  { rotulo: "Solicitações aprovadas", valor: "38", icone: Check },
  { rotulo: "Câmeras gerenciadas", valor: "8", icone: Camera },
  { rotulo: "Dias no sistema", valor: "142", icone: Calendar },
];

export default function PerfilUsuario() {
  const { usuario, sair } = useAuth();
  const navegar = useNavigate();

  const nomeCompleto = usuario?.nome || usuario?.name || "Usuário";
  const emailUsuario = usuario?.email || "admin@episee.com";
  const cargoUsuario = usuario?.cargo || usuario?.role || "Gestor";
  const inicialNome = nomeCompleto.charAt(0).toUpperCase();

  const [nomeEdit, setNomeEdit] = useState(nomeCompleto);
  const [setor, setSetor] = useState(usuario?.setor || "Produção Geral");
  const [editSalvo, setEditSalvo] = useState(false);

  const [tgVinculado, setTgVinculado] = useState(false); 
  const [tgCodigo, setTgCodigo] = useState(null); 
  const [tgCarregando, setTgCarregando] = useState(false);
  const [tgCopiado, setTgCopiado] = useState(false);
  const [tgErro, setTgErro] = useState("");
  const [telefone, setTelefone] = useState('');

  useEffect(() => {
  api.get('/api/telegram/status')
    .then(({ data }) => setTgVinculado(data.vinculado))
    .catch(() => setTgVinculado(false));
}, []);
useEffect(() => {
  api.get(`/api/users/${usuario?.id}`)
    .then(({ data }) => {
      setTelefone(data.phone || '');
    })
    .catch(() => {});
}, [usuario?.id]);
async function salvar() {
  try {
    await api.patch(`/api/users/${usuario.id}`, { name: nomeEdit, phone: telefone });
    setEditSalvo(true);
    setTimeout(() => setEditSalvo(false), 2000);
  } catch {
    alert('Erro ao salvar perfil.');
  }
}

  function sairENavegar() {
    sair();
    navegar("/login", { replace: true });
  }

  async function gerarCodigoTelegram() {
    setTgCarregando(true);
    setTgErro("");
    try {
      const { data } = await api.post("/api/telegram/gerar-codigo");
      setTgCodigo(data);
    } catch (e) {
      setTgErro("Erro ao gerar código. Tente novamente.");
    } finally {
      setTgCarregando(false);
    }
  }

  function copiarComando() {
    navigator.clipboard.writeText(`/vincular ${tgCodigo.codigo}`);
    setTgCopiado(true);
    setTimeout(() => setTgCopiado(false), 2000);
  }

  return (
    <div className="pg">
      <button
        onClick={() => navegar(-1)}
        className="btn btn-ghost btn-sm w-fit"
      >
        <ChevronLeft size={16} /> Voltar
      </button>

      {}
      <div className="card p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative shrink-0">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand text-3xl font-bold text-white shadow-lg shadow-brand/20">
              {inicialNome}
            </div>
            <button className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow border border-slate-200 text-slate-500 hover:text-brand transition-colors">
              <Camera size={14} />
            </button>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-bold text-slate-800">
              {nomeCompleto}
            </h2>
            <div className="row gap-2 mt-1 justify-center sm:justify-start">
              <span className="badge badge-info">
                <Shield size={11} /> {cargoUsuario}
              </span>
              <span className="badge badge-gray">EPIsee v1.0</span>
              {}
              <span
                className={`badge ${tgVinculado ? "badge-success" : "badge-gray"}`}
              >
                <Send size={11} />
                {tgVinculado ? "Telegram vinculado" : "Telegram não vinculado"}
              </span>
            </div>
            <div className="mt-3 space-y-1">
              <p className="row gap-2 justify-center sm:justify-start text-sm text-slate-500">
                <Mail size={14} className="shrink-0 text-slate-400" />
                {emailUsuario}
              </p>
              <p className="row gap-2 justify-center sm:justify-start text-sm text-slate-500">
                <Building2 size={14} className="shrink-0 text-slate-400" />
                {setor}
              </p>
              <p className="row gap-2 justify-center sm:justify-start text-sm text-slate-500">
                <Phone size={14} className="shrink-0 text-slate-400" />
                {telefone || "Não informado"}
              </p>
            </div>
          </div>

          <button
            onClick={sairENavegar}
            className="btn btn-sm btn-danger shrink-0"
          >
            <LogOut size={14} /> Sair
          </button>
        </div>
      </div>

      {}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {estatisticasUsuario.map(({ rotulo, valor, icone: Icone }) => (
          <div key={rotulo} className="card p-4 text-center">
            <div className="icon-box bg-orange-50 mx-auto mb-2">
              <Icone size={16} className="text-brand" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{valor}</p>
            <p className="sec-sub text-xs mt-0.5">{rotulo}</p>
          </div>
        ))}
      </div>

      {}
      <div className="card">
        <div className="card-header">
          <div className="icon-box bg-sky-50">
            <Send size={15} className="text-sky-500" />
          </div>
          <div className="flex-1">
            <h3 className="sec-title">Alertas via Telegram</h3>
            <p className="sec-sub text-xs">
              Receba alertas de não conformidade diretamente no seu Telegram
            </p>
          </div>
          {tgVinculado && (
            <span className="badge badge-success text-xs">
              <Check size={11} /> Ativo
            </span>
          )}
        </div>

        <div className="card-body space-y-4">
          {tgVinculado ? (
            
            <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <Check size={20} className="text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">
                  Telegram vinculado com sucesso!
                </p>
                <p className="text-sm text-green-600">
                  Você receberá alertas automaticamente quando uma não
                  conformidade for detectada.
                </p>
              </div>
            </div>
          ) : (
            
            <>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-2">
                <p className="text-sm font-medium text-slate-700">
                  Como vincular:
                </p>
                <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                  <li>
                    Clique em <strong>"Gerar código"</strong> abaixo
                  </li>
                  <li>
                    Abra o Telegram e pesquise por <strong>@episee_bot</strong>
                  </li>
                  <li>
                    Envie o comando gerado (ex:{" "}
                    <code className="bg-slate-200 px-1 rounded">
                      /vincular EPIS-3FA2C1
                    </code>
                    )
                  </li>
                  <li>
                    Pronto! Seu Telegram ficará vinculado automaticamente ✅
                  </li>
                </ol>
              </div>

              {tgErro && <p className="text-sm text-red-500">{tgErro}</p>}

              {!tgCodigo ? (
                <button
                  onClick={gerarCodigoTelegram}
                  disabled={tgCarregando}
                  className="btn btn-primary w-full sm:w-auto"
                >
                  <Link size={15} />
                  {tgCarregando ? "Gerando..." : "Gerar código de vinculação"}
                </button>
              ) : (
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 p-4">
                    <div className="flex-1">
                      <p className="text-xs text-sky-600 font-medium mb-1">
                        Envie este comando no Telegram para{" "}
                        <strong>{tgCodigo.bot}</strong>:
                      </p>
                      <code className="text-base font-bold text-sky-800 tracking-wider">
                        /vincular {tgCodigo.codigo}
                      </code>
                    </div>
                    <button
                      onClick={copiarComando}
                      className="btn btn-ghost btn-sm shrink-0"
                      title="Copiar comando"
                    >
                      {tgCopiado ? (
                        <Check size={15} className="text-green-500" />
                      ) : (
                        <Copy size={15} />
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-slate-500">
                    ⚠️ O código é de uso único. Após vincular, esta tela
                    atualizará automaticamente.
                  </p>

                  <button
                    onClick={gerarCodigoTelegram}
                    disabled={tgCarregando}
                    className="btn btn-ghost btn-sm"
                  >
                    Gerar novo código
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {}
      <div className="card">
        <div className="card-header">
          <div className="icon-box bg-blue-50">
            <User size={15} className="text-blue-500" />
          </div>
          <h3 className="sec-title">Editar Perfil</h3>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="field">
              <label className="label">Nome completo</label>
              <input
                className="input"
                value={nomeEdit}
                onChange={(e) => setNomeEdit(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="label">E-mail</label>
              <input
                className="input bg-slate-100 cursor-not-allowed"
                value={emailUsuario}
                readOnly
              />
            </div>
            <div className="field">
              <label className="label">Telefone</label>
              <input
                className="input"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="field">
              <label className="label">Setor</label>
              <input
                className="input"
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={salvar} className="btn-primary">
              {editSalvo ? <Check size={16} /> : <Save size={16} />}
              {editSalvo ? "Salvo!" : "Salvar alterações"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
