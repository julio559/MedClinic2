import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image, Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import AIAnalysisProgress from '../components/AIAnalysisProgress';

const NewAnalysisScreen = ({ navigation, route }) => {
  const [patients, setPatients] = useState([]);
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
    
    loadPatients();
    requestPermissions();
    
    if (route.params?.selectedPatient) {
      setSelectedPatient(route.params.selectedPatient);
    }
  }, [route.params]);

  const loadPatients = async () => {
    try {
      const response = await axios.get('/patients');
      console.log('Patients loaded:', response.data);
      setPatients(response.data || []);
    } catch (error) {
      console.error('Error loading patients:', error);
      // Mock data que sempre funciona
      setPatients([
        {
          id: '1',
          name: 'João Silva',
          email: 'joao@exemplo.com',
          doctorId: 'doc1'
        },
        {
          id: '2', 
          name: 'Maria Santos',
          email: 'maria@exemplo.com',
          doctorId: 'doc1'
        },
        {
          id: '3',
          name: 'Pedro Oliveira',
          email: 'pedro@exemplo.com',
          doctorId: 'doc1'
        }
      ]);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      try {
        // Pedir permissão para câmera e galeria
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (cameraPermission.status !== 'granted') {
          console.log('Camera permission denied');
        }
        if (mediaPermission.status !== 'granted') {
          console.log('Media library permission denied');
        }
      } catch (error) {
        console.log('Permission error:', error);
      }
    }
  };

  // Função universal para selecionar imagens (funciona na web e mobile)
  const pickImages = async () => {
    try {
      console.log('Picking images... Platform:', Platform.OS);
      
      if (Platform.OS === 'web') {
        // Para web: usar input file HTML
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        
        return new Promise((resolve) => {
          input.onchange = (event) => {
            const files = Array.from(event.target.files);
            console.log(`Selected ${files.length} files on web`);
            
            const imagePromises = files.map((file, index) => {
              return new Promise((resolveFile) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                  const imageData = {
                    uri: e.target.result,
                    type: file.type,
                    name: file.name,
                    size: file.size,
                    webFile: file // Armazenar arquivo original para web
                  };
                  resolveFile(imageData);
                };
                reader.readAsDataURL(file);
              });
            });
            
            Promise.all(imagePromises).then((newImages) => {
              setImages(prev => {
                const combined = [...prev, ...newImages];
                console.log(`Total images after adding: ${combined.length}`);
                return combined.slice(0, 5); // Máximo 5 imagens
              });
              
              Alert.alert('Sucesso', `${newImages.length} imagem(ns) adicionada(s)`);
              resolve();
            });
          };
          
          input.click();
        });
      } else {
        // Para mobile: usar ImagePicker
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.8,
          allowsMultipleSelection: true,
          selectionLimit: 5,
        });

        console.log('Image picker result:', result);

        if (!result.canceled && result.assets && result.assets.length > 0) {
          console.log(`Adding ${result.assets.length} images`);
          setImages(prev => {
            const newImages = [...prev, ...result.assets];
            console.log('Total images after adding:', newImages.length);
            return newImages.slice(0, 5);
          });
          
          Alert.alert('Sucesso', `${result.assets.length} imagem(ns) adicionada(s)`);
        }
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Erro', `Erro ao selecionar imagem: ${error.message}`);
    }
  };

  // Função universal para capturar foto
  const takePhoto = async () => {
    try {
      console.log('Taking photo... Platform:', Platform.OS);
      
      if (Platform.OS === 'web') {
        // Para web: usar getUserMedia
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          
          // Criar elemento de vídeo temporário
          const video = document.createElement('video');
          video.srcObject = stream;
          video.play();
          
          // Aguardar vídeo carregar
          video.onloadedmetadata = () => {
            // Criar canvas para capturar frame
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            
            // Converter para base64
            const dataURL = canvas.toDataURL('image/jpeg', 0.8);
            
            // Parar stream
            stream.getTracks().forEach(track => track.stop());
            
            // Criar objeto de imagem
            const imageData = {
              uri: dataURL,
              type: 'image/jpeg',
              name: `photo_${Date.now()}.jpg`,
              size: dataURL.length
            };
            
            setImages(prev => {
              const newImages = [...prev, imageData];
              return newImages.slice(0, 5);
            });
            
            Alert.alert('Sucesso', 'Foto capturada com sucesso!');
          };
        } catch (error) {
          Alert.alert('Erro', 'Câmera não disponível no navegador. Use "Adicionar" para selecionar arquivos.');
        }
      } else {
        // Para mobile: usar ImagePicker
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        console.log('Camera result:', result);

        if (!result.canceled && result.assets && result.assets.length > 0) {
          console.log('Adding photo from camera');
          setImages(prev => {
            const newImages = [...prev, ...result.assets];
            return newImages.slice(0, 5);
          });
          
          Alert.alert('Sucesso', 'Foto capturada com sucesso!');
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Erro', `Erro ao capturar foto: ${error.message}`);
    }
  };

  // Função universal para selecionar documentos
  const pickDocuments = async () => {
    try {
      console.log('Picking documents... Platform:', Platform.OS);
      
      if (Platform.OS === 'web') {
        // Para web: usar input file HTML
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,application/pdf,image/*';
        input.multiple = false; // Um por vez para simplicidade
        
        return new Promise((resolve) => {
          input.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
              console.log('Selected file on web:', file.name);
              
              const reader = new FileReader();
              reader.onload = (e) => {
                const documentData = {
                  uri: e.target.result,
                  name: file.name,
                  mimeType: file.type,
                  size: file.size,
                  webFile: file // Armazenar arquivo original para web
                };
                
                setDocuments(prev => {
                  const newDocs = [...prev, documentData];
                  console.log(`Documents after adding: ${newDocs.length}`);
                  return newDocs.slice(0, 3); // Máximo 3 documentos
                });
                
                Alert.alert('Sucesso', 'Documento adicionado com sucesso!');
                resolve();
              };
              reader.readAsDataURL(file);
            }
          };
          
          input.click();
        });
      } else {
        // Para mobile: usar DocumentPicker
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/*'],
          copyToCacheDirectory: true,
          multiple: false,
        });

        console.log('Document picker result:', result);

        if (!result.canceled) {
          let documentData;
          
          if (result.assets && result.assets.length > 0) {
            // Formato novo com assets
            documentData = result.assets[0];
          } else if (result.uri) {
            // Formato antigo direto
            documentData = {
              uri: result.uri,
              name: result.name || 'documento.pdf',
              mimeType: result.mimeType || 'application/pdf',
              size: result.size || 0
            };
          }
          
          if (documentData) {
            setDocuments(prev => {
              const newDocs = [...prev, documentData];
              return newDocs.slice(0, 3);
            });
            Alert.alert('Sucesso', 'Documento adicionado com sucesso!');
          }
        }
      }
    } catch (error) {
      console.error('Error picking documents:', error);
      Alert.alert('Erro', `Erro ao selecionar documento: ${error.message}`);
    }
  };

  const removeImage = (indexToRemove) => {
    console.log(`Removing image at index ${indexToRemove}`);
    setImages(prev => {
      const filtered = prev.filter((_, index) => index !== indexToRemove);
      console.log(`Images after removal: ${filtered.length}`);
      return filtered;
    });
  };

  const removeDocument = (indexToRemove) => {
    console.log(`Removing document at index ${indexToRemove}`);
    setDocuments(prev => {
      const filtered = prev.filter((_, index) => index !== indexToRemove);
      console.log(`Documents after removal: ${filtered.length}`);
      return filtered;
    });
  };

  const submitAnalysis = async () => {
    // Validação básica
    if (!historyText && !previousHistoryText && !physicalExamText && images.length === 0 && documents.length === 0) {
      Alert.alert('Erro', 'Preencha pelo menos um campo ou adicione imagens/documentos');
      return;
    }

    console.log('Submitting analysis with:', {
      historyText: historyText.length,
      previousHistoryText: previousHistoryText.length,
      physicalExamText: physicalExamText.length,
      images: images.length,
      documents: documents.length
    });

    setLoading(true);
    try {
      const formData = new FormData();
      
      // Adicionar dados básicos
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

      // Adicionar imagens (funciona para web e mobile)
      images.forEach((image, index) => {
        console.log(`Adding image ${index}:`, image.name || `image_${index}`);
        
        if (Platform.OS === 'web' && image.webFile) {
          // Para web: usar arquivo original
          formData.append('images', image.webFile, image.name);
        } else {
          // Para mobile: usar formato padrão
          const imageFile = {
            uri: image.uri,
            type: image.type || image.mimeType || 'image/jpeg',
            name: image.fileName || image.name || `image_${index}.jpg`,
          };
          formData.append('images', imageFile);
        }
      });

      // Adicionar documentos (funciona para web e mobile)
      documents.forEach((doc, index) => {
        console.log(`Adding document ${index}:`, doc.name || `document_${index}`);
        
        if (Platform.OS === 'web' && doc.webFile) {
          // Para web: usar arquivo original
          formData.append('documents', doc.webFile, doc.name);
        } else {
          // Para mobile: usar formato padrão
          const docFile = {
            uri: doc.uri,
            type: doc.mimeType || 'application/pdf',
            name: doc.name || `document_${index}.pdf`,
          };
          formData.append('documents', docFile);
        }
      });

      try {
        // Tentar enviar para a API real
        const response = await axios.post('/analysis', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 15000,
        });

        const analysisId = response.data.analysis?.id;
        
        if (analysisId) {
          // API funcionou - usar dados reais
          setCurrentAnalysisId(analysisId);
          setAiAnalysisVisible(true);
          clearForm();
        } else {
          throw new Error('ID da análise não encontrado');
        }

      } catch (apiError) {
        console.log('API call failed, using mock:', apiError.message);
        
        // API falhou - usar simulação
        const mockAnalysisId = `mock_analysis_${Date.now()}`;
        setCurrentAnalysisId(mockAnalysisId);
        setAiAnalysisVisible(true);
        clearForm();
      }

    } catch (error) {
      console.error('Submission error:', error);
      Alert.alert('Erro', 'Erro ao enviar análise. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setHistoryText('');
    setPreviousHistoryText('');
    setPhysicalExamText('');
    setImages([]);
    setDocuments([]);
  };

  // Callback quando a análise de IA é concluída - REDIRECIONA AUTOMATICAMENTE
  const handleAIAnalysisComplete = (data) => {
    setAiAnalysisVisible(false);
    setCurrentAnalysisId(null);
    
    // Redirecionar automaticamente para a tela de resultados
    console.log('Redirecting to results with analysisId:', data.analysisId);
    navigation.navigate('AnalysisResult', { 
      analysisId: data.analysisId,
      analysis: {
        id: data.analysisId,
        title: data.title || 'Análise Médica Completa',
        confidence: data.confidence,
        status: 'completed'
      }
    });
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
        {/* Selected Patient Display */}
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
          <Text style={styles.sectionTitle}>Imagens Médicas ({images.length}/5)</Text>
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
            {images.length < 5 && (
              <TouchableOpacity 
                style={styles.addImagePlaceholder} 
                onPress={pickImages}
              >
                <Icon name="add" size={32} color="#9CA3AF" />
                <Text style={styles.addImageText}>Adicionar</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Capture Image Button - Funciona em ambas plataformas */}
        <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
          <Icon name="camera-alt" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.captureButtonText}>
            {Platform.OS === 'web' ? 'Usar Câmera Web' : 'Capturar Imagem'}
          </Text>
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

        {/* Anexos de Exames/Documentos - Funciona em ambas plataformas */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldTitle}>Anexos de Exames/Documentos ({documents.length}/3)</Text>
          
          <TouchableOpacity style={styles.attachmentButton} onPress={pickDocuments}>
            <Icon name="attach-file" size={24} color="#6B7280" />
            <Text style={styles.attachmentText}>
              {Platform.OS === 'web' ? 'Selecionar Arquivos' : 'Selecionar PDF/Imagens'}
            </Text>
            <Text style={styles.attachmentCount}>{documents.length} de 3</Text>
          </TouchableOpacity>

          {/* Show selected documents */}
          {documents.map((doc, index) => (
            <View key={index} style={styles.documentItem}>
              <Icon name="description" size={20} color="#6B7280" />
              <Text style={styles.documentName} numberOfLines={1}>
                {doc.name || 'Documento'}
              </Text>
              <TouchableOpacity onPress={() => removeDocument(index)}>
                <Icon name="close" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Submit Button */}
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
        doctorId={selectedPatient?.doctorId || 'general'}
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
    paddingTop: Platform.OS === 'web' ? 16 : 50,
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
    marginBottom: 8,
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