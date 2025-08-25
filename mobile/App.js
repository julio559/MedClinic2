// App.js
import React from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import API_CONFIG from './config/api';

// TELAS
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import PatientsScreen from './src/screens/PatientsScreen';
import PatientDetailScreen from './src/screens/PatientDetailScreen';
import PatientConditionsScreen from './src/screens/PatientConditionsScreen';
import NewAnalysisScreen from './src/screens/NewAnalysisScreen';
import AnalysisResultScreen from './src/screens/AnalysisResultScreen';
import AnalysisWaitScreen from './src/screens/AnalysisWaitScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" />
      <ActivityIndicator size="large" />
    </View>
  );
}

const TabNavigator = () => (
  <Tab.Navigator
    initialRouteName="Home"
    screenOptions={({ route }) => ({
      tabBarIcon: ({ color }) => {
        let iconName = 'home';
        if (route.name === 'Home') iconName = 'home';
        else if (route.name === 'History') iconName = 'history';
        else if (route.name === 'Patients') iconName = 'people';
        else if (route.name === 'Analysis') iconName = 'analytics';
        else if (route.name === 'Profile') iconName = 'person';
        return <Icon name={iconName} size={24} color={color} />;
      },
      headerShown: false,
      tabBarStyle: {
        backgroundColor: '#F8FBFF',
        borderTopColor: '#E5EAF5',
        height: 72,
        paddingTop: 6,
        paddingBottom: 8,
      },
      tabBarLabelStyle: {
        fontSize: 14,
        fontWeight: '500',
      },
      tabBarActiveTintColor: '#111827',
      tabBarInactiveTintColor: '#3B4F8B',
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} options={{ title: '' }} />
    <Tab.Screen name="History" component={HistoryScreen} options={{ title: '' }} />
    <Tab.Screen name="Patients" component={PatientsScreen} options={{ title: '' }} />
    <Tab.Screen name="Analysis" component={NewAnalysisScreen} options={{ title: ' ' }} />
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: '' }} />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          {/* Stack privada (logado) */}
          <Stack.Screen name="Main" component={TabNavigator} />

          {/* Pacientes */}
          <Stack.Screen name="PatientConditions" component={PatientConditionsScreen} />
          <Stack.Screen name="PatientDetail" component={PatientDetailScreen} />

          {/* Espera da IA — passamos a base/URL da API do config, sem hardcode */}
          <Stack.Screen
            name="AnalysisWait"
            options={{ headerShown: true, title: 'Processando análise...' }}
          >
            {(props) => (
              <AnalysisWaitScreen
                {...props}
                apiBase={API_CONFIG.baseURL}
                apiUrl={API_CONFIG.apiURL}
              />
            )}
          </Stack.Screen>

          {/* Resultados */}
          <Stack.Screen
            name="AnalysisResult"
            component={AnalysisResultScreen}
            options={{ headerShown: true, title: 'Resultados' }}
          />
        </>
      ) : (
        <>
          {/* Auth stack (não logado) */}
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
