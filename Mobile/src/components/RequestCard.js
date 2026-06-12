// src/components/RequestCard.js — Card de solicitação de EPI
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Mapeamento de status para cores e ícones
const STATUS_CONFIG = {
  Pendente:  { cor: '#EAB308', fundo: '#FEF9C3', icone: 'time-outline',         label: 'Pendente'  },
  Aprovada:  { cor: '#22C55E', fundo: '#DCFCE7', icone: 'checkmark-circle',     label: 'Aprovada'  },
  Rejeitada: { cor: '#EF4444', fundo: '#FEE2E2', icone: 'close-circle-outline', label: 'Rejeitada' },
};

// Ícones por tipo de EPI
const EPI_ICONES = {
  'Capacete de Segurança':  'construct-outline',
  'Luva de Proteção':       'hand-left-outline',
  'Óculos de Proteção':     'glasses-outline',
  'Cinto de Segurança':     'link-outline',
  'Colete Refletivo':       'shirt-outline',
  'Máscara de Proteção':    'medical-outline',
  'Botina de Segurança':    'footsteps-outline',
  'Protetor Auditivo':      'ear-outline',
};

/**
 * Formata data ISO para dd/mm/aaaa
 */
function formatarData(dataISO) {
  if (!dataISO) return '';
  const d = new Date(dataISO);
  return d.toLocaleDateString('pt-BR', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  });
}

/**
 * RequestCard — Card de solicitação de EPI
 *
 * Props:
 * - tipoEpi: string (nome do EPI)
 * - motivo: string
 * - observacoes: string (opcional)
 * - setor: string
 * - status: 'Pendente' | 'Aprovada' | 'Rejeitada'
 * - dataSolicitacao: string ISO
 */
export default function RequestCard({
  tipoEpi,
  motivo,
  observacoes,
  setor,
  status = 'Pendente',
  dataSolicitacao,
}) {
  const cfg    = STATUS_CONFIG[status] || STATUS_CONFIG.Pendente;
  const iconeEpi = EPI_ICONES[tipoEpi] || 'shield-outline';

  return (
    <View style={estilos.card}>
      {/* Cabeçalho: ícone + nome + badge de status */}
      <View style={estilos.cabecalho}>
        <View style={estilos.iconContainer}>
          <Ionicons name={iconeEpi} size={22} color="#F97316" />
        </View>
        <View style={estilos.cabecalhoInfo}>
          <Text style={estilos.tipoEpi} numberOfLines={1}>{tipoEpi}</Text>
          <Text style={estilos.setor}>{setor}</Text>
        </View>
        {/* Badge de status */}
        <View style={[estilos.badge, { backgroundColor: cfg.fundo }]}>
          <Ionicons name={cfg.icone} size={13} color={cfg.cor} />
          <Text style={[estilos.badgeTexto, { color: cfg.cor }]}>{cfg.label}</Text>
        </View>
      </View>

      {/* Divisor */}
      <View style={estilos.divisor} />

      {/* Detalhes */}
      <View style={estilos.detalhes}>
        <View style={estilos.detalheRow}>
          <Ionicons name="alert-circle-outline" size={14} color="#94A3B8" />
          <Text style={estilos.detalheLabel}>Motivo: </Text>
          <Text style={estilos.detalheValor} numberOfLines={1}>{motivo}</Text>
        </View>
        {observacoes ? (
          <View style={estilos.detalheRow}>
            <Ionicons name="chatbox-ellipses-outline" size={14} color="#94A3B8" />
            <Text style={estilos.detalheLabel}>Obs: </Text>
            <Text style={estilos.detalheValor} numberOfLines={2}>{observacoes}</Text>
          </View>
        ) : null}
        <View style={estilos.detalheRow}>
          <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
          <Text style={estilos.detalheLabel}>Solicitado em: </Text>
          <Text style={estilos.detalheValor}>{formatarData(dataSolicitacao)}</Text>
        </View>
      </View>
    </View>
  );
}

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
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cabecalhoInfo: {
    flex: 1,
  },
  tipoEpi: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  setor: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  badgeTexto: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 3,
  },
  divisor: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  detalhes: {
    gap: 6,
  },
  detalheRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  detalheLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  detalheValor: {
    fontSize: 13,
    color: '#0F172A',
    flex: 1,
  },
});
