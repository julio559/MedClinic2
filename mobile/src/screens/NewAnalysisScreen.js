import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image, Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';

const NewAnalysisScreen = ({ navigation, route }) => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(route.params?.selectedPatient || null);
  const [images, setImages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [historyText, setHistoryText] = useState('');
  const [previousHistoryText, setPreviousHistoryText] = useState('');
  const [physicalExamText, setPhysicalExamText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPatients();
    requestPermissions();
    
    // Se veio de um paciente específico, já seleciona
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

  const loadPatients = async () => {
    try {
      const response = await axios.get('/patients');
      setPatients(response.data);
    } catch (error) {
      // Mock data if API fails
      setPatients([
        {
          id: '1',
          name: 'Asthma Treatment',
          subtitle: 'Olivia Davis'
        },
        {
          id: '2', 
          name: 'Diabetes Treatment',
          subtitle: 'João Silva'
        },
        {
          id: '3',
          name: 'Hypertension',
          subtitle: 'Maria Santos'
        }
      ]);
    }
  };

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

  const submitAnalysis = async () => {
    if (!selectedPatient) {
      Alert.alert('Erro', 'Selecione um paciente primeiro');
      return;
    }

    if (!historyText && images.length === 0 && documents.length === 0) {
      Alert.alert('Erro', 'Preencha pelo menos um campo ou adicione imagens/documentos');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('patientId', selectedPatient.id);
      formData.append('title', `Análise para ${selectedPatient.name}`);
      formData.append('description', historyText);
      formData.append('symptoms', physicalExamText);

      // Add images
      images.forEach((image, index) => {
        formData.append('images', {
          uri: image.uri,
          type: image.type || 'image/jpeg',
          name: image.fileName || `image_${index}.jpg`,
        });
      });

      // Add documents
      documents.forEach((doc, index) => {
        formData.append('documents', {
          uri: doc.uri,
          type: doc.mimeType || 'application/pdf',
          name: doc.name || `document_${index}.pdf`,
        });
      });

      const response = await axios.post('/analysis', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Sucesso', 'Análise enviada com sucesso!', [
        { 
          text: 'Ver Resultados', 
          onPress: () => navigation.navigate('AnalysisResult', { analysisId: response.data.analysis?.id })
        },
        { 
          text: 'OK', 
          onPress: () => navigation.goBack()
        }
      ]);
    } catch (error) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao enviar análise');
    } finally {
      setLoading(false);
    }
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
        {/* Selected Patient Display */}
        {selectedPatient && (
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
                  {selectedPatient.subtitle}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.changePatientButton}
                onPress={() => setSelectedPatient(null)}
              >
                <Text style={styles.changePatientText}>Alterar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Patient Selection (if none selected) */}
        {!selectedPatient && (
          <View style={styles.patientSelectionContainer}>
            <Text style={styles.sectionTitle}>Selecionar Paciente</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {patients.map((patient) => (
                <TouchableOpacity
                  key={patient.id}
                  style={styles.patientCard}
                  onPress={() => setSelectedPatient(patient)}
                >
                  <Icon name="person" size={24} color="#6B7280" />
                  <Text style={styles.patientCardName}>{patient.name}</Text>
                  <Text style={styles.patientCardSubtitle}>{patient.subtitle}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Medical Images Section */}
        <View style={styles.imagesSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
            {images.map((image, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri: image.uri }} style={styles.medicalImage} />
              </View>
            ))}
            {Array.from({ length: Math.max(0, 3 - images.length) }, (_, index) => (
              <TouchableOpacity 
                key={`placeholder-${index}`} 
                style={styles.addImagePlaceholder} 
                onPress={pickImages}
              >
                <Icon name="add" size={32} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Capture Image Button */}
        <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
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
            placeholder="Descreva a história da doença..."
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
            placeholder="Descreva o histórico prévio..."
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Exame Físico da Doença */}
        <View style={styles.fieldContainer}>
          <View style={styles.fieldHeader}>
            <Text style={styles.fieldTitle}>Exame Físico da Doença</Text>
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
            placeholder="Descreva o exame físico..."
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

        {/* Submit Button */}
        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.disabledButton]} 
          onPress={submitAnalysis} 
          disabled={loading || !selectedPatient}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Enviando...' : 'Enviar Análise para EYA'}
          </Text>
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
  changePatientButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  changePatientText: {
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  patientSelectionContainer: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  patientCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 120,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  patientCardName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
    textAlign: 'center',
  },
  patientCardSubtitle: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  imagesSection: {
    marginVertical: 20,
  },
  imagesScroll: {
    flexDirection: 'row',
  },
  imageContainer: {
    marginRight: 12,
  },
  medicalImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
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
  captureButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
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
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight:'600',
 },
 disabledButton: {
   backgroundColor: '#9CA3AF',
 },
});

export default NewAnalysisScreen;
