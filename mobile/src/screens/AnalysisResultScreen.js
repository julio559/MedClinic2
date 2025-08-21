import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const AnalysisResultScreen = ({ route, navigation }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    // Mock data for demonstration
    setAnalysis({
      id: 'mock-analysis',
      title: 'Possible Plaque Psoriasis with Bacterial Superinfection',
      createdAt: '2024-10-26T10:30:00Z',
      AnalysisResults: [
        {
          id: 1,
          category: 'Diagnóstico principal',
          result: 'Diabetes ver mais sobre a doença',
          createdAt: '2024-07-22T00:00:00Z',
          confidenceScore: 0.92,
          isCompleted: true
        },
        {
          id: 2,
          category: 'Etiologia',
          result: 'Continuar com a medicação e fisioterapia, monitorando a evolução.',
          createdAt: '2024-07-22T00:00:00Z',
          confidenceScore: 0.88,
          isCompleted: true
        },
        {
          id: 3,
          category: 'Fisiopatologia',
          result: 'Continuar com a medicação e fisioterapia, monitorando a evolução.',
          createdAt: '2024-07-22T00:00:00Z',
          confidenceScore: 0.85,
          isCompleted: true
        },
        {
          id: 4,
          category: 'Apresentação Clínica',
          result: 'Continuar com a medicação e fisioterapia, monitorando a evolução.',
          createdAt: '2024-07-22T00:00:00Z',
          confidenceScore: 0.90,
          isCompleted: true
        },
        {
          id: 5,
          category: 'Abordagem diagnóstica',
          result: 'Continuar com a medicação e fisioterapia, monitorando a evolução.',
          createdAt: '2024-07-22T00:00:00Z',
          confidenceScore: 0.87,
          isCompleted: true
        },
        {
          id: 6,
          category: 'Abordagem Terapêutica',
          result: 'Continuar com a medicação e fisioterapia, monitorando a evolução.',
          createdAt: '2024-07-22T00:00:00Z',
          confidenceScore: 0.89,
          isCompleted: true
        },
        {
          id: 7,
          category: 'Guia de Prescrição',
          result: 'Continuar com a medicação e fisioterapia, monitorando a evolução.',
          createdAt: '2024-07-22T00:00:00Z',
          confidenceScore: 0.91,
          isCompleted: true
        }
      ]
    });
  }, []);

  const toggleSection = (category) => {
    setExpandedSections(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

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
            Submitted on Oct 26, 2024, 10:30 AM
          </Text>
          <Text style={styles.caseTitle}>{analysis?.title}</Text>
        </View>

        {/* Analysis Results */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Análise da IA</Text>
          
          {analysis?.AnalysisResults?.map((result) => (
            <TouchableOpacity
              key={result.id}
              style={styles.resultCard}
              onPress={() => toggleSection(result.category)}
            >
              <View style={styles.resultHeader}>
                <Text style={styles.resultCategory}>{result.category}</Text>
                <Icon 
                  name={expandedSections[result.category] ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                  size={24} 
                  color="#6B7280" 
                />
              </View>
              
              {!expandedSections[result.category] && (
                <View style={styles.resultPreview}>
                  <Text style={styles.resultText} numberOfLines={2}>
                    {result.result}
                  </Text>
                  <Text style={styles.resultDate}>
                    22/07/2024
                  </Text>
                </View>
              )}

              {expandedSections[result.category] && (
                <View style={styles.resultContent}>
                  <Text style={styles.resultText}>{result.result}</Text>
                  <Text style={styles.resultDate}>22/07/2024</Text>
                </View>
              )}
              
              <View style={styles.completedIndicator}>
                <Icon name="check" size={16} color="#10B981" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  resultCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  resultDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  completedIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
});

export default AnalysisResultScreen;
