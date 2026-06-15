// src/screens/TrainingScreen.js — Tela de Vídeos de Treinamento por Categoria
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

export default function TrainingScreen() {
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandido, setExpandido] = useState({});
  const [erro, setErro] = useState(null);

  const carregarVideos = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setCarregando(true);
    setErro(null);
    try {
      const dados = await getVideosWorker();
      setCategorias(Array.isArray(dados) ? dados : []);
    } catch (err) {
      console.warn('[TrainingScreen] Erro:', err.message);
      setErro('Não foi possível carregar os vídeos. Verifique sua conexão.');
      setCategorias([]);
    } finally {
      setCarregando(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregarVideos(); }, [carregarVideos]));

  const toggleCategoria = (id) => {
    setExpandido((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const abrirVideo = (url) => {
    if (!url) return;
    // URL interna do servidor → usa Linking apenas se for URL externa
    if (url.startsWith('http://') || url.startsWith('https://')) {
      Linking.openURL(url).catch(() =>
        Alert.alert('Erro', 'Não foi possível abrir o vídeo.')
      );
    } else {
      Alert.alert('Vídeo', 'Este vídeo está hospedado no servidor da empresa.\nAcesse pelo aplicativo quando disponível.');
    }
  };

  const totalVideos = categorias.reduce((acc, cat) => acc + (cat.videos?.length || 0), 0);

  if (carregando) {
    return (
      <SafeAreaView style={estilos.container}>
        <View style={estilos.carregandoContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={estilos.carregandoTexto}>Carregando vídeos...</Text>
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
        {/* Header */}
        <View style={estilos.header}>
          <View style={estilos.headerIcone}>
            <Ionicons name="play-circle" size={28} color="#F97316" />
          </View>
          <View style={estilos.headerTextos}>
            <Text style={estilos.headerTitulo}>Vídeos de Treinamento</Text>
            <Text style={estilos.headerSub}>
              {totalVideos} vídeo{totalVideos !== 1 ? 's' : ''} em {categorias.length} categoria{categorias.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Erro */}
        {erro && (
          <View style={estilos.erroCard}>
            <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
            <Text style={estilos.erroTexto}>{erro}</Text>
          </View>
        )}

        {/* Sem vídeos */}
        {!erro && categorias.length === 0 && (
          <View style={estilos.vazioContainer}>
            <Ionicons name="videocam-outline" size={52} color="#CBD5E1" />
            <Text style={estilos.vazioTitulo}>Nenhum vídeo disponível</Text>
            <Text style={estilos.vazioSub}>
              O gestor ainda não adicionou vídeos de treinamento.
            </Text>
          </View>
        )}

        {/* Categorias */}
        {categorias.map((categoria) => {
          const aberto = expandido[categoria.id] ?? false;
          const videos = (categoria.videos || []).filter((v) => v.aprovado);

          return (
            <View key={categoria.id} style={estilos.categoriaCard}>
              {/* Header da categoria */}
              <TouchableOpacity
                style={estilos.categoriaHeader}
                onPress={() => toggleCategoria(categoria.id)}
                activeOpacity={0.75}
              >
                <View style={estilos.categoriaHeaderEsq}>
                  <View style={estilos.categoriaIcone}>
                    <Ionicons name="shield-checkmark" size={20} color="#F97316" />
                  </View>
                  <View>
                    <Text style={estilos.categoriaNome}>{categoria.nome}</Text>
                    <Text style={estilos.categoriaCount}>
                      {videos.length} vídeo{videos.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={aberto ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#94A3B8"
                />
              </TouchableOpacity>

              {/* Descrição da categoria */}
              {categoria.descricao ? (
                <Text style={estilos.categoriaDesc}>{categoria.descricao}</Text>
              ) : null}

              {/* Lista de vídeos */}
              {aberto && (
                <View style={estilos.videosLista}>
                  {videos.length === 0 ? (
                    <Text style={estilos.semVideos}>Nenhum vídeo aprovado nesta categoria.</Text>
                  ) : (
                    videos
                      .sort((a, b) => b.prioridade - a.prioridade)
                      .map((video, idx) => (
                        <TouchableOpacity
                          key={video.id || idx}
                          style={estilos.videoItem}
                          onPress={() => abrirVideo(video.url)}
                          activeOpacity={0.75}
                        >
                          <View style={estilos.videoIconeContainer}>
                            <Ionicons name="play-circle" size={36} color="#F97316" />
                          </View>
                          <View style={estilos.videoTextos}>
                            <Text style={estilos.videoTitulo}>{video.titulo}</Text>
                            {video.descricao ? (
                              <Text style={estilos.videoDesc} numberOfLines={2}>
                                {video.descricao}
                              </Text>
                            ) : null}
                            {video.fonte ? (
                              <Text style={estilos.videoFonte}>Fonte: {video.fonte}</Text>
                            ) : null}
                          </View>
                          <Ionicons name="open-outline" size={16} color="#94A3B8" />
                        </TouchableOpacity>
                      ))
                  )}
                </View>
              )}
            </View>
          );
        })}

        <Text style={estilos.rodape}>
          Puxe para baixo para atualizar os vídeos
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#F1F5F9' },
  scroll:              { paddingHorizontal: 16, paddingBottom: 32 },

  carregandoContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  carregandoTexto:     { fontSize: 14, color: '#64748B' },

  header:              { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 20, paddingBottom: 20 },
  headerIcone:         { width: 48, height: 48, borderRadius: 14, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center' },
  headerTextos:        { flex: 1 },
  headerTitulo:        { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  headerSub:           { fontSize: 13, color: '#64748B', marginTop: 2 },

  erroCard:            { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, marginBottom: 16 },
  erroTexto:           { flex: 1, fontSize: 13, color: '#DC2626' },

  vazioContainer:      { alignItems: 'center', paddingVertical: 60, gap: 12 },
  vazioTitulo:         { fontSize: 16, fontWeight: '700', color: '#475569' },
  vazioSub:            { fontSize: 13, color: '#94A3B8', textAlign: 'center', maxWidth: 260 },

  categoriaCard:       { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, overflow: 'hidden' },
  categoriaHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  categoriaHeaderEsq:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  categoriaIcone:      { width: 40, height: 40, borderRadius: 10, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center' },
  categoriaNome:       { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  categoriaCount:      { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  categoriaDesc:       { fontSize: 13, color: '#64748B', paddingHorizontal: 16, paddingBottom: 12, lineHeight: 18 },

  videosLista:         { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  semVideos:           { fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: 20 },

  videoItem:           { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  videoIconeContainer: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  videoTextos:         { flex: 1 },
  videoTitulo:         { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  videoDesc:           { fontSize: 12, color: '#64748B', marginTop: 2, lineHeight: 16 },
  videoFonte:          { fontSize: 11, color: '#94A3B8', marginTop: 4 },

  rodape:              { fontSize: 11, color: '#CBD5E1', textAlign: 'center', marginTop: 8 },
});
