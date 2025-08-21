import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';

const AnalysisResultScreen = ({ route, navigation }) => {
  const { analysisId } = route.params;
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    loadAnalysisData();
  }, [analysisId]);

  const loadAnalysisData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/analysis/${analysisId}/results`);
      setAnalysis(response.data);
    } catch (error) {
      console.error('Error loading analysis:', error);
      Alert.alert('Erro', 'Não foi possível carregar os resultados da análise');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (category) => {
    setExpandedSections(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const saveToFavorites = () => {
    Alert.alert('Favoritos', 'Análise salva nos favoritos!');
  };

  const associateWithPatient = () => {
    Alert.alert('Associar', 'Funcionalidade em desenvolvimento');
  };

  const exportAnalysis = () => {
    Alert.alert('Exportar', 'Funcionalidade de exportação em desenvolvimento');
  };

  const rateAnalysis = (helpful) => {
    Alert.alert(
      'Obrigado!', 
      helpful ? 'Sua avaliação foi registrada como útil' : 'Sua avaliação foi registrada'
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Carregando resultados...</Text>
      </View>
    );
  }

  if (!analysis) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error" size={64} color="#EF4444" />
        <Text style={styles.errorText}>Análise não encontrada</Text>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Analysis Result</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Clinical Case */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clinical Case</Text>
          <Text style={styles.submittedText}>
            Submitted on {formatDateTime(analysis.createdAt)}
          </Text>
          <Text style={styles.caseTitle}>{analysis.title}</Text>
          
          {/* Case Description */}
          {analysis.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionText}>{analysis.description}</Text>
            </View>
          )}

          {/* Symptoms */}
          {analysis.symptoms && (
            <View style={styles.symptomsContainer}>
              <Text style={styles.symptomsLabel}>Sintomas relatados:</Text>
              <Text style={styles.symptomsText}>{analysis.symptoms}</Text>
            </View>
          )}
        </View>

        {/* Submitted Images */}
        {analysis.MedicalImages && analysis.MedicalImages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Submitted Images</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
              {analysis.MedicalImages.map((image, index) => (
                <View key={image.id} style={styles.imageContainer}>
                  <View style={styles.medicalImagePlaceholder}>
                    <Icon name="image" size={32} color="#6B7280" />
                  </View>
                  <Text style={styles.imageLabel}>
                    {index === 0 ? 'Image A1' : 
                     index === 1 ? 'Last but One' : 
                     `Image ${index + 1}`}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* AI Analysis Results */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Análise da IA</Text>
          
          {/* AI Response Summary */}
          <View style={styles.aiResponseContainer}>
            <Text style={styles.aiResponseTitle}>Resposta da IA</Text>
            <Text style={styles.aiResponseText}>
              {analysis.aiConfidenceScore ? 
                `Acredito que possa ser tal doença e etc (${Math.round(analysis.aiConfidenceScore * 100)}% de confiança)` :
                'Acredito que possa ser tal doença e etc'
              }
            </Text>
          </View>
          
          {/* Detailed Results */}
          {analysis.AnalysisResults && analysis.AnalysisResults.length > 0 ? (
            analysis.AnalysisResults.map((result) => (
              <TouchableOpacity
                key={result.id}
                style={styles.resultCard}
                onPress={() => toggleSection(result.category)}
              >
                <View style={styles.resultHeader}>
                  <Text style={styles.resultCategory}>{result.category}</Text>
                  <View style={styles.resultHeaderRight}>
                    {result.isCompleted && (
                      <Icon name="check" size={16} color="#10B981" style={{ marginRight: 8 }} />
                    )}
                    <Icon 
                      name={expandedSections[result.category] ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                      size={24} 
                      color="#6B7280" 
                    />
                  </View>
                </View>
                
                {!expandedSections[result.category] && (
                  <View style={styles.resultPreview}>
                    <Text style={styles.resultText} numberOfLines={2}>
                      {result.result}
                    </Text>
                    <Text style={styles.resultDate}>
                      {formatDate(result.createdAt)}
                    </Text>
                  </View>
                )}

                {expandedSections[result.category] && (
                  <View style={styles.resultContent}>
                    <Text style={styles.resultText}>{result.result}</Text>
                    <View style={styles.resultFooter}>
                      <Text style={styles.resultDate}>{formatDate(result.createdAt)}</Text>
                      {result.confidenceScore && (
                        <Text style={styles.confidenceText}>
                          {Math.round(result.confidenceScore * 100)}% confiança
                        </Text>
                      )}
                    </View>
                    {result.aiModel && (
                      <Text style={styles.aiModelText}>Modelo: {result.aiModel}</Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>
                Análise ainda em processamento...
              </Text>
            </View>
          )}
        </View>

        {/* Doctor's Submitted Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Doctor's Submitted Data</Text>
          <View style={styles.doctorDataContainer}>
            <View style={styles.doctorIcon}>
              <Icon name="local-hospital" size={40} color="#10B981" />
            </View>
            <Text style={styles.doctorDataText}>Medical Information</Text>
          </View>
        </View>

        {/* Final Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Final Actions</Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={saveToFavorites}>
              <Text style={styles.actionButtonText}>Save to Favorites</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={associateWithPatient}>
              <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Associate with a Patient</Text>
            </TouchableOpacity>
          </View>

          {/* Rating */}
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingQuestion}>Was this approach helpful?</Text>
            <View style={styles.ratingButtons}>
              <TouchableOpacity 
                style={styles.ratingButton}
                onPress={() => rateAnalysis(true)}
              >
                <Icon name="thumb-up" size={20} color="#6B7280" />
                <Text style={styles.ratingCount}>123</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.ratingButton}
                onPress={() => rateAnalysis(false)}
              >
                <Icon name="thumb-down" size={20} color="#6B7280" />
                <Text style={styles.ratingCount}>45</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Export */}
          <TouchableOpacity style={styles.exportButton} onPress={exportAnalysis}>
            <Icon name="file-download" size={20} color="#1E3A8A" />
            <Text style={styles.exportText}>Export</Text>
          </TouchableOpacity>
        </View>

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
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  submittedText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  caseTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  descriptionContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  symptomsContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  symptomsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  symptomsText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  imagesContainer: {
    flexDirection: 'row',
  },
  imageContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  medicalImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  imageLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
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
  resultCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  resultPreview: {
    marginTop: 8,
  },
  resultContent: {
    marginTop: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  confidenceText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  aiModelText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
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
  doctorDataContainer: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
  },
  doctorIcon: {
    marginBottom: 12,
  },
  doctorDataText: {
    fontSize: 16,
    color: '#166534',
    fontWeight: '500',
  },
  actionsSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ratingQuestion: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 16,
  },
  ratingButtons: {
    flexDirection: 'row',
    gap: 24,
  },
  ratingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
});

export default AnalysisResultScreen;