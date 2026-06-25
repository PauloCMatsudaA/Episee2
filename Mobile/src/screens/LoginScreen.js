import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const CORES = {
  primaria:       '#F97316',
  primariaEscura: '#EA6C0A',
  escura:         '#0F172A',
  slate400:       '#94A3B8',
  branco:         '#FFFFFF',
  erro:           '#EF4444',
};

export default function LoginScreen() {
  const { login } = useAuth();

  const [email, setEmail]               = useState('');
  const [senha, setSenha]               = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando]     = useState(false);
  const [erro, setErro]                 = useState('');

  const handleLogin = async () => {
    setErro('');
    if (!email.trim()) { setErro('Informe seu e-mail para continuar.'); return; }
    if (!senha.trim()) { setErro('Informe sua senha para continuar.'); return; }
    setCarregando(true);
    try {
      await login(email.trim(), senha);
    } catch (err) {
      setErro(err.message || 'Credenciais inválidas. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#0F172A']}
      locations={[0, 0.5, 1]}
      style={estilos.gradiente}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={estilos.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={estilos.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {}
          <View style={estilos.logoContainer}>
            <Text style={estilos.logoTexto}>EPIsee</Text>
          </View>

          {}
          <View style={estilos.card}>
            <Text style={estilos.cardTitulo}>Acessar minha conta</Text>

            {}
            <View style={estilos.campoContainer}>
              <Text style={estilos.campoLabel}>E-mail</Text>
              <View style={estilos.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color={CORES.slate400} style={estilos.inputIcone} />
                <TextInput
                  style={estilos.input}
                  placeholder="seu@email.com"
                  placeholderTextColor={CORES.slate400}
                  value={email}
                  onChangeText={(t) => { setEmail(t); setErro(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!carregando}
                />
              </View>
            </View>

            {}
            <View style={estilos.campoContainer}>
              <Text style={estilos.campoLabel}>Senha</Text>
              <View style={estilos.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={CORES.slate400} style={estilos.inputIcone} />
                <TextInput
                  style={[estilos.input, estilos.inputSenha]}
                  placeholder="••••••••"
                  placeholderTextColor={CORES.slate400}
                  value={senha}
                  onChangeText={(t) => { setSenha(t); setErro(''); }}
                  secureTextEntry={!mostrarSenha}
                  autoCapitalize="none"
                  editable={!carregando}
                />
                <TouchableOpacity
                  onPress={() => setMostrarSenha(!mostrarSenha)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={mostrarSenha ? 'eye-outline' : 'eye-off-outline'}
                    size={18}
                    color={CORES.slate400}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {}
            {erro ? (
              <View style={estilos.erroContainer}>
                <Ionicons name="alert-circle" size={16} color={CORES.erro} />
                <Text style={estilos.erroTexto}>{erro}</Text>
              </View>
            ) : null}

            {}
            <TouchableOpacity
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={carregando}
              style={estilos.botaoWrapper}
            >
              <LinearGradient
                colors={[CORES.primaria, CORES.primariaEscura]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={estilos.botao}
              >
                {carregando ? (
                  <ActivityIndicator size="small" color={CORES.branco} />
                ) : (
                  <>
                    <Ionicons name="log-in-outline" size={20} color={CORES.branco} />
                    <Text style={estilos.botaoTexto}>Entrar</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const estilos = StyleSheet.create({
  gradiente:     { flex: 1 },
  keyboardAvoid: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoTexto: { fontSize: 38, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 12,
  },
  cardTitulo:    { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 20 },
  campoContainer: { marginBottom: 16 },
  campoLabel:    { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6, marginLeft: 2 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8,
    backgroundColor: '#FAFAFA', paddingHorizontal: 12, height: 50,
  },
  inputIcone:  { marginRight: 8 },
  input:       { flex: 1, fontSize: 15, color: '#0F172A', height: 50 },
  inputSenha:  { flex: 1 },
  erroContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FEE2E2', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, gap: 8,
  },
  erroTexto:   { fontSize: 13, color: '#EF4444', flex: 1, fontWeight: '500' },
  botaoWrapper: { marginTop: 4, borderRadius: 12, overflow: 'hidden' },
  botao: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    padding: 16, gap: 8, borderRadius: 12,
  },
  botaoTexto:  { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});
