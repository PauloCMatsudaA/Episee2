import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  RefreshControl,
} from 'react-native';

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
