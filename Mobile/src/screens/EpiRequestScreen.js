import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Modal, ActivityIndicator,
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
  const [tipoEpi, setTipoEpi]         = useState('');
  const [motivo, setMotivo]           = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [nomeSetor, setNomeSetor]     = useState('');
  const [carregando, setCarregando]   = useState(false);
  const [sucesso, setSucesso]         = useState(false);
  const [erro, setErro]               = useState('');
  const [erros, setErros]             = useState({});

  useEffect(() => {
    const buscarNomeSetor = async () => {
      if (!user?.sector_id) return;
      try {
        const setores = await getSetores();
        const setor = setores.find((s) => s.id === user.sector_id);
        setNomeSetor(setor?.nome || setor?.name || `Setor ${user.sector_id}`);
      } catch {
        setNomeSetor(`Setor ${user.sector_id}`);
      }
    };
    buscarNomeSetor();
  }, [user]);

  const validar = () => {
    const novosErros = {};
    if (!tipoEpi) novosErros.tipoEpi = 'Selecione o tipo de EPI';
    if (!motivo)  novosErros.motivo  = 'Selecione o motivo da solicitação';
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
        sector_id: user?.sector_id,
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

          {}
          {(nomeSetor || user?.sector_id) ? (
            <View style={estilos.campo}>
              <Text style={estilos.campoLabel}>Seu Setor</Text>
              <View style={estilos.setorFixo}>
                <Ionicons name="business-outline" size={18} color="#F97316" />
                <Text style={estilos.setorFixoTexto}>
                  {nomeSetor || `Setor ${user?.sector_id}`}
                </Text>
                <Ionicons name="lock-closed-outline" size={14} color="#94A3B8" />
              </View>
              <Text style={estilos.setorDica}>Definido no seu cadastro</Text>
            </View>
          ) : null}

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
  setorFixo: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 14 },
  setorFixoTexto: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0F172A' },
  setorDica: { fontSize: 11, color: '#94A3B8', marginTop: 4, marginLeft: 4 },
  seletorTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 14, minHeight: 50 },
  seletorSelecionado: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  seletorTextoSelecionado: { fontSize: 15, fontWeight: '500', color: '#0F172A' },
  seletorPlaceholder: { fontSize: 15, color: '#94A3B8', flex: 1 },
  inputErro: { borderColor: '#EF4444', borderWidth: 1.5 },
  textoErro: { fontSize: 12, color: '#EF4444', marginTop: 4, marginLeft: 4 },
  textArea: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0F172A', minHeight: 100 },
  avisoObrigatorio: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  erroContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEE2E2', padding: 12, borderRadius: 10, marginTop: 12 },
  erroTexto: { flex: 1, fontSize: 13, color: '#DC2626' },
  botaoWrapper: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  botao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  botaoTexto: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '70%' },
  modalAlca: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 16 },
  modalTitulo: { fontSize: 17, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  modalOpcao: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalOpcaoSelecionada: { backgroundColor: '#FFF7ED', borderRadius: 12, paddingHorizontal: 8 },
  modalOpcaoIcone: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  modalOpcaoTexto: { flex: 1, fontSize: 15, color: '#374151', fontWeight: '500' },
  modalOpcaoTextoSelecionado: { color: '#F97316', fontWeight: '700' },
  sucessoOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  sucessoCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 32, alignItems: 'center', width: '100%', maxWidth: 340 },
  sucessoTitulo: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  sucessoTexto: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  sucessoBotao: { backgroundColor: '#22C55E', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40 },
  sucessoBotaoTexto: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
