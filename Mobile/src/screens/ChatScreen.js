// src/screens/ChatScreen.js — Chatbot EPIsee (NR-6 + GPT-4o)
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useChatbot } from '../hooks/useChatbot';

const COR = {
  primaria:  '#F97316',
  preto:     '#0F172A',
  cinzaEsc:  '#334155',
  cinza:     '#64748B',
  cinzaCl:   '#94A3B8',
  fundo:     '#F1F5F9',
  branco:    '#FFFFFF',
  bolhaBot:  '#FFFFFF',
  bolhaUser: '#F97316',
  digitando: '#E2E8F0',
};


function BolhaMensagem({ mensagem }) {
  const ehBot     = mensagem.role === 'bot';
  const horaTexto = mensagem.timestamp.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[estilos.bolhaContainer, ehBot ? estilos.bolhaEsquerda : estilos.bolhaDireita]}>
      {ehBot && (
        <View style={estilos.avatarBot}>
          <Ionicons name="shield-checkmark" size={16} color={COR.branco} />
        </View>
      )}
      <View style={[estilos.bolha, ehBot ? estilos.bolhaBotEstilo : estilos.bolhaUserEstilo]}>
        <Text style={[estilos.bolhaTexto, ehBot ? estilos.bolhaTextBot : estilos.bolhaTextUser]}>
          {mensagem.text}
        </Text>
        <Text style={[estilos.horario, ehBot ? estilos.horarioBot : estilos.horarioUser]}>
          {horaTexto}
        </Text>
      </View>
    </View>
  );
}

function IndicadorDigitando() {
  return (
    <View style={estilos.bolhaContainer}>
      <View style={estilos.avatarBot}>
        <Ionicons name="shield-checkmark" size={16} color={COR.branco} />
      </View>
      <View style={[estilos.bolha, estilos.bolhaBotEstilo, estilos.digitandoContainer]}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[estilos.ponto, { opacity: 0.4 + i * 0.2 }]} />
        ))}
      </View>
    </View>
  );
}

function PerguntaRapida({ texto, aoPress }) {
  return (
    <TouchableOpacity style={estilos.perguntaRapida} onPress={() => aoPress(texto)} activeOpacity={0.75}>
      <Text style={estilos.perguntaRapidaTexto}>{texto}</Text>
    </TouchableOpacity>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────

export default function ChatScreen({ navigation }) {
  const { user }                                       = useAuth();
  const { messages, isLoading, quickQuestions,
          sendMessage, clearHistory }                  = useChatbot(user?.telefone ?? 'app-user');
  const [texto, setTexto]                              = useState('');
  const listaRef                                       = useRef(null);
  const mostrarPerguntasRapidas                        = messages.length <= 1;

  // Auto-scroll ao final quando novas mensagens chegam
  useEffect(() => {
    if (listaRef.current && messages.length > 0) {
      setTimeout(() => listaRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, isLoading]);

  function enviar() {
    if (!texto.trim()) return;
    sendMessage(texto);
    setTexto('');
  }

  function enviarPerguntaRapida(pergunta) {
    sendMessage(pergunta);
  }

  return (
    <SafeAreaView style={estilos.container} edges={['top']}>
      {/* Cabeçalho */}
      <View style={estilos.cabecalho}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={estilos.botaoVoltar}>
          <Ionicons name="arrow-back" size={22} color={COR.branco} />
        </TouchableOpacity>

        <View style={estilos.cabecalhoInfo}>
          <View style={estilos.avatarCabecalho}>
            <Ionicons name="shield-checkmark" size={20} color={COR.branco} />
          </View>
          <View>
            <Text style={estilos.cabecalhoNome}>Assistente EPIsee</Text>
            <View style={estilos.statusOnline}>
              <View style={estilos.pontooOnline} />
              <Text style={estilos.statusTexto}>Online · NR-6 + GPT-4o</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={clearHistory} style={estilos.botaoLimpar}>
          <Ionicons name="refresh" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>

      {/* Lista de mensagens */}
      <KeyboardAvoidingView
        style={estilos.corpo}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listaRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <BolhaMensagem mensagem={item} />}
          contentContainerStyle={estilos.listaPadding}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={isLoading ? <IndicadorDigitando /> : null}
          onContentSizeChange={() => listaRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Perguntas rápidas — só aparece no início da conversa */}
        {mostrarPerguntasRapidas && !isLoading && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={estilos.perguntasRapidasContainer}
            contentContainerStyle={estilos.perguntasRapidasScroll}
          >
            {quickQuestions.map((q) => (
              <PerguntaRapida key={q} texto={q} aoPress={enviarPerguntaRapida} />
            ))}
          </ScrollView>
        )}

        {/* Barra de input */}
        <View style={estilos.barraInput}>
          <View style={estilos.inputContainer}>
            <TextInput
              style={estilos.input}
              value={texto}
              onChangeText={setTexto}
              placeholder="Pergunte sobre EPIs ou NR-6..."
              placeholderTextColor={COR.cinzaCl}
              multiline
              maxLength={500}
              onSubmitEditing={enviar}
              returnKeyType="send"
              blurOnSubmit
            />
          </View>

          <TouchableOpacity
            style={[estilos.botaoEnviar, (!texto.trim() || isLoading) && estilos.botaoEnviarDesabilitado]}
            onPress={enviar}
            disabled={!texto.trim() || isLoading}
            activeOpacity={0.85}
          >
            {isLoading
              ? <ActivityIndicator size="small" color={COR.branco} />
              : <Ionicons name="send" size={18} color={COR.branco} />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COR.fundo,
  },

  // Cabeçalho
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COR.preto,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  botaoVoltar: {
    padding: 6,
  },
  cabecalhoInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCabecalho: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COR.primaria,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cabecalhoNome: {
    fontSize: 15,
    fontWeight: '700',
    color: COR.branco,
  },
  statusOnline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  pontooOnline: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  statusTexto: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  botaoLimpar: {
    padding: 6,
  },

  // Corpo
  corpo: {
    flex: 1,
  },
  listaPadding: {
    padding: 12,
    paddingBottom: 4,
  },

  // Bolhas
  bolhaContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
    gap: 8,
  },
  bolhaEsquerda: {
    justifyContent: 'flex-start',
  },
  bolhaDireita: {
    justifyContent: 'flex-end',
  },
  avatarBot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COR.primaria,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  bolha: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bolhaBotEstilo: {
    backgroundColor: COR.bolhaBot,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  bolhaUserEstilo: {
    backgroundColor: COR.bolhaUser,
    borderBottomRightRadius: 4,
  },
  bolhaTexto: {
    fontSize: 14,
    lineHeight: 20,
  },
  bolhaTextBot: {
    color: COR.cinzaEsc,
  },
  bolhaTextUser: {
    color: COR.branco,
  },
  horario: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  horarioBot: {
    color: COR.cinzaCl,
  },
  horarioUser: {
    color: 'rgba(255,255,255,0.7)',
  },

  // Indicador digitando
  digitandoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  ponto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COR.cinzaCl,
  },

  // Perguntas rápidas
  perguntasRapidasContainer: {
    maxHeight: 50,
    marginBottom: 4,
  },
  perguntasRapidasScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  perguntaRapida: {
    backgroundColor: COR.branco,
    borderWidth: 1.5,
    borderColor: COR.primaria,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  perguntaRapidaTexto: {
    fontSize: 12,
    color: COR.primaria,
    fontWeight: '600',
  },

  // Barra de input
  barraInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    paddingBottom: 14,
    backgroundColor: COR.branco,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: COR.fundo,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    maxHeight: 120,
    justifyContent: 'center',
  },
  input: {
    fontSize: 14,
    color: COR.cinzaEsc,
    lineHeight: 20,
  },
  botaoEnviar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COR.primaria,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COR.primaria,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  botaoEnviarDesabilitado: {
    backgroundColor: COR.cinzaCl,
    shadowOpacity: 0,
    elevation: 0,
  },
});
