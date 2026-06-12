// src/components/InfoCard.js — Card informativo genérico
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * InfoCard — Card informativo genérico e flexível
 *
 * Props:
 * - titulo: título do card
 * - icone: nome do ícone Ionicons
 * - corIcone: cor do ícone (padrão: #F97316)
 * - children: conteúdo interno
 * - onPress: callback opcional
 * - estilo: estilo adicional para o container
 * - mostrarChevron: exibe seta de navegação (padrão: false)
 */
export default function InfoCard({
  titulo,
  icone,
  corIcone = '#F97316',
  children,
  onPress,
  estilo,
  mostrarChevron = false,
}) {
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      style={[estilos.card, estilo]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Cabeçalho do card */}
      {(titulo || icone) && (
        <View style={estilos.cabecalho}>
          {icone && (
            <View style={[estilos.iconContainer, { backgroundColor: corIcone + '18' }]}>
              <Ionicons name={icone} size={20} color={corIcone} />
            </View>
          )}
          {titulo && (
            <Text style={estilos.titulo}>{titulo}</Text>
          )}
          {mostrarChevron && (
            <Ionicons
              name="chevron-forward"
              size={18}
              color="#CBD5E1"
              style={estilos.chevron}
            />
          )}
        </View>
      )}

      {/* Conteúdo */}
      {children && (
        <View style={titulo || icone ? estilos.conteudo : null}>
          {children}
        </View>
      )}
    </Wrapper>
  );
}

/**
 * InfoCard.Item — Linha de item dentro de um InfoCard
 *
 * Props:
 * - label: rótulo
 * - valor: valor
 * - icone: ícone opcional
 * - ultimo: remove a borda inferior (padrão: false)
 */
InfoCard.Item = function InfoCardItem({ label, valor, icone, ultimo = false }) {
  return (
    <View style={[estilosItem.row, ultimo && estilosItem.ultimo]}>
      {icone && (
        <Ionicons name={icone} size={16} color="#94A3B8" style={estilosItem.icone} />
      )}
      <Text style={estilosItem.label}>{label}</Text>
      <Text style={estilosItem.valor}>{valor}</Text>
    </View>
  );
};

const estilos = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  titulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  chevron: {
    marginLeft: 8,
  },
  conteudo: {
    marginTop: 12,
  },
});

const estilosItem = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  ultimo: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  icone: {
    marginRight: 10,
  },
  label: {
    fontSize: 14,
    color: '#64748B',
    flex: 1,
  },
  valor: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
    maxWidth: '55%',
    textAlign: 'right',
  },
});
