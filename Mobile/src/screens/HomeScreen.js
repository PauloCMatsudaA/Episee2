import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { minhasSolicitacoes } from '../api/api';

const DICAS_SEGURANCA = [
  { texto: 'Verifique seu capacete antes de cada uso. Trincas ou amassados reduzem a proteção.', icone: 'construct' },
  { texto: 'Nunca empreste ou use o EPI de outro trabalhador. Cada equipamento é ajustado para o usuário.', icone: 'people' },
  { texto: 'O Certificado de Aprovação (CA) garante que seu EPI foi testado e aprovado pelo MTE.', icone: 'ribbon' },
  { texto: 'Luvas protegem suas mãos de cortes, queimaduras e agentes químicos. Use sempre!', icone: 'hand-left' },
  { texto: 'Óculos de proteção devem ser limpos diariamente para garantir boa visibilidade.', icone: 'glasses' },
  { texto: 'Protetores auditivos reduzem o risco de perda auditiva em ambientes ruidosos. Não esqueça!', icone: 'ear' },
  { texto: 'A botina de segurança com biqueira de aço protege seus pés de quedas de objetos pesados.', icone: 'footsteps' },
];

const traduzirStatus = (status) => {
  const mapa = { pending: 'Pendente', approved: 'Aprovada', rejected: 'Rejeitada' };
  return mapa[status] || status;
};

const configStatus = (statusTraduzido) => {
  switch (statusTraduzido) {
    case 'Aprovada':  return { cor: '#22C55E', fundo: '#DCFCE7', icone: 'checkmark-circle', badgeCor: '#16A34A' };
    case 'Rejeitada': return { cor: '#EF4444', fundo: '#FEE2E2', icone: 'close-circle',      badgeCor: '#DC2626' };
    default:          return { cor: '#EAB308', fundo: '#FEF9C3', icone: 'time',              badgeCor: '#A16207' };
  }
};

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregandoEpis, setCarregandoEpis] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const dica = DICAS_SEGURANCA[new Date().getDate() % DICAS_SEGURANCA.length];
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const dataHoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const dataFormatada = dataHoje.charAt(0).toUpperCase() + dataHoje.slice(1);

  const carregarSolicitacoes = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setCarregandoEpis(true);
    try {
      const dados = await minhasSolicitacoes();
      setSolicitacoes(Array.isArray(dados) ? dados : []);
    } catch (err) {
      console.warn('[HomeScreen] Erro:', err.message);
      setSolicitacoes([]);
    } finally {
      setCarregandoEpis(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregarSolicitacoes(); }, [carregarSolicitacoes]));

  const atalhos = [
    { icone: 'clipboard', cor: '#1D6FE8', fundo: '#EFF6FF', titulo: 'Solicitar EPI',   onPress: () => navigation.navigate('SolicitarEPI') },
    { icone: 'list',             cor: '#3B82F6', fundo: '#EFF6FF', titulo: 'Solicitações',    onPress: () => navigation.navigate('MinhasSolicitacoes') },
    { icone: 'book',             cor: '#22C55E', fundo: '#F0FDF4', titulo: 'Consultar NR-6',  onPress: () => navigation.navigate('NR6') },
    { icone: 'chatbubble-ellipses', cor: '#A855F7', fundo: '#FAF5FF', titulo: 'Assistente IA', onPress: () => navigation.navigate('Chat') },
  ];

  const renderStatusEpi = (item, index, total) => {
    const statusTraduzido = traduzirStatus(item.status);
    const cfg = configStatus(statusTraduzido);
    return (
      <View key={String(item.id)} style={[estilos.statusRow, index === total - 1 && estilos.statusRowUltimo]}>
        <Ionicons name={cfg.icone} size={20} color={cfg.cor} />
        <View style={estilos.statusTextos}>
          <Text style={estilos.statusNome}>{item.epi_type || '—'}</Text>
          <Text style={[estilos.statusPrazo, { color: '#64748B' }]}>
            {item.reason ? item.reason.substring(0, 40) + (item.reason.length > 40 ? '…' : '') : 'Sem motivo informado'}
          </Text>
        </View>
        <View style={[estilos.statusBadge, { backgroundColor: cfg.fundo }]}>
          <Text style={[estilos.statusBadgeTexto, { color: cfg.badgeCor }]}>{statusTraduzido}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={estilos.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={estilos.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => carregarSolicitacoes(true)} tintColor="#F97316" colors={['#F97316']} />
        }
      >
        <View style={estilos.header}>
          <View>
            <Text style={estilos.saudacao}>{saudacao},</Text>
            <Text style={estilos.nomeUsuario}>{user?.nome || 'Trabalhador'} </Text>
            <Text style={estilos.dataHoje}>{dataFormatada}</Text>
          </View>
          <TouchableOpacity style={estilos.avatarHeader} onPress={() => navigation.navigate('Perfil')}>
            <Text style={estilos.avatarLetra}>{(user?.nome || 'U')[0].toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        <Text style={estilos.secaoTitulo}>Acesso Rápido</Text>
        <View style={estilos.atalhoGrid}>
          {atalhos.map((item, index) => (
            <TouchableOpacity key={index} style={[estilos.atalhoCard, { backgroundColor: item.fundo }]} onPress={item.onPress} activeOpacity={0.75}>
              <View style={[estilos.atalhoIconeContainer, { backgroundColor: item.cor + '22' }]}>
                <Ionicons name={item.icone} size={32} color={item.cor} />
              </View>
              <Text style={[estilos.atalhoTitulo, { color: item.cor }]}>{item.titulo}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={estilos.secaoTitulo}>Dica de Segurança</Text>
        <View style={estilos.dicaCard}>
          <View style={estilos.dicaIconeContainer}>
            <Ionicons name={dica.icone} size={24} color="#F97316" />
          </View>
          <View style={estilos.dicaConteudo}>
            <Text style={estilos.dicaTexto}>{dica.texto}</Text>
          </View>
        </View>

        <View style={estilos.secaoTituloRow}>
          <Text style={estilos.secaoTitulo}>Status dos seus EPIs</Text>
          <TouchableOpacity onPress={() => navigation.navigate('MinhasSolicitacoes')}>
            <Text style={estilos.secaoLink}>Ver todas</Text>
          </TouchableOpacity>
        </View>
        <View style={estilos.statusCard}>
          {carregandoEpis ? (
            <View style={estilos.statusCarregando}>
              <ActivityIndicator size="small" color="#F97316" />
              <Text style={estilos.statusCarregandoTexto}>Carregando...</Text>
            </View>
          ) : solicitacoes.length === 0 ? (
            <View style={estilos.statusVazio}>
              <Ionicons name="clipboard-outline" size={36} color="#CBD5E1" />
              <Text style={estilos.statusVazioTexto}>Nenhuma solicitação ainda</Text>
              <Text style={estilos.statusVazioSub}>Use o botão central para solicitar um EPI</Text>
            </View>
          ) : (
            solicitacoes.slice(0, 4).map((item, index) =>
              renderStatusEpi(item, index, Math.min(solicitacoes.length, 4))
            )
          )}
        </View>

        <Text style={estilos.rodape}>EPIsee — Sistema de Segurança do Trabalho v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 16, paddingBottom: 20 },
  saudacao: { fontSize: 15, color: '#64748B', fontWeight: '400' },
  nomeUsuario: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginTop: 2 },
  dataHoje: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  avatarHeader: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#F97316', justifyContent: 'center', alignItems: 'center', shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  avatarLetra: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  bannerCard: { borderRadius: 18, padding: 20, marginBottom: 24, overflow: 'hidden', minHeight: 110, shadowColor: '#F97316', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  bannerCirculo1: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.08)', right: -30, top: -40 },
  bannerCirculo2: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.06)', right: 50, bottom: -30 },
  bannerConteudo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bannerTextos: { flex: 1 },
  bannerTitulo: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  bannerSubtitulo: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 18 },
  secaoTituloRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  secaoTitulo: { fontSize: 17, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  secaoLink: { fontSize: 13, fontWeight: '600', color: '#F97316' },
  atalhoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  atalhoCard: { width: '47.5%', borderRadius: 16, padding: 24, alignItems: 'center', gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  atalhoIconeContainer: { width: 68, height: 68, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  atalhoTitulo: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  dicaCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, borderLeftWidth: 4, borderLeftColor: '#F97316' },
  dicaIconeContainer: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center' },
  dicaConteudo: { flex: 1 },
  dicaLabel: { fontSize: 13, fontWeight: '700', color: '#F97316', marginBottom: 6 },
  dicaTexto: { fontSize: 14, color: '#334155', lineHeight: 20 },
  statusCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 12 },
  statusRowUltimo: { borderBottomWidth: 0, paddingBottom: 0 },
  statusTextos: { flex: 1 },
  statusNome: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  statusPrazo: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusBadgeTexto: { fontSize: 12, fontWeight: '700' },
  statusCarregando: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 20 },
  statusCarregandoTexto: { fontSize: 14, color: '#64748B' },
  statusVazio: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  statusVazioTexto: { fontSize: 15, fontWeight: '600', color: '#334155' },
  statusVazioSub: { fontSize: 12, color: '#94A3B8', textAlign: 'center' },
  rodape: { textAlign: 'center', fontSize: 11, color: '#94A3B8', marginTop: 8 },
});