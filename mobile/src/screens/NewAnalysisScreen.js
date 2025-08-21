import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image, Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import AIAnalysisProgress from '../components/AIAnalysisProgress'; // Componente que criamos

const NewAnalysisScreen = ({ navigation, route }) => {
  const [selectedPatient, setSelectedPatient] = useState(route.params?.selectedPatient || null);
  const [images, setImages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [historyText, setHistoryText] = useState('');
  const [previousHistoryText, setPreviousHistoryText] = useState('');
  const [physicalExamText, setPhysicalExamText] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estados para a análise de IA
  const [aiAnalysisVisible, setAiAnalysisVisible] = useState(false);
  const [currentAnalysisId, setCurrentAnalysisId] = useState(null);

  useEffect(() => {
    console.log('Route params:', route.params);
    console.log('Selected patient:', selectedPatient);
    
    if (route.params?.selectedPatient) {
      setSelectedPatient(route.params.selectedPatient);
    }
  }, [route.params]);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Erro', 'Permissão para acessar galeria negada');
      }
    }
  };

  useEffect(() => {
    requestPermissions();
  }, []);

  const pickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        setImages(prev => [...prev, ...result.assets]);
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro ao selecionar imagem');
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImages(prev => [...prev, ...result.assets]);
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro ao capturar foto');
    }
  };

  const pickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        multiple: true,
      });

      if (!result.canceled) {
        setDocuments(prev => [...prev, ...result.assets]);
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro ao selecionar documento');
    }
  };

  const removeImage = (indexToRemove) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const submitAnalysis = async () => {
    // Validação básica - pelo menos um campo deve estar preenchido
    if (!historyText && !previousHistoryText && !physicalExamText && images.length === 0 && documents.length === 0) {
      Alert.alert('Erro', 'Preencha pelo menos um campo ou adicione imagens/documentos');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      
      // Adiciona patientId se houver paciente selecionado com nome
      if (selectedPatient && selectedPatient.name && selectedPatient.id) {
        console.log('Submitting with patient:', selectedPatient);
        formData.append('patientId', selectedPatient.id);
        formData.append('title', `Análise para ${selectedPatient.name}`);
      } else {
        console.log('Submitting without patient');
        formData.append('title', 'Análise Geral');
      }
      
      // Construir descrição completa
      let fullDescription = historyText || '';
      if (previousHistoryText) {
        fullDescription = fullDescription ? 
          `${fullDescription}\n\nHistórico Prévio: ${previousHistoryText}` : 
          `Histórico Prévio: ${previousHistoryText}`;
      }
      
      formData.append('description', fullDescription);
      formData.append('symptoms', physicalExamText);

      // Add images
      images.forEach((image, index) => {
        formData.append('images', {
          uri: image.uri,
          type: image.type || 'image/jpeg',
          name: image.fileName || `image_${index}.jpg`,
        });
      });

      // Add documents (como imagens também)
      documents.forEach((doc, index) => {
        formData.append('images', {
          uri: doc.uri,
          type: doc.mimeType || 'application/pdf',
          name: doc.name || `document_${index}.pdf`,
        });
      });

      const response = await axios.post('/analysis', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Sucesso ao criar análise - iniciar processamento de IA
      const analysisId = response.data.analysis?.id;
      
      if (analysisId) {
        // Mostrar modal de progresso da IA
        setCurrentAnalysisId(analysisId);
        setAiAnalysisVisible(true);
        
        // Limpar formulário
        setHistoryText('');
        setPreviousHistoryText('');
        setPhysicalExamText('');
        setImages([]);
        setDocuments([]);
        
        Alert.alert('✅ Análise Criada!', 'A análise foi enviada para processamento de IA. Acompanhe o progresso na tela.', [
          { text: 'OK' }
        ]);
      } else {
        Alert.alert('Erro', 'Não foi possível obter ID da análise');
      }

    } catch (error) {
      console.error('Submission error:', error);
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao enviar análise');
    } finally {
      setLoading(false);
    }
  };

  // Callback quando a análise de IA é concluída
  const handleAIAnalysisComplete = (data) => {
    setAiAnalysisVisible(false);
    setCurrentAnalysisId(null);
    
    Alert.alert(
      '🎉 Análise Concluída!', 
      `A IA processou sua análise com ${Math.round(data.confidence * 100)}% de confiança.`,
      [
        { 
          text: 'Ver Resultados', 
          onPress: () => navigation.navigate('AnalysisResult', { analysisId: data.analysisId })
        },
        { 
          text: 'Continuar', 
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  // Callback quando há erro na análise de IA
  const handleAIAnalysisError = (error) => {
    setAiAnalysisVisible(false);
    setCurrentAnalysisId(null);
    
    Alert.alert(
      '❌ Erro na Análise', 
      error.message || 'Ocorreu um erro durante o processamento da IA.',
      [
        { text: 'OK' }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nova Análise</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Selected Patient Display - Condição mais robusta */}
        {selectedPatient && selectedPatient.name ? (
          <View style={styles.selectedPatientContainer}>
            <View style={styles.selectedPatientCard}>
              <View style={styles.patientAvatar}>
                <Icon name="person" size={24} color="#1E3A8A" />
              </View>
              <View style={styles.selectedPatientInfo}>
                <Text style={styles.selectedPatientName}>
                  Paciente: {selectedPatient.name}
                </Text>
                <Text style={styles.selectedPatientSubtitle}>
                  {selectedPatient.email || 'Email não informado'}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.removePatientButton}
                onPress={() => setSelectedPatient(null)}
              >
                <Icon name="close" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.noPatientContainer}>
            <View style={styles.noPatientCard}>
              <Icon name="person-outline" size={24} color="#6B7280" />
              <Text style={styles.noPatientText}>
                Análise geral (sem paciente vinculado)
              </Text>
            </View>
          </View>
        )}

        {/* Medical Images Section */}
        <View style={styles.imagesSection}>
          <Text style={styles.sectionTitle}>Imagens Médicas</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
            {images.map((image, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri: image.uri }} style={styles.medicalImage} />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Icon name="close" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
            {Array.from({ length: Math.max(0, 3 - images.length) }, (_, index) => (
              <TouchableOpacity 
                key={`placeholder-${index}`} 
                style={styles.addImagePlaceholder} 
                onPress={pickImages}
              >
                <Icon name="add" size={32} color="#9CA3AF" />
                <Text style={styles.addImageText}>Adicionar</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Capture Image Button */}
        <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
          <Icon name="camera-alt" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.captureButtonText}>Capturar Imagem</Text>
        </TouchableOpacity>

        {/* História da Doença */}
        <View style={styles.fieldContainer}>
          <View style={styles.fieldHeader}>
            <Text style={styles.fieldTitle}>História da Doença</Text>
            <TouchableOpacity>
              <Icon name="help-outline" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={6}
            value={historyText}
            onChangeText={setHistoryText}
            placeholder="Descreva a história da doença atual..."
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Histórico Prévio do Paciente */}
        <View style={styles.fieldContainer}>
          <View style={styles.fieldHeader}>
            <Text style={styles.fieldTitle}>Histórico Prévio do Paciente</Text>
            <TouchableOpacity>
              <Icon name="help-outline" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={6}
            value={previousHistoryText}
            onChangeText={setPreviousHistoryText}
            placeholder="Histórico médico anterior, cirurgias, medicações..."
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Exame Físico */}
        <View style={styles.fieldContainer}>
          <View style={styles.fieldHeader}>
            <Text style={styles.fieldTitle}>Exame Físico</Text>
            <TouchableOpacity>
              <Icon name="help-outline" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={6}
            value={physicalExamText}
            onChangeText={setPhysicalExamText}
            placeholder="Achados do exame físico, sinais clínicos..."
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Anexos de Exames/Documentos */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldTitle}>Anexos de Exames/Documentos</Text>
          
          <TouchableOpacity style={styles.attachmentButton} onPress={pickDocuments}>
            <Icon name="attach-file" size={24} color="#6B7280" />
            <Text style={styles.attachmentText}>Selecionar arquivos</Text>
            <Text style={styles.attachmentCount}>{documents.length} de 5</Text>
          </TouchableOpacity>

          {/* Show selected documents */}
          {documents.map((doc, index) => (
            <View key={index} style={styles.documentItem}>
              <Icon name="description" size={20} color="#6B7280" />
              <Text style={styles.documentName}>{doc.name}</Text>
              <TouchableOpacity onPress={() => setDocuments(prev => prev.filter((_, i) => i !== index))}>
                <Icon name="close" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Submit Button com indicação de IA */}
        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.disabledButton]} 
          onPress={submitAnalysis} 
          disabled={loading}
        >
          <Icon name="psychology" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.submitButtonText}>
            {loading ? 'Enviando...' : 'Analisar com IA Médica'}
          </Text>
        </TouchableOpacity>

        {/* AI Info */}
        <View style={styles.aiInfoContainer}>
          <Icon name="auto-awesome" size={16} color="#3B82F6" />
          <Text style={styles.aiInfoText}>
            Nossa IA médica analisará todos os dados fornecidos e gerará relatórios detalhados sobre diagnóstico, etiologia, fisiopatologia e tratamento.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal de Progresso da IA */}
      <AIAnalysisProgress
        visible={aiAnalysisVisible}
        analysisId={currentAnalysisId}
        doctorId={selectedPatient?.doctorId || 'general'} // Use o ID do médico ou 'general'
        onComplete={handleAIAnalysisComplete}
        onError={handleAIAnalysisError}
      />
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
    paddingHorizontal: 20,
  },
  selectedPatientContainer: {
    marginVertical: 20,
  },
  selectedPatientCard: {
    backgroundColor: '#E0E7FF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedPatientInfo: {
    flex: 1,
  },
  selectedPatientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  selectedPatientSubtitle: {
    fontSize: 14,
    color: '#6366F1',
    marginTop: 2,
  },
  removePatientButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPatientContainer: {
    marginVertical: 20,
  },
  noPatientCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPatientText: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 12,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  imagesSection: {
    marginVertical: 20,
  },
  imagesScroll: {
    flexDirection: 'row',
  },
  imageContainer: {
    marginRight: 12,
    position: 'relative',
  },
  medicalImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    marginRight: 12,
  },
  addImageText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  captureButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  captureButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  fieldTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: '#FFFFFF',
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  attachmentText: {
    flex: 1,
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 12,
  },
  attachmentCount: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    marginTop: 8,
  },
  documentName: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  submitButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  aiInfoContainer: {
    backgroundColor: '#EBF4FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  aiInfoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
    flex: 1,
    marginLeft: 8,
  },
});

export default NewAnalysisScreen;