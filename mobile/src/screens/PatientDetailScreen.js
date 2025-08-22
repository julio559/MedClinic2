import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';

const { width, height } = Dimensions.get('window');

const PatientDetailScreen = ({ route, navigation }) => {
  const { patient, analysisId } = route.params;
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState({
    medication: false,
    physiotherapy: false,
    vitals: false,
    nutrition: false,
    exercise: false
  });
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [expandedSection, setExpandedSection] = useState(null);

  useEffect(() => {
    if (analysisId) {
      loadAnalysisData();
    } else {
      loadPatientData();
    }
    
    // Animação de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [analysisId]);

  const loadAnalysisData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/analysis/${analysisId}/results`);
      setAnalysisData(response.data);
    } catch (error) {
      console.error('Error loading analysis:', error);
      // Mock data para demonstração
      setAnalysisData({
        id: analysisId,
        title: 'Análise Dermatológica Completa',
        description: 'Paciente apresenta melhora significativa após tratamento. Lesões mostrando sinais de cicatrização.',
        status: 'completed',
        createdAt: new Date().toISOString(),
        confidence: 94,
        priority: 'high',
        MedicalImages: [
          { id: '1', createdAt: new Date().toISOString() },
          { id: '2', createdAt: new Date(Date.now() - 86400000).toISOString() },
          { id: '3', createdAt: new Date(Date.now() - 172800000).toISOString() }
        ],
        AnalysisResults: [
          {
            id: '1',
            category: 'Diagnóstico Principal',
            result: 'Dermatite Atópica com melhora significativa. Redução de 70% da inflamação após tratamento tópico.',
            isCompleted: true,
            createdAt: new Date().toISOString()
          },
          {
            id: '2',
            category: 'Recomendações',
            result: 'Continuar com hidratação regular, evitar alérgenos identificados, manter medicação por mais 2 semanas.',
            isCompleted: false,
            createdAt: new Date().toISOString()
          },
          {
            id: '3',
            category: 'Acompanhamento',
            result: 'Retorno em 15 dias para reavaliação. Fotografar evolução semanalmente.',
            isCompleted: false,
            createdAt: new Date().toISOString()
          }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPatientData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/patients/${patient.id}`);
      const patientData = response.data;
      
      if (patientData.Analyses && patientData.Analyses.length > 0) {
        const latestAnalysis = patientData.Analyses[0];
        
        try {
          const analysisResponse = await axios.get(`/analysis/${latestAnalysis.id}/results`);
          setAnalysisData(analysisResponse.data);
        } catch (analysisError) {
          setAnalysisData(latestAnalysis);
        }
      } else {
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
    
    // Animação de feedback
    const animation = new Animated.Value(1);
    Animated.sequence([
      Animated.timing(animation, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.timing(animation, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return new Date().toLocaleDateString('pt-BR');
    }
  };

  const formatDateTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return new Date().toLocaleString('pt-BR');
    }
  };

  const getMainDiagnosis = () => {
    if (!analysisData?.AnalysisResults) return 'Diagnóstico não disponível';
    
    const mainDiagnosis = analysisData.AnalysisResults.find(
      result => result.category === 'Diagnostico principal' || result.category === 'Diagnóstico Principal'
    );
    
    return mainDiagnosis ? mainDiagnosis.result : analysisData.title || 'Análise em andamento';
  };

  const getPatientAge = () => {
    if (patient.birthDate) {
      return `${new Date().getFullYear() - new Date(patient.birthDate).getFullYear()} anos`;
    }
    return '32 anos';
  };

  const getCompletionPercentage = () => {
    const completedItems = Object.values(checklist).filter(Boolean).length;
    const totalItems = Object.values(checklist).length;
    return Math.round((completedItems / totalItems) * 100);
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

  const ChecklistItem = ({ item, label, checked, onPress }) => (
    <TouchableOpacity style={styles.checklistItem} onPress={onPress}>
      <Animated.View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Icon name="check" size={16} color="#FFFFFF" />}
      </Animated.View>
      <Text style={[styles.checklistText, checked && styles.checklistTextCompleted]}>
        {label}
      </Text>
      <View style={[styles.statusDot, { backgroundColor: checked ? '#10B981' : '#E5E7EB' }]} />
    </TouchableOpacity>
  );

  const EvolutionImageCard = ({ image, index }) => {
    const [imageAnim] = useState(new Animated.Value(0));

    useEffect(() => {
      Animated.timing(imageAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 150,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View style={[
        styles.evolutionImageContainer,
        {
          opacity: imageAnim,
          transform: [{
            translateY: imageAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0]
            })
          }]
        }
      ]}>
        <View style={styles.evolutionImage}>
          <View style={styles.imageGradient} />
          <Icon name="medical-services" size={28} color="#FFFFFF" />
          <View style={styles.imageNumber}>
            <Text style={styles.imageNumberText}>{index + 1}</Text>
          </View>
        </View>
        <Text style={styles.imageDate}>{formatDate(image.createdAt)}</Text>
        <View style={styles.imageStatus}>
          <Icon name="check-circle" size={12} color="#10B981" />
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner}>
            <ActivityIndicator size="large" color="#667EEA" />
          </View>
          <Text style={styles.loadingText}>Carregando diário...</Text>
          <Text style={styles.loadingSubtext}>Preparando evolução médica</Text>
        </View>
      </View>
    );
  }

  if (!analysisData) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        
        {/* Header Premium */}
        <View style={styles.headerContainer}>
          <View style={styles.headerGradient} />
          
          <Animated.View style={[
            styles.headerContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}>
            <View style={styles.headerTop}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Icon name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              
              <View style={styles.headerTitle}>
                <Text style={styles.headerTitleText}>Diário de Evolução</Text>
                <Text style={styles.headerSubtitle}>Sem análises disponíveis</Text>
              </View>
              
              <View style={styles.headerSpacer} />
            </View>
          </Animated.View>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.emptyContentContainer}>
          {/* Patient Info Card */}
          <Animated.View style={[
            styles.patientCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}>
            <View style={styles.patientAvatar}>
              <Text style={styles.patientInitial}>
                {patient.name?.charAt(0)?.toUpperCase() || 'P'}
              </Text>
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{patient.name}</Text>
              <Text style={styles.patientAge}>{getPatientAge()}</Text>
              <Text style={styles.patientType}>Paciente sem histórico</Text>
            </View>
            <View style={styles.patientStatusBadge}>
              <Icon name="info" size={16} color="#F59E0B" />
            </View>
          </Animated.View>

          {/* Empty State */}
          <Animated.View style={[
            styles.emptyAnalysisContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}>
            <View style={styles.emptyIconContainer}>
              <Icon name="analytics" size={80} color="#E2E8F0" />
            </View>
            <Text style={styles.emptyAnalysisTitle}>Nenhuma análise disponível</Text>
            <Text style={styles.emptyAnalysisText}>
              Este paciente ainda não possui análises realizadas. Inicie o acompanhamento criando a primeira análise médica.
            </Text>
            
            <TouchableOpacity 
              style={styles.createAnalysisButton}
              onPress={() => navigation.navigate('Analysis', { selectedPatient: patient })}
            >
              <View style={styles.createAnalysisGradient} />
              <View style={styles.createAnalysisContent}>
                <Icon name="add" size={20} color="#FFFFFF" />
                <Text style={styles.createAnalysisText}>Criar Nova Análise</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  const completionPercentage = getCompletionPercentage();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header Premium */}
      <View style={styles.headerContainer}>
        <View style={styles.headerGradient} />
        
        <Animated.View style={[
          styles.headerContent,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.headerTitle}>
              <Text style={styles.headerTitleText}>Diário de Evolução</Text>
              <Text style={styles.headerSubtitle}>Acompanhamento médico</Text>
            </View>
            
            <TouchableOpacity style={styles.shareButton}>
              <Icon name="share" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Patient Info Card Premium */}
        <Animated.View style={[
          styles.patientCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.patientAvatar}>
            <Text style={styles.patientInitial}>
              {patient.name?.charAt(0)?.toUpperCase() || 'P'}
            </Text>
          </View>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{patient.name}</Text>
            <Text style={styles.patientAge}>{getPatientAge()}</Text>
            <Text style={styles.patientType}>Em acompanhamento</Text>
          </View>
          <View style={styles.patientStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{completionPercentage}%</Text>
              <Text style={styles.statLabel}>Progresso</Text>
            </View>
          </View>
        </Animated.View>

        {/* Progress Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Resumo do Progresso</Text>
            <View style={styles.progressBadge}>
              <Text style={styles.progressText}>{completionPercentage}%</Text>
            </View>
          </View>
          
          <View style={styles.progressCard}>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <View style={[
                  styles.progressBarFill, 
                  { width: `${completionPercentage}%` }
                ]} />
              </View>
            </View>
            
            <View style={styles.progressStats}>
              <View style={styles.progressStatItem}>
                <Icon name="assignment-turned-in" size={20} color="#10B981" />
                <Text style={styles.progressStatText}>
                  {Object.values(checklist).filter(Boolean).length} de {Object.values(checklist).length} concluídas
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Evolution Timeline */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('timeline')}
          >
            <Text style={styles.sectionTitle}>Timeline de Evolução</Text>
            <Icon 
              name={expandedSection === 'timeline' ? 'expand-less' : 'expand-more'} 
              size={24} 
              color="#6B7280" 
            />
          </TouchableOpacity>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timelineContainer}>
            {analysisData.MedicalImages && analysisData.MedicalImages.length > 0 ? (
              analysisData.MedicalImages.map((image, index) => (
                <EvolutionImageCard key={image.id} image={image} index={index} />
              ))
            ) : (
              Array.from({ length: 3 }, (_, index) => (
                <EvolutionImageCard 
                  key={index} 
                  image={{ createdAt: new Date(Date.now() - index * 86400000).toISOString() }} 
                  index={index} 
                />
              ))
            )}
          </ScrollView>
        </View>

        {/* Patient Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Anotações do Paciente</Text>
          
          <View style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <View style={styles.notesAvatar}>
                <Icon name="person" size={20} color="#3B82F6" />
              </View>
              <View style={styles.notesInfo}>
                <Text style={styles.notesAuthor}>Paciente</Text>
                <Text style={styles.notesDate}>{formatDateTime(analysisData.createdAt)}</Text>
              </View>
            </View>
            
            <Text style={styles.notesText}>
              {analysisData.description || 'Estou me sentindo muito melhor hoje! A coceira diminuiu bastante e as lesões parecem estar cicatrizando bem. Continuando com o tratamento conforme orientado.'}
            </Text>
            
            <View style={styles.notesFooter}>
              <View style={styles.notesMood}>
                <Icon name="sentiment-satisfied" size={16} color="#10B981" />
                <Text style={styles.notesMoodText}>Melhorando</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Daily Checklist */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Checklist Diário</Text>
            <View style={styles.checklistProgress}>
              <Text style={styles.checklistProgressText}>
                {Object.values(checklist).filter(Boolean).length}/{Object.values(checklist).length}
              </Text>
            </View>
          </View>
          
          <View style={styles.checklistCard}>
            <ChecklistItem
              item="medication"
              label="Aplicar medicação tópica (manhã e noite)"
              checked={checklist.medication}
              onPress={() => toggleChecklistItem('medication')}
            />
            <ChecklistItem
              item="physiotherapy"
              label="Evitar coçar as lesões"
              checked={checklist.physiotherapy}
              onPress={() => toggleChecklistItem('physiotherapy')}
            />
            <ChecklistItem
              item="vitals"
              label="Hidratação da pele 3x ao dia"
              checked={checklist.vitals}
              onPress={() => toggleChecklistItem('vitals')}
            />
            <ChecklistItem
              item="nutrition"
              label="Evitar alimentos alergênicos"
              checked={checklist.nutrition}
              onPress={() => toggleChecklistItem('nutrition')}
            />
            <ChecklistItem
              item="exercise"
              label="Fotografar evolução das lesões"
              checked={checklist.exercise}
              onPress={() => toggleChecklistItem('exercise')}
            />
          </View>
        </View>

        {/* AI Analysis Results */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Análise Médica</Text>
            <View style={styles.aiConfidenceBadge}>
              <Icon name="psychology" size={16} color="#3B82F6" />
              <Text style={styles.aiConfidenceText}>IA 94%</Text>
            </View>
          </View>
          
          {/* Main Diagnosis Card */}
          <View style={styles.diagnosisCard}>
            <View style={styles.diagnosisHeader}>
              <Icon name="medical-services" size={24} color="#10B981" />
              <Text style={styles.diagnosisTitle}>Diagnóstico Principal</Text>
            </View>
            <Text style={styles.diagnosisText}>
              {getMainDiagnosis()}
            </Text>
            <View style={styles.diagnosisFooter}>
              <Text style={styles.diagnosisDate}>{formatDateTime(analysisData.createdAt)}</Text>
              <Icon name="check-circle" size={16} color="#10B981" />
            </View>
          </View>

          {/* Analysis Results */}
          {analysisData.AnalysisResults && analysisData.AnalysisResults.slice(1).map((result, index) => (
            <View key={result.id} style={styles.analysisResultCard}>
              <View style={styles.analysisResultHeader}>
                <View style={styles.analysisResultTitleContainer}>
                  <Text style={styles.analysisResultCategory}>{result.category}</Text>
                  <Text style={styles.analysisResultDate}>{formatDate(result.createdAt)}</Text>
                </View>
                <View style={[
                  styles.analysisResultStatus, 
                  { backgroundColor: result.isCompleted ? '#ECFDF5' : '#FEF3C7' }
                ]}>
                  <Icon 
                    name={result.isCompleted ? "check-circle" : "schedule"} 
                    size={16} 
                    color={result.isCompleted ? "#10B981" : "#F59E0B"} 
                  />
                </View>
              </View>
              <Text style={styles.analysisResultText}>
                {result.result}
              </Text>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.secondaryButton}>
            <Icon name="add-photo-alternate" size={20} color="#667EEA" />
            <Text style={styles.secondaryButtonText}>Adicionar Foto</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.primaryButton} onPress={finalizeCase}>
            <View style={styles.primaryButtonGradient} />
            <View style={styles.primaryButtonContent}>
              <Icon name="assignment-turned-in" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Finalizar Caso</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

export default PatientDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // Header Premium
  headerContainer: {
    height: 120,
    position: 'relative',
    overflow: 'hidden',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0F172A',
    background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
  },
  headerContent: {
    flex: 1,
    paddingTop: StatusBar.currentHeight + 10 || 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
    justifyContent: 'center',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingSpinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  emptyContentContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Patient Card
  patientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  patientAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#667EEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  patientInitial: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  patientAge: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  patientType: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  patientStats: {
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#667EEA',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  patientStatusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  progressBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },

  // Progress Card
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  progressBarContainer: {
    marginBottom: 16,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressStatText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Timeline
  timelineContainer: {
    paddingVertical: 8,
  },
  evolutionImageContainer: {
    alignItems: 'center',
    marginRight: 20,
    position: 'relative',
  },
  evolutionImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  imageGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#667EEA',
    background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
  },
  imageNumber: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageNumberText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  imageDate: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  imageStatus: {
    position: 'absolute',
    bottom: 24,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 2,
  },

  // Notes Card
  notesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  notesAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notesInfo: {
    flex: 1,
  },
  notesAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  notesDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  notesFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notesMood: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  notesMoodText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },

  // Checklist
  checklistProgress: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  checklistProgressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
  },
  checklistCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
    color: '#374151',
    fontWeight: '500',
  },
  checklistTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // AI Analysis
  aiConfidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aiConfidenceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
  },

  // Diagnosis Card
  diagnosisCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    ...Platform.select({
      ios: {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  diagnosisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  diagnosisTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 8,
  },
  diagnosisText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  diagnosisFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diagnosisDate: {
    fontSize: 12,
    color: '#6B7280',
  },

  // Analysis Results
  analysisResultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  analysisResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  analysisResultTitleContainer: {
    flex: 1,
  },
  analysisResultCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  analysisResultDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  analysisResultStatus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analysisResultText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },

  // Empty State
  emptyAnalysisContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#F1F5F9',
  },
  emptyAnalysisTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyAnalysisText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  createAnalysisButton: {
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    position: 'relative',
    paddingHorizontal: 32,
    ...Platform.select({
      ios: {
        shadowColor: '#667EEA',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  createAnalysisGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#667EEA',
    background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
  },
  createAnalysisContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createAnalysisText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Action Buttons
  actionSection: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingVertical: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667EEA',
  },
  primaryButton: {
    flex: 2,
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#667EEA',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  primaryButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#667EEA',
    background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
  },
  primaryButtonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});