// src/navigation/AppNavigator.js — Navegação principal do EPIsee
import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator }      from '@react-navigation/stack';
import { createBottomTabNavigator }  from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';

import LoginScreen        from '../screens/LoginScreen';
import HomeScreen         from '../screens/HomeScreen';
import NR6Screen          from '../screens/NR6Screen';
import EpiRequestScreen   from '../screens/EpiRequestScreen';
import MyRequestsScreen   from '../screens/MyRequestsScreen';
import ProfileScreen      from '../screens/ProfileScreen';
import ChatScreen         from '../screens/ChatScreen';

const COR = {
  primaria: '#F97316',
  escura:   '#0F172A',
  cinza:    '#94A3B8',
  fundo:    '#F1F5F9',
  branco:   '#FFFFFF',
};

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

const ICONES_ABA = {
  Home:               { ativo: 'home',  inativo: 'home-outline' },
  NR6:                { ativo: 'book', inativo: 'book-outline'  },
  SolicitarEPI: { ativo: 'clipboard', inativo: 'clipboard-outline' },
  MinhasSolicitacoes: { ativo: 'list',  inativo: 'list-outline' },
  Chat:               { ativo: 'chatbubble-ellipses',inativo: 'chatbubble-ellipses-outline'},
};

function BotaoCentral({ children, onPress }) {
  return (
    <TouchableOpacity
      style={estilos.botaoCentral}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={estilos.botaoCentralInner}>{children}</View>
    </TouchableOpacity>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown:          false,
        tabBarStyle:          estilos.tabBar,
        tabBarActiveTintColor:   COR.primaria,
        tabBarInactiveTintColor: COR.cinza,
        tabBarLabelStyle:     estilos.tabLabel,
        tabBarIcon: ({ focused, color, size }) => {
          const icones  = ICONES_ABA[route.name] ?? { ativo: 'ellipse', inativo: 'ellipse-outline' };
          const nomeIcone = focused ? icones.ativo : icones.inativo;
          const tamanho = route.name === 'SolicitarEPI' ? 28 : size;
          const cor     = route.name === 'SolicitarEPI' ? COR.branco : color;
          return <Ionicons name={nomeIcone} size={tamanho} color={cor} />;
        },
      })}
    >
      <Tab.Screen name="Home"               component={HomeScreen}       options={{ tabBarLabel: 'Início'      }} />
      <Tab.Screen name="NR6"                component={NR6Screen}        options={{ tabBarLabel: 'NR-6'        }} />
      <Tab.Screen
        name="SolicitarEPI"
        component={EpiRequestScreen}
        options={{
          tabBarLabel:  '',
          tabBarButton: (props) => <BotaoCentral {...props} />,
        }}
      />
      <Tab.Screen name="MinhasSolicitacoes" component={MyRequestsScreen} options={{ tabBarLabel: 'Solicitações' }} />
      <Tab.Screen name="Chat"               component={ChatScreen}       options={{ tabBarLabel: 'Chatbot'     }} />
    </Tab.Navigator>
  );
}

function TelaCarregando() {
  return (
    <View style={estilos.carregando}>
      <Ionicons name="shield-checkmark" size={60} color={COR.primaria} />
      <Text style={estilos.carregandoTexto}>EPIsee</Text>
      <ActivityIndicator size="large" color={COR.primaria} style={{ marginTop: 24 }} />
    </View>
  );
}

export default function AppNavigator() {
  const { isAutenticado, loading } = useAuth();

  if (loading) return <TelaCarregando />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAutenticado ? (
          <Stack.Screen name="Main" component={TabNavigator} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const estilos = StyleSheet.create({
  tabBar: {
    backgroundColor:  COR.branco,
    borderTopWidth:   1,
    borderTopColor:   '#E2E8F0',
    height:           70,
    paddingBottom:    10,
    paddingTop:       8,
    shadowColor:      '#000',
    shadowOffset:     { width: 0, height: -2 },
    shadowOpacity:    0.06,
    shadowRadius:     8,
    elevation:        10,
  },
  tabLabel: {
    fontSize:   11,
    fontWeight: '500',
  },

  botaoCentral: {
    top:              -20,
    justifyContent:   'center',
    alignItems:       'center',
    width:            64,
    height:           64,
    borderRadius:     32,
    backgroundColor:  COR.primaria,
    shadowColor:      COR.primaria,
    shadowOffset:     { width: 0, height: 4 },
    shadowOpacity:    0.4,
    shadowRadius:     12,
    elevation:        8,
    marginHorizontal: 8,
  },
  botaoCentralInner: {
    width:           64,
    height:          64,
    borderRadius:    32,
    backgroundColor: COR.primaria,
    justifyContent:  'center',
    alignItems:      'center',
  },

  carregando: {
    flex:            1,
    justifyContent:  'center',
    alignItems:      'center',
    backgroundColor: COR.escura,
  },
  carregandoTexto: {
    fontSize:      32,
    fontWeight:    '800',
    color:         COR.branco,
    marginTop:     12,
    letterSpacing: 1,
  },
});
