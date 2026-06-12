// src/screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getMeuPerfil } from '../api/api';

function ItemInfo({ icone, label, valor, corIcone = '#64748B', ultimo = false }) {
  return (
    <View style={[estilos.itemRow, ultimo && estilos.itemRowUltimo]}>
      <View style={[estilos.itemIconeContainer, { backgroundColor: corIcone + '18' }]}>
        <Ionicons name={icone} size={16} color={corIcone} />
      </View>
      <View style={estilos.itemTextos}>
        <Text style={estilos.itemLabel}>{label}</Text>
        <Text style={estilos.itemValor}>{valor || '—'}</Text>
      </View>
    </View>
  );
}

function SecaoCard({ titulo, icone, corIcone = '#F97316', children }) {
  return (
    <View style={estilos.secaoCard}>
      <View style={estilos.secaoCabecalho}>
        <View style={[estilos.secaoIcone, { backgroundColor: corIcone + '18' }]}>
          <Ionicons name={icone} size={17} color={corIcone} />
        </View>
        <Text style={estilos.secaoTitulo}>{titulo}</Text>
      </View>
      <View style={estilos.secaoConteudo}>{children}</View>
    </View>
  );
}

function formatarData(dataISO) {
  if (!dataISO) return '—';
  return new Date(dataISO).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  // ✅ Perfil completo vindo da API — inicializa com o user do contexto
  const [perfil, setPerfil]   = useState(user || {});
  const [carregando, setCarregando] = useState(true);
  const [notificacoesAtivas, setNotificacoesAtivas] = useState(true);

  useEffect(() => {
    const buscarPerfil = async () => {
      try {
        const dados = await getMeuPerfil();
        // Mescla dados da API com o que já temos no contexto
        setPerfil((prev) => ({ ...prev, ...dados }));
      } catch (err) {
        console.warn('[ProfileScreen] Erro ao buscar perfil:', err.message);
        // Mantém os dados do contexto como fallback — não quebra a tela
      } finally {
        setCarregando(false);
      }
    };
    buscarPerfil();
  }, []);

  const inicial = (perfil?.nome || perfil?.name || 'U')[0].toUpperCase();

  const confirmarLogout = () => {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair do EPIsee?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <SafeAreaView style={estilos.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={estilos.scroll}>

        {/* Header / Avatar */}
        <View style={estilos.headerContainer}>
          <LinearGradient colors={['#0F172A', '#1E293B']} style={estilos.headerGradiente}>
            <View style={estilos.headerDecorCirculo1} />
            <View style={estilos.headerDecorCirculo2} />
          </LinearGradient>

          <View style={estilos.avatarContainer}>
            <LinearGradient colors={['#F97316', '#EA580C']} style={estilos.avatarGradiente}>
              {carregando
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={estilos.avatarLetra}>{inicial}</Text>
              }
            </LinearGradient>
            <View style={estilos.avatarStatus} />
          </View>

          <Text style={estilos.nomeUsuario}>{perfil?.nome || perfil?.name || 'Usuário'}</Text>
          <Text style={estilos.emailUsuario}>{perfil?.email || '—'}</Text>

          <View style={estilos.setorBadge}>
            <Ionicons name="briefcase" size={13} color="#F97316" />
            <Text style={estilos.setorTexto}>
              {perfil?.setor || perfil?.sector || perfil?.setor_nome || 'Produção'}
            </Text>
          </View>
        </View>

        {/* Seção: Informações */}
        <SecaoCard titulo="Informações" icone="person-circle" corIcone="#3B82F6">
          <ItemInfo
            icone="briefcase-outline"
            label="Cargo"
            valor={perfil?.cargo || perfil?.role || perfil?.funcao || '—'}
            corIcone="#3B82F6"
          />
          <ItemInfo
            icone="business-outline"
            label="Setor"
            valor={perfil?.setor || perfil?.sector || perfil?.setor_nome || '—'}
            corIcone="#22C55E"
          />
          <ItemInfo
            icone="mail-outline"
            label="E-mail"
            valor={perfil?.email || '—'}
            corIcone="#F97316"
          />
          <ItemInfo
            icone="call-outline"
            label="Telefone"
            valor={perfil?.telefone || perfil?.phone || '—'}
            corIcone="#A855F7"
          />
          <ItemInfo
            icone="calendar-outline"
            label="Membro desde"
            valor={formatarData(
              perfil?.membro_desde || perfil?.created_at || perfil?.criado_em
            )}
            corIcone="#EAB308"
            ultimo
          />
        </SecaoCard>

        {/* Seção: Preferências */}
        <SecaoCard titulo="Preferências" icone="settings-outline" corIcone="#64748B">
          <View style={estilos.preferenciasRow}>
            <View style={estilos.preferenciasInfo}>
              <View style={[estilos.preferenciasIcone, { backgroundColor: '#FFF7ED' }]}>
                <Ionicons name="notifications-outline" size={18} color="#F97316" />
              </View>
              <View>
                <Text style={estilos.preferenciasLabel}>Notificações de alerta</Text>
                <Text style={estilos.preferenciasDesc}>Atualizações sobre suas solicitações</Text>
              </View>
            </View>
            <Switch
              value={notificacoesAtivas}
              onValueChange={setNotificacoesAtivas}
              trackColor={{ false: '#E2E8F0', true: '#FED7AA' }}
              thumbColor={notificacoesAtivas ? '#F97316' : '#94A3B8'}
              ios_backgroundColor="#E2E8F0"
            />
          </View>
        </SecaoCard>

        {/* Seção: Suporte */}
        <SecaoCard titulo="Suporte" icone="help-circle-outline" corIcone="#06B6D4">
          {[
            { icone: 'document-text-outline', cor: '#22C55E', fundo: '#ECFDF5', texto: 'Manual do Usuário' },
            { icone: 'chatbubble-ellipses-outline', cor: '#22C55E', fundo: '#F0FDF4', texto: 'Fale com o Suporte' },
            { icone: 'information-circle-outline', cor: '#3B82F6', fundo: '#EFF6FF', texto: 'Sobre o EPIsee' },
          ].map((item, index, arr) => (
            <React.Fragment key={item.texto}>
              <TouchableOpacity style={estilos.suporteRow} activeOpacity={0.7}>
                <View style={[estilos.itemIconeContainer, { backgroundColor: item.fundo }]}>
                  <Ionicons name={item.icone} size={16} color={item.cor} />
                </View>
                <Text style={estilos.suporteTexto}>{item.texto}</Text>
                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
              </TouchableOpacity>
              {index < arr.length - 1 && <View style={estilos.suporteDivisor} />}
            </React.Fragment>
          ))}
        </SecaoCard>

        {/* Botão de sair */}
        <TouchableOpacity style={estilos.botaoSair} onPress={confirmarLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={estilos.botaoSairTexto}>Sair da conta</Text>
        </TouchableOpacity>

        <View style={estilos.versaoContainer}>
          <Ionicons name="shield-checkmark" size={16} color="#CBD5E1" />
          <Text style={estilos.versaoTexto}>EPIsee v1.0.0 · Segurança do Trabalho</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  scroll: { paddingBottom: 40 },
  headerContainer: { alignItems: 'center', paddingBottom: 28, marginBottom: 8, overflow: 'hidden' },
  headerGradiente: { position: 'absolute', top: 0, left: 0, right: 0, height: 160, overflow: 'hidden' },
  headerDecorCirculo1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(249,115,22,0.1)', right: -50, top: -60 },
  headerDecorCirculo2: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(249,115,22,0.06)', left: -20, bottom: -20 },
  avatarContainer: { marginTop: 32, marginBottom: 14, position: 'relative' },
  avatarGradiente: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', shadowColor: '#F97316', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8, borderWidth: 3, borderColor: '#FFFFFF' },
  avatarLetra: { fontSize: 36, fontWeight: '800', color: '#FFFFFF' },
  avatarStatus: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: '#22C55E', borderWidth: 3, borderColor: '#FFFFFF', bottom: 2, right: 2 },
  nomeUsuario: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  emailUsuario: { fontSize: 14, color: '#64748B', marginBottom: 12 },
  setorBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, gap: 6, borderWidth: 1, borderColor: '#FED7AA' },
  setorTexto: { fontSize: 13, fontWeight: '700', color: '#F97316' },
  secaoCard: { backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3, overflow: 'hidden' },
  secaoCabecalho: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 10 },
  secaoIcone: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  secaoTitulo: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  secaoConteudo: { paddingHorizontal: 16, paddingBottom: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 12 },
  itemRowUltimo: { borderBottomWidth: 0 },
  itemIconeContainer: { width: 34, height: 34, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  itemTextos: { flex: 1 },
  itemLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '500', marginBottom: 2 },
  itemValor: { fontSize: 14, color: '#0F172A', fontWeight: '600' },
  preferenciasRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  preferenciasInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  preferenciasIcone: { width: 34, height: 34, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  preferenciasLabel: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  preferenciasDesc: { fontSize: 12, color: '#94A3B8', marginTop: 1 },
  suporteRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  suporteDivisor: { height: 1, backgroundColor: '#F1F5F9' },
  suporteTexto: { flex: 1, fontSize: 14, color: '#334155', fontWeight: '500' },
  botaoSair: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEE2E2', borderRadius: 14, marginHorizontal: 16, marginTop: 4, marginBottom: 8, paddingVertical: 16, gap: 10, borderWidth: 1, borderColor: '#FECACA' },
  botaoSairTexto: { fontSize: 16, fontWeight: '700', color: '#EF4444' },
  versaoContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 },
  versaoTexto: { fontSize: 12, color: '#CBD5E1', textAlign: 'center' },
});