import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, StatusBar, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalAnalyses: 0, 
    completedAnalyses: 0, 
    processingAnalyses: 0, 
    totalPatients: 0
  });
  const [eyaQuestion, setEyaQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const statsResponse = await axios.get('/users/stats');
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      // Se falhar, mantém os valores zerados
    }
  };

  const handleEyaQuestion = async () => {
    if (!eyaQuestion.trim()) {
      Alert.alert('Aviso', 'Digite uma pergunta para a EYA');
      return;
    }

    setLoading(true);
    try {
      // Simular resposta da EYA
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Resposta da EYA',
        `Pergunta: "${eyaQuestion}"\\n\\nResposta: Esta é uma resposta simulada da EYA. Em uma implementação real, aqui seria processada pela inteligência artificial médica.`,
        [
          { text: 'OK', onPress: () => setEyaQuestion('') }
        ]
      );
    } catch (error) {
      Alert.alert('Erro', 'Erro ao processar pergunta');
    } finally {
      setLoading(false);
    }
  };

  const navigateToHistory = () => {
    navigation.navigate('History');
  };

  const navigateToStatistics = () => {
    Alert.alert('Estatísticas', 'Funcionalidade em desenvolvimento');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />
      
      {/* Header with Doctor Info */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.settingsButton}>
          <Icon name="settings" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.doctorContainer}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Icon name="person" size={60} color="#8B5A2B" />
            </View>
          </View>
          <Text style={styles.doctorName}>
            {user?.name || 'Dr. Ethan Carter'}
          </Text>
          <Text style={styles.crmNumber}>
            CRM {user?.crm || '123456'}
          </Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Ask EYA Section */}
        <View style={styles.askEyaContainer}>
          <TextInput
            style={styles.askEyaInput}
            placeholder="Pergunta a EYA"
            placeholderTextColor="#9CA3AF"
            value={eyaQuestion}
            onChangeText={setEyaQuestion}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendButton, loading && styles.sendButtonDisabled]}
            onPress={handleEyaQuestion}
            disabled={loading}
          >
            <Text style={styles.sendButtonText}>
              {loading ? 'enviando...' : 'enviar'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* New Analysis Button */}
        <TouchableOpacity 
          style={styles.newAnalysisButton}
          onPress={() => navigation.navigate('Analysis')}
        >
          <Text style={styles.newAnalysisText}>Nova Análise</Text>
        </TouchableOpacity>

        {/* Quick Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Quick Summary</Text>
          
          <View style={styles.summaryGrid}>
            <TouchableOpacity 
              style={styles.summaryCard}
              onPress={() => navigation.navigate('Analysis')}
            >
              <Icon name="description" size={24} color="#6B7280" style={styles.summaryIcon} />
              <View style={styles.summaryContent}>
                <Text style={styles.summaryTitle}>Análises</Text>
                <Text style={styles.summarySubtitle}>
                  {stats.totalAnalyses} {stats.totalAnalyses === 1 ? 'nova análise' : 'novas análises'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.summaryCard}
              onPress={navigateToHistory}
            >
              <Icon name="notifications" size={24} color="#6B7280" style={styles.summaryIcon} />
              <View style={styles.summaryContent}>
                <Text style={styles.summaryTitle}>Histórico EYA</Text>
                <Text style={styles.summarySubtitle}>
                  {stats.completedAnalyses} {stats.completedAnalyses === 1 ? 'pergunta' : 'perguntas'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.summaryCard}
              onPress={navigateToStatistics}
            >
              <Icon name="schedule" size={24} color="#6B7280" style={styles.summaryIcon} />
              <View style={styles.summaryContent}>
                <Text style={styles.summaryTitle}>Clinical Tip</Text>
                <Text style={styles.summarySubtitle}>Daily clinical tip</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Bottom Navigation */}
    
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#1E3A8A',
    paddingTop: 50,
    paddingBottom: 40,
    paddingHorizontal: 20,
    position: 'relative',
  },
  settingsButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 8,
  },
  doctorContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3E8D1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  doctorName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  crmNumber: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  mainContent: {
    flex: 1,
    padding: 20,
  },
  askEyaContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  askEyaInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    minHeight: 48,
  },
  sendButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    justifyContent: 'center',
    minHeight: 48,
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  newAnalysisButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  newAnalysisText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  summarySection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  summaryGrid: {
    gap: 12,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryIcon: {
    marginRight: 12,
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeNavItem: {
    backgroundColor: 'rgba(30, 58, 138, 0.1)',
    borderRadius: 8,
  },
  navText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  activeNavText: {
    color: '#1E3A8A',
    fontWeight: '600',
  },
});

export default HomeScreen;
