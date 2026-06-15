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
import { getMeuPerfil, getSetores } from '../api/api';

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

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  const [perfil, setPerfil]             = useState(user || {});
  const [nomeSetor, setNomeSetor]       = useState('');
  const [carregando, setCarregando]     = useState(true);
  const [notificacoesAtivas, setNotificacoesAtivas] = useState(true);

  useEffect(() => {
    const buscarDados = async () => {
      try {
        const dados = await getMeuPerfil();
        setPerfil((prev) => ({ ...prev, ...dados }));

        // Busca nome do setor
        if (dados.sector_id || user?.sector_id) {
          const setores = await getSetores();
          const id = dados.sector_id || user?.sector_id;
          const setor = setores.find((s) => s.id === id);
          setNomeSetor(setor?.nome || setor?.name || `Setor ${id}`);
        }
      } catch (err) {
        console.warn('[ProfileScreen] Erro:', err.message);
      } finally {
        setCarregando(false);
      }
    };
    buscarDados();
  }, []);

  const nome   = perfil?.name || perfil?.nome || 'Usuário';
  const inicial = nome[0].toUpperCase();

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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={estilos.scroll}
        bounces={true}
        alwaysBounceVertical={true}
      >
        {/* Botao voltar */}
        <TouchableOpacity style={estilos.botaoVoltar} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
          <Text style={estilos.botaoVoltarTexto}>Voltar</Text>
        </TouchableOpacity>

        {/* Avatar simples sem fundo */}
        <View style={estilos.avatarArea}>
          <LinearGradient colors={['#F97316', '#EA580C']} style={estilos.avatarGradiente}>
            {carregando
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Text style={estilos.avatarLetra}>{inicial}</Text>
            }
          </LinearGradient>
          <Text style={estilos.nomeUsuario}>{nome}</Text>
          <Text style={estilos.emailUsuario}>{perfil?.email || '—'}</Text>
          {nomeSetor ? (
            <View style={estilos.setorBadge}>
              <Ionicons name="briefcase" size={13} color="#F97316" />
              <Text style={estilos.setorTexto}>{nomeSetor}</Text>
            </View>
          ) : null}
        </View>

        {/* Informações */}
        <SecaoCard titulo="Informações" icone="person-circle" corIcone="#3B82F6">
          <ItemInfo
            icone="briefcase-outline"
            label="Cargo"
            valor={perfil?.role === 'trabalhador' ? 'Trabalhador' : perfil?.role === 'gestor' ? 'Gestor' : perfil?.role}
            corIcone="#3B82F6"
          />
          <ItemInfo
            icone="business-outline"
            label="Setor"
            valor={nomeSetor || (perfil?.sector_id ? `Setor ${perfil.sector_id}` : null)}
            corIcone="#22C55E"
          />
          <ItemInfo
            icone="mail-outline"
            label="E-mail"
            valor={perfil?.email}
            corIcone="#F97316"
          />
          <ItemInfo
            icone="call-outline"
            label="Telefone"
            valor={perfil?.phone || perfil?.telefone}
            corIcone="#A855F7"
          />
          <ItemInfo
            icone="calendar-outline"
            label="Membro desde"
            valor={formatarData(perfil?.created_at)}
            corIcone="#EAB308"
            ultimo
          />
        </SecaoCard>

        {/* Preferências */}
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

        {/* Suporte */}
        <SecaoCard titulo="Suporte" icone="help-circle-outline" corIcone="#06B6D4">
          {[
            { icone: 'document-text-outline',       cor: '#22C55E', fundo: '#ECFDF5', texto: 'Manual do Usuário' },
            { icone: 'chatbubble-ellipses-outline',  cor: '#22C55E', fundo: '#F0FDF4', texto: 'Fale com o Suporte' },
            { icone: 'information-circle-outline',   cor: '#3B82F6', fundo: '#EFF6FF', texto: 'Sobre o EPIsee' },
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

        {/* Botão sair */}
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
  scroll: { paddingBottom: 48 },

  botaoVoltar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 4,
  },
  botaoVoltarTexto: { fontSize: 16, fontWeight: '600', color: '#0F172A' },

  // Avatar sem fundo / background removido
  avatarArea: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 28,
  },
  avatarGradiente: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    marginBottom: 14,
  },
  avatarLetra: { fontSize: 36, fontWeight: '800', color: '#FFFFFF' },

  nomeUsuario: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  emailUsuario: { fontSize: 14, color: '#64748B', marginBottom: 12 },
  setorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  setorTexto: { fontSize: 13, fontWeight: '700', color: '#F97316' },

  secaoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  secaoCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  secaoIcone: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  secaoTitulo: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  secaoConteudo: { paddingHorizontal: 16 },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  itemRowUltimo: { borderBottomWidth: 0 },
  itemIconeContainer: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  itemTextos: { flex: 1 },
  itemLabel: { fontSize: 12, color: '#94A3B8', marginBottom: 2 },
  itemValor: { fontSize: 15, fontWeight: '600', color: '#0F172A' },

  preferenciasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  preferenciasInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  preferenciasIcone: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  preferenciasLabel: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  preferenciasDesc: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  suporteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  suporteDivisor: { height: 1, backgroundColor: '#F8FAFC' },
  suporteTexto: { flex: 1, fontSize: 14, fontWeight: '500', color: '#374151' },

  botaoSair: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  botaoSairTexto: { fontSize: 15, fontWeight: '700', color: '#EF4444' },

  versaoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 8,
  },
  versaoTexto: { fontSize: 12, color: '#CBD5E1' },
});
