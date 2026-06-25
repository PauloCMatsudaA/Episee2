import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl,
  Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getVideosWorker } from '../api/api';

const formatarData = (iso) => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR');
  } catch { return null; }
};

function InfoRow({ icone, label, valor }) {
  if (!valor) return null;
  return (
    <View style={estilos.infoRow}>
      <Ionicons name={icone} size={15} color="#F97316" style={estilos.infoIcone} />
      <View style={estilos.infoTextos}>
        <Text style={estilos.infoLabel}>{label}</Text>
        <Text style={estilos.infoValor}>{valor}</Text>
      </View>
    </View>
  );
}

export default function TrainingScreen() {
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandido, setExpandido]   = useState({});
  const [erro, setErro]             = useState(null);

  const carregarVideos = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setCarregando(true);
    setErro(null);
    try {
      const dados = await getVideosWorker();
      setCategorias(Array.isArray(dados) ? dados : []);
    } catch (err) {
      console.warn('[TrainingScreen] Erro:', err.message);
      setErro('Nao foi possivel carregar os videos. Verifique sua conexao.');
      setCategorias([]);
    } finally {
      setCarregando(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregarVideos(); }, [carregarVideos]));

  const toggleCategoria = (id) =>
    setExpandido((prev) => ({ ...prev, [id]: !prev[id] }));

  const abrirVideo = (url) => {
    if (!url) return;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      Linking.openURL(url).catch(() =>
        Alert.alert('Erro', 'Nao foi possivel abrir o video.')
      );
    } else {
      Alert.alert('Video', 'Este video esta hospedado no servidor da empresa.\nAcesse pelo aplicativo quando disponivel.');
    }
  };

  const totalVideos = categorias.reduce((acc, cat) => acc + (cat.videos?.length || 0), 0);

  if (carregando) {
    return (
      <SafeAreaView style={estilos.container}>
        <View style={estilos.carregandoContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={estilos.carregandoTexto}>Carregando videos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={estilos.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => carregarVideos(true)}
            tintColor="#F97316"
            colors={['#F97316']}
          />
        }
      >
        {}
        <View style={estilos.header}>
          <View style={estilos.headerIcone}>
            <Ionicons name="play-circle" size={28} color="#F97316" />
          </View>
          <View style={estilos.headerTextos}>
            <Text style={estilos.headerTitulo}>Videos de Treinamento</Text>
            <Text style={estilos.headerSub}>
              {totalVideos} video{totalVideos !== 1 ? 's' : ''} em {categorias.length} categoria{categorias.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {}
        {erro && (
          <View style={estilos.erroCard}>
            <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
            <Text style={estilos.erroTexto}>{erro}</Text>
          </View>
        )}

        {}
        {!erro && categorias.length === 0 && (
          <View style={estilos.vazioContainer}>
            <Ionicons name="videocam-outline" size={52} color="#CBD5E1" />
            <Text style={estilos.vazioTitulo}>Nenhum video disponivel</Text>
            <Text style={estilos.vazioSub}>
              O gestor ainda nao adicionou videos de treinamento.
            </Text>
          </View>
        )}

        {}
        {categorias.map((cat) => {
          const aberto = expandido[cat.id] ?? false;
          const videos = (cat.videos || []).filter((v) => v.aprovado);

          return (
            <View key={cat.id} style={estilos.categoriaCard}>

              {}
              <TouchableOpacity
                style={estilos.categoriaHeader}
                onPress={() => toggleCategoria(cat.id)}
                activeOpacity={0.75}
              >
                <View style={estilos.categoriaHeaderEsq}>
                  <View>
                    <Text style={estilos.categoriaNome}>{cat.nome}</Text>
                    <Text style={estilos.categoriaCount}>
                      {videos.length} video{videos.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={aberto ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#94A3B8"
                />
              </TouchableOpacity>

              {}
              {aberto && (
                <View style={estilos.expandido}>

                  {}
                  {(cat.descricao || cat.quando_usar || cat.como_usar || cat.erros_comuns) && (
                    <View style={estilos.epiInfoCard}>
                      <Text style={estilos.epiInfoTitulo}>Sobre este EPI</Text>

                      <InfoRow icone="information-circle-outline" label="Descricao"   valor={cat.descricao} />
                      <InfoRow icone="checkmark-circle-outline"   label="Quando usar" valor={cat.quando_usar} />
                      <InfoRow icone="construct-outline"          label="Como usar"   valor={cat.como_usar} />
                      <InfoRow icone="warning-outline"            label="Erros comuns" valor={cat.erros_comuns} />
                    </View>
                  )}

                  <View style={estilos.divider} />

                  {}
                  {videos.length === 0 ? (
                    <Text style={estilos.semVideos}>Nenhum video aprovado nesta categoria.</Text>
                  ) : (
                    videos
                      .sort((a, b) => b.prioridade - a.prioridade)
                      .map((video, idx) => (
                        <TouchableOpacity
                          key={video.id || idx}
                          style={[estilos.videoItem, idx === videos.length - 1 && { borderBottomWidth: 0 }]}
                          onPress={() => abrirVideo(video.url)}
                          activeOpacity={0.75}
                        >
                          <View style={estilos.videoIconeContainer}>
                            <Ionicons name="play-circle" size={36} color="#F97316" />
                          </View>
                          <View style={estilos.videoTextos}>
                            <Text style={estilos.videoTitulo}>{video.titulo}</Text>
                            {video.descricao ? (
                              <Text style={estilos.videoDesc}>{video.descricao}</Text>
                            ) : null}
                            <View style={estilos.videoMeta}>
                              {video.fonte ? (
                                <View style={estilos.metaChip}>
                                  <Ionicons name="link-outline" size={11} color="#64748B" />
                                  <Text style={estilos.metaTexto}>{video.fonte}</Text>
                                </View>
                              ) : null}
                              {video.criado_em ? (
                                <View style={estilos.metaChip}>
                                  <Ionicons name="calendar-outline" size={11} color="#64748B" />
                                  <Text style={estilos.metaTexto}>{formatarData(video.criado_em)}</Text>
                                </View>
                              ) : null}
                            </View>
                          </View>
                          <Ionicons name="open-outline" size={16} color="#94A3B8" />
                        </TouchableOpacity>
                      ))
                  )}
                </View>
              )}

              {}
              {!aberto && cat.descricao ? (
                <Text style={estilos.categoriaDescFechada} numberOfLines={2}>
                  {cat.descricao}
                </Text>
              ) : null}

            </View>
          );
        })}

        <Text style={estilos.rodape}>Puxe para baixo para atualizar os videos</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#F1F5F9' },
  scroll:              { paddingHorizontal: 16, paddingBottom: 32 },
  carregandoContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  carregandoTexto:     { fontSize: 14, color: '#64748B' },

  header:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 20, paddingBottom: 20 },
  headerIcone:   { width: 48, height: 48, borderRadius: 14, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center' },
  headerTextos:  { flex: 1 },
  headerTitulo:  { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  headerSub:     { fontSize: 13, color: '#64748B', marginTop: 2 },

  erroCard:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, marginBottom: 16 },
  erroTexto: { flex: 1, fontSize: 13, color: '#DC2626' },

  vazioContainer: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  vazioTitulo:    { fontSize: 16, fontWeight: '700', color: '#475569' },
  vazioSub:       { fontSize: 13, color: '#94A3B8', textAlign: 'center', maxWidth: 260 },

  categoriaCard:        { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, overflow: 'hidden' },
  categoriaHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  categoriaHeaderEsq:   { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  categoriaNome:        { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  categoriaCount:       { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  categoriaDescFechada: { fontSize: 13, color: '#64748B', paddingHorizontal: 16, paddingBottom: 14, lineHeight: 18 },

  expandido: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },

  epiInfoCard:   { margin: 14, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  epiInfoTitulo: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 10, letterSpacing: 0.3, textTransform: 'uppercase' },
  infoRow:       { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  infoIcone:     { marginTop: 1 },
  infoTextos:    { flex: 1 },
  infoLabel:     { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  infoValor:     { fontSize: 13, color: '#374151', lineHeight: 18 },

  divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 14 },

  semVideos:           { fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: 20 },
  videoItem:           { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  videoIconeContainer: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  videoTextos:         { flex: 1 },
  videoTitulo:         { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  videoDesc:           { fontSize: 12, color: '#64748B', marginTop: 3, lineHeight: 17 },
  videoMeta:           { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  metaChip:            { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  metaTexto:           { fontSize: 11, color: '#64748B' },

  rodape: { fontSize: 11, color: '#CBD5E1', textAlign: 'center', marginTop: 8 },
});
