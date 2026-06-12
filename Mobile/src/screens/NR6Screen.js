// src/screens/NR6Screen.js — Tela de consulta à NR-6
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Habilita LayoutAnimation no Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Conteúdo completo da NR-6 ─────────────────────────────────────────────────
const SECOES_NR6 = [
  {
    id: 1,
    titulo: 'O que são EPIs?',
    icone: 'shield-checkmark',
    cor: '#F97316',
    conteudo: [
      {
        tipo: 'texto',
        valor:
          'EPI significa Equipamento de Proteção Individual. São dispositivos ou produtos de uso individual utilizados pelo trabalhador, destinados à proteção de riscos suscetíveis de ameaçar a segurança e a saúde durante o trabalho.',
      },
      {
        tipo: 'texto',
        valor:
          'Todo EPI deve possuir o Certificado de Aprovação (CA) emitido pelo Ministério do Trabalho e Emprego (MTE), que garante que o equipamento foi testado e aprovado segundo normas de segurança.',
      },
    ],
  },
  {
    id: 2,
    titulo: 'Obrigações da Empresa',
    icone: 'business',
    cor: '#3B82F6',
    conteudo: [
      {
        tipo: 'lista',
        itens: [
          'Fornecer o EPI adequado ao risco de cada atividade — gratuitamente',
          'Exigir o uso do EPI pelos trabalhadores',
          'Substituir imediatamente quando danificado ou extraviado',
          'Responsabilizar-se pela higienização e manutenção',
          'Treinar o trabalhador sobre o uso correto do EPI',
          'Registrar o fornecimento no livro ou ficha de controle',
          'Adquirir apenas EPIs com CA válido',
        ],
      },
    ],
  },
  {
    id: 3,
    titulo: 'Obrigações do Trabalhador',
    icone: 'person',
    cor: '#22C55E',
    conteudo: [
      {
        tipo: 'lista',
        itens: [
          'Usar o EPI durante toda a jornada de trabalho',
          'Conservar e guardar o EPI fornecido',
          'Comunicar à empresa qualquer alteração que o torne impróprio',
          'Cumprir as determinações do empregador sobre o uso do EPI',
          'Não alterar as características do EPI',
          'Participar dos treinamentos de uso correto',
        ],
      },
    ],
  },
  {
    id: 4,
    titulo: 'Certificado de Aprovação (CA)',
    icone: 'ribbon',
    cor: '#A855F7',
    conteudo: [
      {
        tipo: 'texto',
        valor:
          'O CA (Certificado de Aprovação) é um número que identifica o registro do EPI no Ministério do Trabalho. Todo EPI vendido no Brasil deve ter CA válido.',
      },
      {
        tipo: 'texto',
        valor:
          'Como verificar: acesse o site do Ministério do Trabalho → "Consulta de CA" e informe o número estampado no EPI. O CA tem validade limitada (geralmente 2 a 5 anos).',
      },
      {
        tipo: 'texto',
        valor:
          'ATENÇÃO: Usar EPI com CA vencido ou falsificado é ilegal e pode resultar em multa para a empresa.',
      },
    ],
  },
  {
    id: 5,
    titulo: 'EPIs por Tipo de Trabalho',
    icone: 'construct',
    cor: '#EAB308',
    conteudo: [
      {
        tipo: 'subtitulo',
        valor: '🏗️ Construção Civil',
        descricao: 'Capacete, botina com biqueira de aço, cinto de segurança, luvas, óculos.',
      },
      {
        tipo: 'subtitulo',
        valor: '⚗️ Produtos Químicos',
        descricao: 'Luvas de borracha, avental impermeável, óculos vedados, respirador.',
      },
      {
        tipo: 'subtitulo',
        valor: '📏 Trabalho em Altura',
        descricao: 'Cinto de segurança tipo paraquedista, talabarte duplo com absorvedor, capacete.',
      },
      {
        tipo: 'subtitulo',
        valor: '🔊 Ambientes Ruidosos',
        descricao: 'Protetor auditivo tipo concha ou inserção (moldável ou pré-moldado).',
      },
      {
        tipo: 'subtitulo',
        valor: '⚡ Risco Elétrico',
        descricao: 'Luvas dielétricas, calçado isolante, capacete com isolamento, ferramentas isoladas.',
      },
    ],
  },
  {
    id: 6,
    titulo: 'Como Solicitar Substituição',
    icone: 'swap-horizontal',
    cor: '#06B6D4',
    conteudo: [
      {
        tipo: 'passos',
        itens: [
          'Identifique o problema: EPI danificado, perdido, com CA vencido ou inadequado.',
          'Acesse o app EPIsee → "Solicitar EPI" ou fale diretamente com seu supervisor.',
          'Informe o tipo de EPI, o motivo da troca e adicione observações relevantes.',
          'Envie a solicitação — o gestor receberá uma notificação imediatamente.',
          'Acompanhe o status em "Minhas Solicitações": Pendente → Aprovada → EPI entregue.',
          'Assine a ficha de entrega do EPI como confirmação de recebimento.',
        ],
      },
    ],
  },
  {
    id: 7,
    titulo: 'Penalidades para Empresas',
    icone: 'warning',
    cor: '#EF4444',
    conteudo: [
      {
        tipo: 'texto',
        valor:
          'O não fornecimento ou a obrigação de compra do EPI pelo trabalhador é infração grave, sujeita à autuação pelo Ministério do Trabalho.',
      },
      {
        tipo: 'lista',
        itens: [
          'Multa de R$ 402,53 a R$ 4.025,33 por infração (Lei 6.514/77)',
          'Embargo ou interdição das atividades em casos graves',
          'Responsabilização civil e criminal em caso de acidentes',
          'Ação trabalhista por parte do empregado lesado',
        ],
      },
      {
        tipo: 'texto',
        valor:
          'Você tem o DIREITO de exigir seu EPI. Se houver recusa, registre a ocorrência e busque o sindicato ou a Delegacia Regional do Trabalho (DRT).',
      },
    ],
  },
];

// ── Componente de seção expansível (Accordion) ────────────────────────────────
function SecaoAccordion({ secao, aberta, onToggle }) {
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle(secao.id);
  };

  return (
    <View style={[estilos.secaoCard, aberta && estilos.secaoCardAberta]}>
      {/* Cabeçalho clicável */}
      <TouchableOpacity style={estilos.secaoHeader} onPress={toggle} activeOpacity={0.75}>
        <View style={[estilos.secaoIconeContainer, { backgroundColor: secao.cor + '18' }]}>
          <Ionicons name={secao.icone} size={20} color={secao.cor} />
        </View>
        <Text style={estilos.secaoTitulo}>{secao.titulo}</Text>
        <Ionicons
          name={aberta ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#94A3B8"
        />
      </TouchableOpacity>

      {/* Conteúdo expandido */}
      {aberta && (
        <View style={estilos.secaoConteudo}>
          <View style={estilos.secaoDivisor} />
          {secao.conteudo.map((bloco, i) => {
            if (bloco.tipo === 'texto') {
              return (
                <Text key={i} style={estilos.blocoTexto}>{bloco.valor}</Text>
              );
            }
            if (bloco.tipo === 'lista') {
              return (
                <View key={i} style={estilos.blocoLista}>
                  {bloco.itens.map((item, j) => (
                    <View key={j} style={estilos.listaItem}>
                      <View style={[estilos.listaBullet, { backgroundColor: secao.cor }]} />
                      <Text style={estilos.listaTexto}>{item}</Text>
                    </View>
                  ))}
                </View>
              );
            }
            if (bloco.tipo === 'subtitulo') {
              return (
                <View key={i} style={estilos.subtituloContainer}>
                  <Text style={estilos.subtituloTexto}>{bloco.valor}</Text>
                  <Text style={estilos.subtituloDescricao}>{bloco.descricao}</Text>
                </View>
              );
            }
            if (bloco.tipo === 'passos') {
              return (
                <View key={i} style={estilos.blocoLista}>
                  {bloco.itens.map((item, j) => (
                    <View key={j} style={estilos.passoItem}>
                      <View style={[estilos.passoBadge, { backgroundColor: secao.cor }]}>
                        <Text style={estilos.passoNumero}>{j + 1}</Text>
                      </View>
                      <Text style={estilos.listaTexto}>{item}</Text>
                    </View>
                  ))}
                </View>
              );
            }
            return null;
          })}
        </View>
      )}
    </View>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────
export default function NR6Screen() {
  const [busca, setBusca]     = useState('');
  const [aberta, setAberta]   = useState(null); // ID da seção aberta

  const toggle = (id) => setAberta(aberta === id ? null : id);

  // Filtragem por busca
  const secoesFiltradas = useMemo(() => {
    if (!busca.trim()) return SECOES_NR6;
    const termo = busca.toLowerCase();
    return SECOES_NR6.filter((s) =>
      s.titulo.toLowerCase().includes(termo) ||
      s.conteudo.some((b) => {
        if (b.valor)  return b.valor.toLowerCase().includes(termo);
        if (b.itens)  return b.itens.some((i) => i.toLowerCase().includes(termo));
        if (b.descricao) return b.descricao.toLowerCase().includes(termo);
        return false;
      })
    );
  }, [busca]);

  return (
    <SafeAreaView style={estilos.container}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={estilos.header}>
        <View>
          <Text style={estilos.headerTitulo}>NR-6</Text>
          <Text style={estilos.headerSubtitulo}>Seus Direitos e Deveres</Text>
        </View>
        <View style={estilos.nrBadge}>
          <Ionicons name="book" size={18} color="#3B82F6" />
        </View>
      </View>

      {/* ── Barra de busca ──────────────────────────────────────────────── */}
      <View style={estilos.buscaContainer}>
        <Ionicons name="search" size={18} color="#94A3B8" />
        <TextInput
          style={estilos.buscaInput}
          placeholder="Buscar tópico na NR-6..."
          placeholderTextColor="#94A3B8"
          value={busca}
          onChangeText={setBusca}
          clearButtonMode="while-editing"
        />
        {busca.length > 0 && (
          <TouchableOpacity onPress={() => setBusca('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Lista de seções ──────────────────────────────────────────────── */}
      <ScrollView
        style={estilos.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={estilos.scrollContent}
      >
        {/* Banner informativo */}
        <View style={estilos.bannerInfo}>
          <Ionicons name="information-circle" size={18} color="#3B82F6" />
          <Text style={estilos.bannerTexto}>
            A NR-6 regulamenta o fornecimento, uso e controle de EPIs no Brasil.
            Toque em cada seção para expandir.
          </Text>
        </View>

        {secoesFiltradas.length === 0 ? (
          <View style={estilos.semResultados}>
            <Ionicons name="search" size={48} color="#CBD5E1" />
            <Text style={estilos.semResultadosTexto}>Nenhum resultado para "{busca}"</Text>
          </View>
        ) : (
          secoesFiltradas.map((secao) => (
            <SecaoAccordion
              key={secao.id}
              secao={secao}
              aberta={aberta === secao.id}
              onToggle={toggle}
            />
          ))
        )}

        <Text style={estilos.rodape}>
          Fonte: Portaria MTb n.º 3.214/1978 — Norma Regulamentadora nº 6 (NR-6) e atualizações.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitulo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitulo: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  nrBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Busca
  buscaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 46,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  buscaInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    height: 46,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },

  // Banner informativo
  bannerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  bannerTexto: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },

  // Card de seção (accordion)
  secaoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  secaoCardAberta: {
    shadowOpacity: 0.1,
    elevation: 4,
  },
  secaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  secaoIconeContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secaoTitulo: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  secaoDivisor: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 14,
    marginBottom: 14,
  },
  secaoConteudo: {
    paddingHorizontal: 14,
    paddingBottom: 16,
  },

  // Bloco de texto
  blocoTexto: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 21,
    marginBottom: 12,
  },

  // Lista com bullets
  blocoLista: {
    gap: 8,
    marginBottom: 4,
  },
  listaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  listaBullet: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 7,
    flexShrink: 0,
  },
  listaTexto: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },

  // Subtítulo (tipo de trabalho)
  subtituloContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  subtituloTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtituloDescricao: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },

  // Passos numerados
  passoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  passoBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  passoNumero: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Sem resultados
  semResultados: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  semResultadosTexto: {
    fontSize: 15,
    color: '#94A3B8',
  },

  // Rodapé
  rodape: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 16,
    paddingHorizontal: 8,
    lineHeight: 16,
  },
});
