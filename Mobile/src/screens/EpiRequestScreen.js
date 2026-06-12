import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Modal, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { criarSolicitacao, getSetores } from '../api/api';

const TIPOS_EPI = [
  { valor: 'Capacete de Segurança',  icone: 'construct-outline' },
  { valor: 'Luva de Proteção',       icone: 'hand-left-outline' },
  { valor: 'Óculos de Proteção',     icone: 'glasses-outline'   },
  { valor: 'Cinto de Segurança',     icone: 'link-outline'      },
  { valor: 'Colete Refletivo',       icone: 'shirt-outline'     },
  { valor: 'Máscara de Proteção',    icone: 'medical-outline'   },
  { valor: 'Botina de Segurança',    icone: 'footsteps-outline' },
  { valor: 'Protetor Auditivo',      icone: 'ear-outline'       },
];

const MOTIVOS = [
  { valor: 'Equipamento danificado',  icone: 'build-outline'               },
  { valor: 'Equipamento perdido',     icone: 'search-outline'              },
  { valor: 'Novo funcionário',        icone: 'person-add-outline'          },
  { valor: 'Troca periódica',         icone: 'refresh-outline'             },
  { valor: 'Outro',                   icone: 'ellipsis-horizontal-outline' },
];

function Seletor({ titulo, opcoes, valorSelecionado, onSelecionar, erro, carregando = false }) {
  const [modalVisivel, setModalVisivel] = useState(false);
  const opcaoSelecionada = opcoes.find((o) => (o.valor ?? o.id?.toString()) === valorSelecionado);

  return (
    <>
      <TouchableOpacity
        style={[estilos.seletorTrigger, erro && estilos.inputErro]}
        onPress={() => !carregando && setModalVisivel(true)}
        activeOpacity={0.75}
      >
        {carregando ? (
          <ActivityIndicator size="small" color="#94A3B8" />
        ) : opcaoSelecionada ? (
          <View style={estilos.seletorSelecionado}>
            {opcaoSelecionada.icone && <Ionicons name={opcaoSelecionada.icone} size={18} color="#F97316" />}
            <Text style={estilos.seletorTextoSelecionado}>{opcaoSelecionada.valor ?? opcaoSelecionada.nome}</Text>
          </View>
        ) : (
          <Text style={estilos.seletorPlaceholder}>{titulo}</Text>
        )}
        <Ionicons name="chevron-down" size={18} color="#94A3B8" />
      </TouchableOpacity>

      <Modal visible={modalVisivel} transparent animationType="slide" onRequestClose={() => setModalVisivel(false)}>
        <TouchableOpacity style={estilos.modalOverlay} onPress={() => setModalVisivel(false)} activeOpacity={1}>
          <View style={estilos.modalSheet}>
            <View style={estilos.modalAlca} />
            <Text style={estilos.modalTitulo}>{titulo}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {opcoes.map((opcao) => {
                const key = opcao.valor ?? opcao.id?.toString();
                const label = opcao.valor ?? opcao.nome;
                const selecionado = valorSelecionado === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[estilos.modalOpcao, selecionado && estilos.modalOpcaoSelecionada]}
                    onPress={() => { onSelecionar(key); setModalVisivel(false); }}
                    activeOpacity={0.7}
                  >
                    <View style={[estilos.modalOpcaoIcone, selecionado && { backgroundColor: '#FFF7ED' }]}>
                      <Ionicons name={opcao.icone || 'business-outline'} size={20} color={selecionado ? '#F97316' : '#64748B'} />
                    </View>
                    <Text style={[estilos.modalOpcaoTexto, selecionado && estilos.modalOpcaoTextoSelecionado]}>{label}</Text>
                    {selecionado && <Ionicons name="checkmark" size={18} color="#F97316" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function ModalSucesso({ visivel, onFechar }) {
  return (
    <Modal visible={visivel} transparent animationType="fade">
      <View style={estilos.sucessoOverlay}>
        <View style={estilos.sucessoCard}>
          <Ionicons name="checkmark-circle" size={64} color="#22C55E" style={{ marginBottom: 16 }} />
          <Text style={estilos.sucessoTitulo}>Solicitação enviada!</Text>
          <Text style={estilos.sucessoTexto}>O gestor foi notificado. Acompanhe o status em "Minhas Solicitações".</Text>
          <TouchableOpacity style={estilos.sucessoBotao} onPress={onFechar}>
            <Text style={estilos.sucessoBotaoTexto}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function EpiRequestScreen() {
  const { user } = useAuth();
  const [tipoEpi, setTipoEpi]     = useState('');
  const [motivo, setMotivo]       = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [setorId, setSetorId]     = useState('');
  const [setores, setSetores]     = useState([]);
  const [carregandoSetores, setCarregandoSetores] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso]     = useState(false);
  const [erro, setErro]           = useState('');
  const [erros, setErros]         = useState({});

  useEffect(() => {
    const buscarSetores = async () => {
      try {
        const dados = await getSetores();
        const lista = Array.isArray(dados) ? dados : [];
        const formatados = lista.map((s) => ({
          valor: String(s.id),
          nome:  s.nome || s.name || `Setor ${s.id}`,
          icone: 'business-outline',
        }));
        setSetores(formatados);
        if (user?.setor_id) {
          setSetorId(String(user.setor_id));
        } else if (formatados.length > 0) {
          setSetorId(formatados[0].valor);
        }
      } catch (err) {
        console.warn('[EpiRequest] Setores:', err.message);
        setSetores([{ valor: '1', nome: 'Geral', icone: 'business-outline' }]);
        setSetorId('1');
      } finally {
        setCarregandoSetores(false);
      }
    };
    buscarSetores();
  }, [user]);

  const validar = () => {
    const novosErros = {};
    if (!tipoEpi) novosErros.tipoEpi = 'Selecione o tipo de EPI';
    if (!motivo)  novosErros.motivo  = 'Selecione o motivo da solicitação';
    if (!setorId) novosErros.setor   = 'Selecione o setor';
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleEnviar = async () => {
    if (!validar()) return;
    setCarregando(true);
    setErro('');
    try {
      await criarSolicitacao({
        epi_type:  tipoEpi,
        sector_id: Number(setorId),
        reason:    motivo + (observacoes ? ` — ${observacoes}` : ''),
      });
      setTipoEpi(''); setMotivo(''); setObservacoes(''); setErros({});
      setSucesso(true);
    } catch (err) {
      console.warn('[EpiRequest] Envio:', err.response?.data);
      setErro('Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <SafeAreaView style={estilos.container}>
      <ModalSucesso visivel={sucesso} onFechar={() => setSucesso(false)} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={estilos.scroll} keyboardShouldPersistTaps="handled">
        <View style={estilos.header}>
          <View style={estilos.headerIconeContainer}>
            <Ionicons name="shield-checkmark" size={28} color="#F97316" />
          </View>
          <View>
            <Text style={estilos.headerTitulo}>Solicitar EPI</Text>
            <Text style={estilos.headerSubtitulo}>Preencha os dados abaixo</Text>
          </View>
        </View>

        <View style={estilos.formularioCard}>
          <View style={estilos.campo}>
            <Text style={estilos.campoLabel}>Tipo de EPI <Text style={estilos.obrigatorio}>*</Text></Text>
            <Seletor titulo="Selecione o tipo de EPI" opcoes={TIPOS_EPI} valorSelecionado={tipoEpi}
              onSelecionar={(v) => { setTipoEpi(v); setErros({ ...erros, tipoEpi: undefined }); }} erro={!!erros.tipoEpi} />
            {erros.tipoEpi && <Text style={estilos.textoErro}>{erros.tipoEpi}</Text>}
          </View>

          <View style={estilos.campo}>
            <Text style={estilos.campoLabel}>Motivo <Text style={estilos.obrigatorio}>*</Text></Text>
            <Seletor titulo="Selecione o motivo" opcoes={MOTIVOS} valorSelecionado={motivo}
              onSelecionar={(v) => { setMotivo(v); setErros({ ...erros, motivo: undefined }); }} erro={!!erros.motivo} />
            {erros.motivo && <Text style={estilos.textoErro}>{erros.motivo}</Text>}
          </View>

      
          <View style={estilos.campo}>
            <Text style={estilos.campoLabel}>Setor <Text style={estilos.obrigatorio}>*</Text></Text>
            <Seletor titulo="Selecione o setor" opcoes={setores} valorSelecionado={setorId}
              onSelecionar={(v) => { setSetorId(v); setErros({ ...erros, setor: undefined }); }}
              erro={!!erros.setor} carregando={carregandoSetores} />
            {erros.setor && <Text style={estilos.textoErro}>{erros.setor}</Text>}
          </View>

          <View style={estilos.campo}>
            <Text style={estilos.campoLabel}>Observações <Text style={estilos.opcional}>(opcional)</Text></Text>
            <TextInput style={estilos.textArea} value={observacoes} onChangeText={setObservacoes}
              placeholder="Descreva detalhes adicionais..." placeholderTextColor="#94A3B8"
              multiline numberOfLines={4} textAlignVertical="top" />
          </View>

          <Text style={estilos.avisoObrigatorio}><Text style={estilos.obrigatorio}>*</Text> Campos obrigatórios</Text>
          {erro ? (
            <View style={estilos.erroContainer}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={estilos.erroTexto}>{erro}</Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity onPress={handleEnviar} activeOpacity={0.85} disabled={carregando} style={estilos.botaoWrapper}>
          <LinearGradient colors={['#F97316', '#EA580C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={estilos.botao}>
            {carregando
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <><Ionicons name="send" size={20} color="#FFFFFF" /><Text style={estilos.botaoTexto}>Enviar Solicitação</Text></>}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 20, paddingBottom: 20, gap: 14 },
  headerIconeContainer: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center' },
  headerTitulo: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  headerSubtitulo: { fontSize: 14, color: '#64748B', marginTop: 2 },
  formularioCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  campo: { marginBottom: 18 },
  campoLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  obrigatorio: { color: '#EF4444', fontWeight: '700' },
  opcional: { color: '#94A3B8', fontWeight: '400', fontSize: 12 },
  seletorTrigger: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, backgroundColor: '#FAFAFA', paddingHorizontal: 14, height: 50, justifyContent: 'space-between' },
  seletorSelecionado: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  seletorTextoSelecionado: { fontSize: 15, color: '#0F172A', fontWeight: '500' },
  seletorPlaceholder: { fontSize: 15, color: '#94A3B8' },
  inputErro: { borderColor: '#EF4444', backgroundColor: '#FFF5F5' },
  textArea: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, backgroundColor: '#FAFAFA', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, fontSize: 15, color: '#0F172A', minHeight: 100, lineHeight: 20 },
  textoErro: { fontSize: 12, color: '#EF4444', marginTop: 4, marginLeft: 2 },
  erroContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginTop: 4 },
  erroTexto: { fontSize: 13, color: '#EF4444', flex: 1 },
  avisoObrigatorio: { fontSize: 12, color: '#94A3B8', marginTop: -6 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, marginBottom: 16, gap: 10, borderLeftWidth: 3, borderLeftColor: '#3B82F6' },
  infoTexto: { flex: 1, fontSize: 13, color: '#1E40AF', lineHeight: 19 },
  botaoWrapper: { borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  botao: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, gap: 10, borderRadius: 12 },
  botaoTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 40 : 24, paddingTop: 8, maxHeight: '70%' },
  modalAlca: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginVertical: 12 },
  modalTitulo: { fontSize: 17, fontWeight: '700', color: '#0F172A', marginBottom: 14, textAlign: 'center' },
  modalOpcao: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4, gap: 12 },
  modalOpcaoSelecionada: { backgroundColor: '#FFF7ED' },
  modalOpcaoIcone: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  modalOpcaoTexto: { fontSize: 15, color: '#334155', flex: 1 },
  modalOpcaoTextoSelecionado: { color: '#F97316', fontWeight: '600' },
  sucessoOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  sucessoCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 12 },
  sucessoTitulo: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 12, textAlign: 'center' },
  sucessoTexto: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  sucessoBotao: { backgroundColor: '#F97316', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40 },
  sucessoBotaoTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});