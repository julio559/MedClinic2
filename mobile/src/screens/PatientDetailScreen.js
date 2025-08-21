import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';

const PatientDetailScreen = ({ route, navigation }) => {
  const { patient, analysisId } = route.params;
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState({
    medication: false,
    physiotherapy: false,
    vitals: false
  });

  useEffect(() => {
    if (analysisId) {
      loadAnalysisData();
    } else {
      loadPatientData();
    }
  }, [analysisId]);

  const loadAnalysisData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/analysis/${analysisId}/results`);
      setAnalysisData(response.data);
    } catch (error) {
      console.error('Error loading analysis:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados da análise');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadPatientData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/patients/${patient.id}`);
      const patientData = response.data;
      
      // Verificar se há análises
      if (patientData.Analyses && patientData.Analyses.length > 0) {
        const latestAnalysis = patientData.Analyses[0];
        
        // Tentar carregar dados completos da análise
        try {
          const analysisResponse = await axios.get(`/analysis/${latestAnalysis.id}/results`);
          setAnalysisData(analysisResponse.data);
        } catch (analysisError) {
          console.error('Error loading analysis details:', analysisError);
          // Se não conseguir carregar detalhes, usar dados básicos
          setAnalysisData(latestAnalysis);
        }
      } else {
        // Se não há análises, mostrar estado vazio mas não voltar
        setAnalysisData(null);
      }
    } catch (error) {
      console.error('Error loading patient data:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do paciente');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const toggleChecklistItem = (item) => {
    setChecklist(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  // Função para extrair diagnóstico principal da análise
  const getMainDiagnosis = () => {
    if (!analysisData?.AnalysisResults) return 'Diagnóstico não disponível';
    
    const mainDiagnosis = analysisData.AnalysisResults.find(
      result => result.category === 'Diagnostico principal' || result.category === 'Diagnóstico principal'
    );
    
    return mainDiagnosis ? mainDiagnosis.result : analysisData.title;
  };

  // Função para extrair condições/doenças da análise
  const getPatientConditions = () => {
    if (!analysisData?.AnalysisResults) return [];
    
    const conditions = [];
    
    // Adicionar diagnóstico principal
    const mainDiagnosis = analysisData.AnalysisResults.find(
      result => result.category === 'Diagnostico principal' || result.category === 'Diagnóstico principal'
    );
    
    if (mainDiagnosis) {
      // Extrair primeira palavra como nome da condição
      const conditionName = mainDiagnosis.result.split(' ')[0] || 'Diagnóstico';
      conditions.push({
        name: conditionName,
        description: mainDiagnosis.result
      });
    }

    // Adicionar outras condições baseadas em outros resultados
    analysisData.AnalysisResults.forEach(result => {
      if (result.category !== 'Diagnostico principal' && result.category !== 'Diagnóstico principal') {
        // Pode extrair condições secundárias se necessário
      }
    });

    return conditions;
  };

  const finalizeCase = async () => {
    Alert.alert(
      'Finalizar Caso',
      'Tem certeza que deseja finalizar este caso clínico?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Finalizar', 
          onPress: () => {
            Alert.alert('Sucesso', 'Caso clínico finalizado');
            navigation.goBack();
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Carregando dados...</Text>
      </View>
    );
  }

  if (!analysisData) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Diário de Evolução</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.emptyContentContainer}>
          {/* Patient Info */}
          <View style={styles.patientInfoContainer}>
            <View style={styles.patientAvatar}>
              <Icon name="person" size={32} color="#8B5A2B" />
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{patient.name}</Text>
              <Text style={styles.patientAge}>
                {patient.birthDate ? `${new Date().getFullYear() - new Date(patient.birthDate).getFullYear()} anos` : '32 anos'}
              </Text>
              <Text style={styles.patientType}>Paciente</Text>
            </View>
          </View>

          {/* Empty State */}
          <View style={styles.emptyAnalysisContainer}>
            <Icon name="analytics" size={64} color="#D1D5DB" />
            <Text style={styles.emptyAnalysisTitle}>Nenhuma análise disponível</Text>
            <Text style={styles.emptyAnalysisText}>
              Este paciente ainda não possui análises realizadas. Clique no botão abaixo para criar a primeira análise.
            </Text>
            
            <TouchableOpacity 
              style={styles.createAnalysisButton}
              onPress={() => navigation.navigate('Analysis', { selectedPatient: patient })}
            >
              <Icon name="add" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.createAnalysisText}>Criar Nova Análise</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  const patientConditions = getPatientConditions();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Diário de Evolução</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Patient Info */}
        <View style={styles.patientInfoContainer}>
          <View style={styles.patientAvatar}>
            <Icon name="person" size={32} color="#8B5A2B" />
          </View>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{patient.name}</Text>
            <Text style={styles.patientAge}>
              {patient.birthDate ? `${new Date().getFullYear() - new Date(patient.birthDate).getFullYear()} anos` : '32 anos'}
            </Text>
            <Text style={styles.patientType}>Paciente</Text>
          </View>
        </View>

        {/* Evolution Images - Baseado nas imagens médicas da análise */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Imagens de Evolução</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
            {analysisData.MedicalImages && analysisData.MedicalImages.length > 0 ? (
              analysisData.MedicalImages.map((image, index) => (
                <View key={image.id} style={styles.evolutionImageContainer}>
                  <View style={styles.evolutionImage}>
                    <Icon name="medical-services" size={32} color="#10B981" />
                  </View>
                  <Text style={styles.imageDate}>{formatDate(image.createdAt)}</Text>
                </View>
              ))
            ) : (
              // Placeholder se não há imagens
              Array.from({ length: 3 }, (_, index) => (
                <View key={index} style={styles.evolutionImageContainer}>
                  <View style={styles.evolutionImage}>
                    <Icon name="medical-services" size={32} color="#10B981" />
                  </View>
                  <Text style={styles.imageDate}>{formatDate(analysisData.createdAt)}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>

        {/* Patient Annotations - Baseado na descrição da análise */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Anotações do Paciente</Text>
          <View style={styles.annotationContainer}>
            <Text style={styles.annotationTitle}>Paciente</Text>
            <Text style={styles.annotationText}>
              {analysisData.description || 'Estou me sentindo melhor hoje, com menos dor e mais energia. A fisioterapia está ajudando bastante.'}
            </Text>
            <Text style={styles.annotationDate}>{formatDate(analysisData.createdAt)}</Text>
          </View>
        </View>

        {/* Patient Conditions - Baseado nos resultados da IA */}
        <View style={styles.section}>
          <View style={styles.diseasesHeader}>
            <Icon name="description" size={24} color="#6B7280" />
            <Text style={styles.sectionTitle}>Nome do paciente</Text>
          </View>
          
          {patientConditions.length > 0 ? (
            patientConditions.map((condition, index) => (
              <View key={index} style={styles.diseaseItem}>
                <Icon name="description" size={20} color="#6B7280" />
                <Text style={styles.diseaseText}>{condition.name}</Text>
                <Icon name="chevron-right" size={20} color="#9CA3AF" />
              </View>
            ))
          ) : (
            // Condições padrão baseadas nos resultados mais comuns
            ['Diabetes', 'Coriza', 'GRIPE', 'Loucura', 'Burn out'].map((disease, index) => (
              <View key={index} style={styles.diseaseItem}>
                <Icon name="description" size={20} color="#6B7280" />
                <Text style={styles.diseaseText}>{disease}</Text>
                <Icon name="chevron-right" size={20} color="#9CA3AF" />
              </View>
            ))
          )}
        </View>

        {/* Checklist */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Checklist Diário do paciente</Text>
          <View style={styles.checklistContainer}>
            <TouchableOpacity 
              style={styles.checklistItem}
              onPress={() => toggleChecklistItem('medication')}
            >
              <View style={[styles.checkbox, checklist.medication && styles.checkboxChecked]}>
                {checklist.medication && <Icon name="check" size={16} color="#FFFFFF" />}
              </View>
              <Text style={styles.checklistText}>
                Tomar medicação prescrita ({formatDate(analysisData.createdAt)})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.checklistItem}
              onPress={() => toggleChecklistItem('physiotherapy')}
            >
              <View style={[styles.checkbox, checklist.physiotherapy && styles.checkboxChecked]}>
                {checklist.physiotherapy && <Icon name="check" size={16} color="#FFFFFF" />}
              </View>
              <Text style={styles.checklistText}>
                Realizar exercícios de fisioterapia ({formatDate(analysisData.createdAt)})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.checklistItem}
              onPress={() => toggleChecklistItem('vitals')}
            >
              <View style={[styles.checkbox, checklist.vitals && styles.checkboxChecked]}>
                {checklist.vitals && <Icon name="check" size={16} color="#FFFFFF" />}
              </View>
              <Text style={styles.checklistText}>
                Monitorar sinais vitais ({formatDate(analysisData.createdAt)})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Analysis - Exibe todos os resultados da IA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Análise de IA</Text>
          
          {/* AI Response Summary */}
          <View style={styles.aiResponseContainer}>
            <Text style={styles.aiResponseTitle}>Resposta da IA</Text>
            <Text style={styles.aiResponseText}>
              {getMainDiagnosis()}
            </Text>
          </View>

          {/* Analysis Results - Todas as categorias */}
          {analysisData.AnalysisResults && analysisData.AnalysisResults.length > 0 ? (
            analysisData.AnalysisResults.map((result) => (
              <View key={result.id} style={styles.analysisResultCard}>
                <View style={styles.analysisResultHeader}>
                  <Text style={styles.analysisResultCategory}>{result.category}</Text>
                  {result.isCompleted && (
                    <Icon name="check-circle" size={16} color="#10B981" />
                  )}
                </View>
                <Text style={styles.analysisResultText} numberOfLines={2}>
                  {result.result}
                </Text>
                <Text style={styles.analysisResultDate}>{formatDate(result.createdAt)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>
                Análise ainda sendo processada...
              </Text>
            </View>
          )}
        </View>

        {/* Finalize Button */}
        <TouchableOpacity style={styles.finalizeButton} onPress={finalizeCase}>
          <Text style={styles.finalizeButtonText}>Finalizar Caso Clínico</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  patientInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  patientAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3E8D1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  patientAge: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  patientType: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  imagesContainer: {
    flexDirection: 'row',
  },
  evolutionImageContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  evolutionImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  imageDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  annotationContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
  },
  annotationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  annotationText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  annotationDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  diseasesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  diseaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  diseaseText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
  },
  checklistContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checklistText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  aiResponseContainer: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  aiResponseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369A1',
    marginBottom: 8,
  },
  aiResponseText: {
    fontSize: 14,
    color: '#0369A1',
    lineHeight: 20,
  },
  analysisResultCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  analysisResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  analysisResultCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  analysisResultText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  analysisResultDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  noResultsContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
  },
  emptyContentContainer: {
    flexGrow: 1,
  },
  emptyAnalysisContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyAnalysisTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyAnalysisText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  createAnalysisButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createAnalysisText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  finalizeButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  finalizeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PatientDetailScreen;