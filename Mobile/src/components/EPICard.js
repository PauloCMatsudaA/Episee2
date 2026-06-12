// src/components/EPICard.js — Card de EPI individual
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * EPICard — Exibe informações de um tipo de EPI
 *
 * Props:
 * - icone: nome do ícone Ionicons (ex: 'shield-checkmark')
 * - corIcone: cor do ícone (padrão: #F97316)
 * - nome: nome do EPI
 * - descricao: descrição curta
 * - onPress: callback ao tocar no card
 * - badge: texto opcional (ex: "CA válido")
 */
export default function EPICard({
  icone = 'shield-checkmark',
  corIcone = '#F97316',
  nome,
  descricao,
  onPress,
  badge,
  badgeColor = '#22C55E',
}) {
  return (
    <TouchableOpacity
      style={estilos.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      disabled={!onPress}
    >
      {/* Ícone com fundo colorido */}
      <View style={[estilos.iconContainer, { backgroundColor: corIcone + '18' }]}>
        <Ionicons name={icone} size={28} color={corIcone} />
      </View>

      {/* Conteúdo textual */}
      <View style={estilos.conteudo}>
        <Text style={estilos.nome} numberOfLines={1}>{nome}</Text>
        {descricao ? (
          <Text style={estilos.descricao} numberOfLines={2}>{descricao}</Text>
        ) : null}
      </View>

      {/* Badge opcional */}
      {badge ? (
        <View style={[estilos.badge, { backgroundColor: badgeColor + '20' }]}>
          <Text style={[estilos.badgeTexto, { color: badgeColor }]}>{badge}</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
      )}
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  conteudo: {
    flex: 1,
  },
  nome: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  descricao: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginLeft: 8,
  },
  badgeTexto: {
    fontSize: 12,
    fontWeight: '600',
  },
});
