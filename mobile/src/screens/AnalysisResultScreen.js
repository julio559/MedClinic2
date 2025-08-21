// src/screens/AnalysisResultScreen.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Image, Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';

// (Opcional) Socket.IO – instale: npm i socket.io-client
let io;
try {
  // import dinâmico pra não quebrar caso não esteja instalado
  // eslint-disable-next-line global-require
  io = require('socket.io-client').io;
} catch (_) {
  io = null;
}

const POLL_MS = 4000;

const AnalysisResultScreen = ({ route, navigation }) => {
  const { analysisId, doctorId } = route.params; // passe doctorId = id do médico logado
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({});
  const [joiningSocket, setJoiningSocket] = useState(false);
  const pollRef = useRef(null);
  const socketRef = useRef(null);

  // Base para carregar imagens do backend
  const BASE = useMemo(
    () => (axios.defaults.baseURL ? axios.defaults.baseURL.replace(/\/$/, '') : ''),
    []
  );

  const imageUrl = (filename) =>
    `${BASE}/uploads/medical-images/${filename}`;

  useEffect(() => {
    loadAnalysisData(); // busca inicial
    startPolling();     // inicia polling

    // Socket opcional
    if (io && doctorId) {
      setJoiningSocket(true);
      const s = io(BASE || 'http://localhost:3001', { transports: ['websocket'] });
      socketRef.current = s;
      s.on('connect', () => {
        s.emit('join_doctor_room', doctorId);
        setJoiningSocket(false);
      });
      s.on('analysis_completed', (payload) => {
        if (payload?.analysisId === analysisId) {
          // chegou evento de conclusão, força refresh e para polling
          stopPolling();
          loadAnalysisData();
        }
      });
    }

    return () => {
      stopPolling();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId, doctorId]);

  const startPolling = () => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`/analysis/${analysisId}/results`);
        const a = res.data;
        setAnalysis(a);
        if (a.status === 'completed' || a.status === 'failed') {
          stopPolling();
        }
      } catch (err) {
        // se der erro transitório continua tentando
      }
    }, POLL_MS);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

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
    setExpandedSections((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const reprocess = async () => {
    try {
      setLoading(true);
      await axios.post(`/analysis/${analysisId}/reprocess`);
      // volta para processing e reinicia polling
      await loadAnalysisData();
      startPolling();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível reprocessar agora.');
    } finally {
      setLoading(false);
    }
  };

  // Pega o “Diagnóstico Principal” se existir
  const mainDiag = useMemo(() => {
    if (!analysis?.AnalysisResults?.length) return null;
    return analysis.AnalysisResults.find((r) =>
      /diagn[oó]stico principal/i.test(r.category)
    ) || analysis.AnalysisResults[0];
  }, [analysis]);

  if (loading && !analysis) {
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
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isProcessing = analysis.status === 'processing' || analysis.status === 'pending';
  const isFailed = analysis.status === 'failed';

  return (
    <View style={styles.container}>
      {/* Header */}
     
      <ScrollView style={styles.content}>
        {/* Caso clínico */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clinical Case</Text>
          <Text style={styles.submittedText}>Submitted on {formatDateTime(analysis.createdAt)}</Text>
          <Text style={styles.caseTitle}>{analysis.title}</Text>

          {analysis.description ? (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionText}>{analysis.description}</Text>
            </View>
          ) : null}

          {analysis.symptoms ? (
            <View style={styles.symptomsContainer}>
              <Text style={styles.symptomsLabel}>Sintomas relatados:</Text>
              <Text style={styles.symptomsText}>{analysis.symptoms}</Text>
            </View>
          ) : null}
        </View>

        {/* Imagens enviadas */}
        {analysis.MedicalImages?.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Submitted Images</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesRow}>
              {analysis.MedicalImages.map((img, i) => (
                <View key={img.id} style={styles.imageWrap}>
                  <Image
                    source={{ uri: imageUrl(img.filename) }}
                    style={styles.medicalImage}
                    resizeMode="cover"
                  />
                  <Text style={styles.imageLabel}>{`Image ${i + 1}`}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Análise da IA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Análise da IA</Text>

          {/* Resumo (diagnóstico principal quando existir) */}
          <View style={styles.aiResponseContainer}>
            <Text style={styles.aiResponseTitle}>Resumo</Text>
            {mainDiag ? (
              <>
                <Text style={styles.aiResponseText}>{mainDiag.result}</Text>
                {typeof mainDiag.confidenceScore === 'number' && (
                  <Text style={styles.confidenceInline}>
                    {Math.round(mainDiag.confidenceScore * 100)}% de confiança
                  </Text>
                )}
              </>
            ) : isProcessing ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color="#0369A1" />
                <Text style={styles.aiResponseText}>Análise em processamento…</Text>
              </View>
            ) : isFailed ? (
              <Text style={styles.aiResponseText}>A análise falhou. Tente reprocessar abaixo.</Text>
            ) : (
              <Text style={styles.aiResponseText}>Sem resultados ainda.</Text>
            )}
          </View>

          {/* Resultados detalhados */}
          {analysis.AnalysisResults?.length ? (
            analysis.AnalysisResults.map((result) => (
              <TouchableOpacity
                key={result.id}
                style={styles.resultCard}
                onPress={() => toggleSection(result.category)}
                activeOpacity={0.8}
              >
                <View style={styles.resultHeader}>
                  <Text style={styles.resultCategory}>{result.category}</Text>
                  <View style={styles.resultHeaderRight}>
                    {result.isCompleted && (
                      <Icon name="check" size={16} color="#10B981" style={{ marginRight: 8 }} />
                    )}
                    <Icon
                      name={expandedSections[result.category] ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                      size={24}
                      color="#6B7280"
                    />
                  </View>
                </View>

                {!expandedSections[result.category] ? (
                  <View style={styles.resultPreview}>
                    <Text style={styles.resultText} numberOfLines={2}>{result.result}</Text>
                    <Text style={styles.resultDate}>{formatDate(result.createdAt)}</Text>
                  </View>
                ) : (
                  <View style={styles.resultContent}>
                    <Text style={styles.resultText}>{result.result}</Text>
                    <View style={styles.resultFooter}>
                      <Text style={styles.resultDate}>{formatDate(result.createdAt)}</Text>
                      {typeof result.confidenceScore === 'number' && (
                        <Text style={styles.confidenceText}>
                          {Math.round(result.confidenceScore * 100)}% confiança
                        </Text>
                      )}
                    </View>
                    {result.aiModel ? (
                      <Text style={styles.aiModelText}>Modelo: {result.aiModel}</Text>
                    ) : null}
                  </View>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>
                {isProcessing
                  ? 'Análise ainda em processamento…'
                  : isFailed
                  ? 'A análise falhou.'
                  : 'Sem resultados.'}
              </Text>
            </View>
          )}

          {/* Estado e ações */}
          {isProcessing && (
            <View style={styles.inlineState}>
              <ActivityIndicator size="small" color="#1E3A8A" />
              <Text style={styles.inlineStateText}>
                Aguardando conclusão {joiningSocket ? '(conectando notificações…) ' : ''}…
              </Text>
            </View>
          )}
          {isFailed && (
            <TouchableOpacity style={styles.reprocessBtn} onPress={reprocess}>
              <Icon name="refresh" size={18} color="#1E3A8A" />
              <Text style={styles.reprocessText}>Reprocessar com IA</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Dados enviados pelo médico (placeholder simples) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Doctor's Submitted Data</Text>
          <View style={styles.doctorDataContainer}>
            <View style={styles.doctorIcon}>
              <Icon name="local-hospital" size={40} color="#10B981" />
            </View>
            <Text style={styles.doctorDataText}>Medical Information</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#FFFFFF' },
  loadingContainer:{ flex:1, justifyContent:'center', alignItems:'center' },
  loadingText:{ marginTop:16, fontSize:16, color:'#6B7280' },
  errorContainer:{ flex:1, justifyContent:'center', alignItems:'center', paddingHorizontal:40 },
  errorText:{ fontSize:18, fontWeight:'bold', color:'#EF4444', marginTop:16, marginBottom:24 },
  backButton:{ backgroundColor:'#1E3A8A', borderRadius:8, paddingHorizontal:24, paddingVertical:12 },
  backButtonText:{ color:'#FFFFFF', fontSize:16, fontWeight:'600' },
  header:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingVertical:16, paddingTop:50, backgroundColor:'#FFFFFF', borderBottomWidth:1, borderBottomColor:'#E5E7EB' },
  headerTitle:{ fontSize:18, fontWeight:'600', color:'#1F2937' },
  content:{ flex:1 },
  section:{ paddingHorizontal:20, paddingVertical:16, borderBottomWidth:1, borderBottomColor:'#F3F4F6' },
  sectionTitle:{ fontSize:18, fontWeight:'600', color:'#1F2937', marginBottom:12 },
  submittedText:{ fontSize:14, color:'#6B7280', marginBottom:8 },
  caseTitle:{ fontSize:20, fontWeight:'bold', color:'#1F2937', marginBottom:16 },
  descriptionContainer:{ backgroundColor:'#F9FAFB', borderRadius:8, padding:12, marginBottom:12 },
  descriptionText:{ fontSize:14, color:'#374151', lineHeight:20 },
  symptomsContainer:{ backgroundColor:'#FEF3C7', borderRadius:8, padding:12, marginBottom:12 },
  symptomsLabel:{ fontSize:14, fontWeight:'600', color:'#92400E', marginBottom:4 },
  symptomsText:{ fontSize:14, color:'#92400E', lineHeight:20 },
  imagesRow:{ flexDirection:'row' },
  imageWrap:{ alignItems:'center', marginRight:16 },
  medicalImage:{ width:100, height:100, borderRadius:8, backgroundColor:'#F3F4F6' },
  imageLabel:{ fontSize:12, color:'#6B7280', textAlign:'center', marginTop:6 },
  aiResponseContainer:{ backgroundColor:'#F0F9FF', borderRadius:8, padding:16, marginBottom:16 },
  aiResponseTitle:{ fontSize:16, fontWeight:'600', color:'#0369A1', marginBottom:8 },
  aiResponseText:{ fontSize:14, color:'#0369A1', lineHeight:20 },
  confidenceInline:{ marginTop:8, fontSize:12, color:'#0369A1', fontWeight:'600' },
  resultCard:{ backgroundColor:'#F9FAFB', borderRadius:8, padding:16, marginBottom:12 },
  resultHeader:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  resultHeaderRight:{ flexDirection:'row', alignItems:'center' },
  resultCategory:{ fontSize:16, fontWeight:'600', color:'#1F2937' },
  resultPreview:{ marginTop:8 },
  resultContent:{ marginTop:8 },
  resultText:{ fontSize:14, color:'#6B7280', lineHeight:20, marginBottom:8 },
  resultFooter:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:4 },
  resultDate:{ fontSize:12, color:'#9CA3AF' },
  confidenceText:{ fontSize:12, color:'#10B981', fontWeight:'600' },
  aiModelText:{ fontSize:11, color:'#9CA3AF', fontStyle:'italic' },
  noResultsContainer:{ backgroundColor:'#FEF3C7', borderRadius:8, padding:16, alignItems:'center' },
  noResultsText:{ fontSize:14, color:'#92400E', textAlign:'center' },
  doctorDataContainer:{ backgroundColor:'#F0FDF4', borderRadius:8, padding:24, alignItems:'center' },
  doctorIcon:{ marginBottom:12 },
  doctorDataText:{ fontSize:16, color:'#166534', fontWeight:'500' },
  inlineState:{ flexDirection:'row', alignItems:'center', gap:8, marginTop:12 },
  inlineStateText:{ color:'#1F2937' },
  reprocessBtn:{
    marginTop:12, alignSelf:'flex-start', flexDirection:'row',
    gap:8, backgroundColor:'#E0E7FF', borderRadius:8, paddingVertical:10, paddingHorizontal:12
  },
  reprocessText:{ color:'#1E3A8A', fontWeight:'600' },
});

export default AnalysisResultScreen;
