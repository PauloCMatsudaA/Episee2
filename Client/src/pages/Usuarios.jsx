import { useEffect, useMemo, useState } from 'react';
import { Users, Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { usuariosApi, setoresApi } from '../api/api';

const ROLES = [
  { value: 'gestor',      label: 'Gestor' },
  { value: 'trabalhador', label: 'Trabalhador' },
];

const FORM_INICIAL = {
  name:      '',
  email:     '',
  password:  '',
  role:      'trabalhador',
  sector_id: '',
  phone:     '',
};

export default function Usuarios() {
  const [usuarios, setUsuarios]               = useState([]);
  const [setores, setSetores]                 = useState([]);
  const [carregando, setCarregando]           = useState(true);
  const [salvando, setSalvando]               = useState(false);
  const [erro, setErro]                       = useState('');
  const [sucesso, setSucesso]                 = useState('');
  const [modalAberto, setModalAberto]         = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [form, setForm]                       = useState(FORM_INICIAL);
  const [busca, setBusca]                     = useState('');
  const [filtroPapel, setFiltroPapel]         = useState('');

  useEffect(() => { carregarDados(); }, []);

  async function carregarDados() {
    setCarregando(true);
    setErro('');
    try {
      const [usersRes, sectorsRes] = await Promise.all([
        usuariosApi.listar(),
        setoresApi.listar(),
      ]);
      setUsuarios(usersRes.data || []);
      setSetores(sectorsRes.data || []);
    } catch (e) {
      setErro(e.response?.data?.detail || 'Não foi possível carregar os usuários.');
    } finally {
      setCarregando(false);
    }
  }

  function abrirNovo() {
    setUsuarioEditando(null);
    setForm(FORM_INICIAL);
    setErro('');
    setModalAberto(true);
  }

  function abrirEdicao(u) {
    setUsuarioEditando(u);
    setForm({
      name:      u.name      || '',
      email:     u.email     || '',
      password:  '',
      role:      u.role      || 'trabalhador',
      sector_id: u.sector_id || '',
      phone:     u.phone     || '',
    });
    setErro('');
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setUsuarioEditando(null);
    setForm(FORM_INICIAL);
    setErro('');
  }

  function atualizar(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    setErro('');

    const payload = {
      name:      form.name,
      email:     form.email,
      role:      form.role,
      sector_id: form.sector_id ? Number(form.sector_id) : null,
      phone:     form.phone || null,
    };

    if (form.password) payload.password = form.password;

    try {
      if (usuarioEditando) {
        await usuariosApi.editar(usuarioEditando.id, payload);
        setSucesso('Usuário atualizado com sucesso.');
      } else {
        if (!form.password) {
          setErro('A senha é obrigatória para novo usuário.');
          setSalvando(false);
          return;
        }
        await usuariosApi.criar({ ...payload, password: form.password });
        setSucesso('Usuário criado com sucesso.');
      }
      fecharModal();
      await carregarDados();
      setTimeout(() => setSucesso(''), 3000);
    } catch (err) {
      setErro(err.response?.data?.detail || 'Não foi possível salvar o usuário.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id) {
    if (!window.confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) return;
    try {
      await usuariosApi.excluir(id);
      await carregarDados();
      setSucesso('Usuário excluído com sucesso.');
      setTimeout(() => setSucesso(''), 3000);
    } catch (err) {
      setErro(err.response?.data?.detail || 'Não foi possível excluir o usuário.');
    }
  }

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase();
    return usuarios.filter((u) => {
      const buscaOk =
        u.name?.toLowerCase().includes(termo) ||
        u.email?.toLowerCase().includes(termo) ||
        u.sector?.name?.toLowerCase().includes(termo);
      const papelOk = !filtroPapel || u.role === filtroPapel;
      return buscaOk && papelOk;
    });
  }, [usuarios, busca, filtroPapel]);

  function labelPapel(role) {
    return ROLES.find((r) => r.value === role)?.label || role;
  }

  function classePapel(role) {
    return role === 'gestor' ? 'badge badge-info' : 'badge badge-ok';
  }

  if (carregando) return <div className="page"><LoadingSpinner /></div>;

  return (
    <div className="page page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuários</h1>
          <p className="page-subtitle">Gerencie os usuários e seus papéis no sistema.</p>
        </div>
        <button className="btn btn-primary" onClick={abrirNovo}>
          <Plus size={16} />
          Novo usuário
        </button>
      </div>

      {erro    && <div className="alert alert-err"><span>{erro}</span></div>}
      {sucesso && <div className="alert alert-ok"><span>{sucesso}</span></div>}

      <div className="card">
        <div className="card-body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: '1 1 14rem' }}>
            <label className="label" htmlFor="busca-usuario">Buscar</label>
            <input
              id="busca-usuario" className="input" type="text"
              placeholder="Nome, e-mail ou setor"
              value={busca} onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="field" style={{ flex: '0 1 12rem' }}>
            <label className="label" htmlFor="filtro-papel">Papel</label>
            <select
              id="filtro-papel" className="input select"
              value={filtroPapel} onChange={(e) => setFiltroPapel(e.target.value)}
            >
              <option value="">Todos</option>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {usuariosFiltrados.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem', gap: '0.75rem' }}>
            <Users size={36} color="var(--text-faint)" />
            <h3 className="section-title">Nenhum usuário encontrado</h3>
            <p className="section-sub">Cadastre um novo usuário ou ajuste os filtros.</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Papel</th>
                  <th>Setor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{
                          width: '2rem', height: '2rem', borderRadius: '9999px',
                          background: 'var(--brand)', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                        }}>
                          {u.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span style={{ fontWeight: 500 }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                    <td>
                      <span className={classePapel(u.role)}>
                        {u.role === 'gestor' && <ShieldCheck size={11} />}
                        {labelPapel(u.role)}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{u.sector?.name || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => abrirEdicao(u)} title="Editar">
                          <Pencil size={14} />
                        </button>
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => excluir(u.id)} title="Excluir">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalAberto && (
        <div className="overlay" onClick={fecharModal}>
          <div className="modal modal-lg fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {usuarioEditando ? 'Editar usuário' : 'Novo usuário'}
              </h2>
            </div>
            <form onSubmit={salvar} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {erro && <div className="alert alert-err"><span>{erro}</span></div>}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label className="label" htmlFor="u-name">Nome completo</label>
                  <input id="u-name" name="name" className="input" value={form.name}
                    onChange={atualizar} placeholder="Ex.: João da Silva" required />
                </div>
                <div className="field">
                  <label className="label" htmlFor="u-email">E-mail</label>
                  <input id="u-email" name="email" type="email" className="input"
                    value={form.email} onChange={atualizar}
                    placeholder="joao@empresa.com" required />
                </div>
                <div className="field">
                  <label className="label" htmlFor="u-phone">Telefone</label>
                  <input id="u-phone" name="phone" className="input" value={form.phone}
                    onChange={atualizar} placeholder="+5511999999999" />
                </div>
                <div className="field">
                  <label className="label" htmlFor="u-password">
                    {usuarioEditando ? 'Nova senha (deixe em branco para manter)' : 'Senha *'}
                  </label>
                  <input id="u-password" name="password" type="password" className="input"
                    value={form.password} onChange={atualizar}
                    placeholder={usuarioEditando ? '••••••••' : 'Mínimo 6 caracteres'}
                    {...(!usuarioEditando && { required: true })} />
                </div>
                <div className="field">
                  <label className="label" htmlFor="u-role">Papel</label>
                  <select id="u-role" name="role" className="input select"
                    value={form.role} onChange={atualizar}>
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="label" htmlFor="u-sector">Setor</label>
                  <select id="u-sector" name="sector_id" className="input select"
                    value={form.sector_id} onChange={atualizar}>
                    <option value="">Selecione um setor</option>
                    {setores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={fecharModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}