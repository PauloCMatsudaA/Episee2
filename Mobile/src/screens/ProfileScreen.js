import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { getMeuPerfil, getSetores } from '../api/api';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  const [perfil, setPerfil]         = useState(user || {});
  const [nomeSetor, setNomeSetor]   = useState('');
  const [carregando, setCarregando] = useState(true);
  const [saindo, setSaindo]         = useState(false);

  useEffect(() => {
    const buscar = async () => {
      try {
        const dados = await getMeuPerfil();
        setPerfil((prev) => ({ ...prev, ...dados }));
        if (dados.sector_id || user?.sector_id) {
          const setores = await getSetores();
          const id = dados.sector_id || user?.sector_id;
          const setor = setores.find((s) => s.id === id);
          setNomeSetor(setor?.nome || setor?.name || `Setor ${id}`);
        }
      } catch (err) {
        console.warn('[ProfileScreen]', err.message);
      } finally {
        setCarregando(false);
      }
    };
    buscar();
  }, []);

  const nome    = perfil?.name || perfil?.nome || 'Usuário';
  const inicial = nome[0].toUpperCase();

  const fazerLogout = async () => {
    try {
      setSaindo(true);
      
      await AsyncStorage.multiRemove(['@episee:token', '@episee:user']);
      
      await logout();
    } catch (err) {
      console.warn('[logout]', err.message);
      
      logout();
    } finally {
      setSaindo(false);
    }
  };

  const confirmarLogout = () => {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair do EPIsee?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: fazerLogout },
      ]
    );
  };

  const infos = [
    { icone: 'business-outline', cor: '#22C55E', label: 'Setor',    valor: nomeSetor || (perfil?.sector_id ? `Setor ${perfil.sector_id}` : null) },
    { icone: 'mail-outline',     cor: '#F97316', label: 'E-mail',   valor: perfil?.email },
    { icone: 'call-outline',     cor: '#A855F7', label: 'Telefone', valor: perfil?.phone || perfil?.telefone },
  ];

  return (
    <SafeAreaView style={estilos.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={estilos.scroll}
        bounces
      >
        {}
        <TouchableOpacity style={estilos.botaoVoltar} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
          <Text style={estilos.botaoVoltarTexto}>Voltar</Text>
        </TouchableOpacity>

        {}
        <View style={estilos.avatarArea}>
          <LinearGradient colors={['#F97316', '#EA580C']} style={estilos.avatarGradiente}>
            {carregando
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Text style={estilos.avatarLetra}>{inicial}</Text>
            }
          </LinearGradient>
          <Text style={estilos.nome}>{nome}</Text>
        </View>

        {}
        <View style={estilos.card}>
          {infos.map((item, index) => (
            <View key={item.label} style={[estilos.row, index === infos.length - 1 && estilos.rowUltimo]}>
              <View style={[estilos.iconeContainer, { backgroundColor: item.cor + '18' }]}>
                <Ionicons name={item.icone} size={18} color={item.cor} />
              </View>
              <View style={estilos.textos}>
                <Text style={estilos.label}>{item.label}</Text>
                <Text style={estilos.valor}>{item.valor || '—'}</Text>
              </View>
            </View>
          ))}
        </View>

        {}
        <TouchableOpacity
          style={[estilos.botaoSair, saindo && { opacity: 0.6 }]}
          onPress={confirmarLogout}
          activeOpacity={0.8}
          disabled={saindo}
        >
          {saindo
            ? <ActivityIndicator size="small" color="#EF4444" />
            : <>
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                <Text style={estilos.botaoSairTexto}>Sair da conta</Text>
              </>
          }
        </TouchableOpacity>

        <Text style={estilos.versao}>EPIsee v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#F1F5F9' },
  scroll:           { paddingBottom: 48 },

  botaoVoltar:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 4 },
  botaoVoltarTexto: { fontSize: 16, fontWeight: '600', color: '#0F172A' },

  avatarArea:       { alignItems: 'center', paddingTop: 28, paddingBottom: 28 },
  avatarGradiente:  {
    width: 96, height: 96, borderRadius: 48,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#F97316', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
    borderWidth: 3, borderColor: '#FFFFFF', marginBottom: 16,
  },
  avatarLetra:      { fontSize: 38, fontWeight: '800', color: '#FFFFFF' },
  nome:             { fontSize: 22, fontWeight: '800', color: '#0F172A' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  rowUltimo:        { borderBottomWidth: 0 },
  iconeContainer:   { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  textos:           { flex: 1 },
  label:            { fontSize: 12, color: '#94A3B8', marginBottom: 2 },
  valor:            { fontSize: 15, fontWeight: '600', color: '#0F172A' },

  botaoSair: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 20,
    paddingVertical: 16, borderRadius: 14,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
  },
  botaoSairTexto:   { fontSize: 15, fontWeight: '700', color: '#EF4444' },

  versao:           { textAlign: 'center', fontSize: 12, color: '#CBD5E1' },
});
