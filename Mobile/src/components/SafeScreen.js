// src/components/SafeScreen.js — Wrapper de tela segura com scroll
import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  RefreshControl,
} from 'react-native';

/**
 * SafeScreen — Wrapper padrão para todas as telas
 *
 * Props:
 * - backgroundColor: cor do fundo (padrão: #F1F5F9)
 * - scrollable: habilita scroll (padrão: true)
 * - refreshing: estado de pull-to-refresh
 * - onRefresh: callback de pull-to-refresh
 * - padding: padding horizontal interno (padrão: 16)
 * - children: conteúdo da tela
 */
export default function SafeScreen({
  children,
  backgroundColor = '#F1F5F9',
  scrollable = true,
  refreshing = false,
  onRefresh = null,
  padding = 16,
  style,
}) {
  const conteudo = (
    <View style={[estilos.inner, { paddingHorizontal: padding }, style]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[estilos.container, { backgroundColor }]}>
      {scrollable ? (
        <ScrollView
          style={estilos.scroll}
          contentContainerStyle={estilos.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#F97316"
                colors={['#F97316']}
              />
            ) : undefined
          }
        >
          {conteudo}
        </ScrollView>
      ) : (
        conteudo
      )}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  inner: {
    flex: 1,
  },
});
