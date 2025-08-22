import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Platform,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import AIAnalysisProgress from '../components/AIAnalysisProgress';

const { width } = Dimensions.get('window');

const NewAnalysisScreen = ({ navigation, route }) => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(route.params?.selectedPatient || null);
  const [images, setImages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [historyText, setHistoryText] = useState('');
  const [previousHistoryText, setPreviousHistoryText] = useState('');
  const [physicalExamText, setPhysicalExamText] = useState('');
  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [expandedSection, setExpandedSection] = useState('images');
  
  // Estados para a análise de IA
  const [aiAnalysisVisible, setAiAnalysisVisible] = useState(false);
  const [currentAnalysisId, setCurrentAnalysisId] = useState(null);

  useEffect(() => {
    loadPatients();
    requestPermissions();
    if (route.params?.selectedPatient) setSelectedPatient(route.params.selectedPatient);
    
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true })
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params]);

  const loadPatients = async () => {
    try {
      const response = await axios.get('/patients');
      setPatients(response.data || []);
    } catch (error) {
      console.error('Error loading patients:', error);
      // Mock data
      setPatients([
        { id: '1', name: 'João Silva', email: 'joao@exemplo.com', doctorId: 'doc1' },
        { id: '2', name: 'Maria Santos', email: 'maria@exemplo.com', doctorId: 'doc1' },
        { id: '3', name: 'Pedro Oliveira', email: 'pedro@exemplo.com', doctorId: 'doc1' },
      ]);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      try {
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (cameraPermission.status !== 'granted') console.log('Camera permission denied');
        if (mediaPermission.status !== 'granted') console.log('Media library permission denied');
      } catch (error) {
        console.log('Permission error:', error);
      }
    }
  };

  const toggleSection = (section) => setExpandedSection(expandedSection === section ? null : section);

  // ====== IMAGENS ======
  const pickImages = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        return new Promise((resolve) => {
          input.onchange = (event) => {
            const files = Array.from(event.target.files || []);
            const imagePromises = files.map((file) => new Promise((resolveFile) => {
              const reader = new FileReader();
              reader.onload = (e) => resolveFile({ uri: e.target.result, type: file.type, name: file.name, size: file.size, webFile: file });
              reader.readAsDataURL(file);
            }));
            Promise.all(imagePromises).then((newImages) => {
              setImages((prev) => [...prev, ...newImages].slice(0, 5));
              Alert.alert('Sucesso', `${newImages.length} imagem(ns) adicionada(s)`);
              resolve();
            });
          };
          input.click();
        });
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.8,
          allowsMultipleSelection: true,
          selectionLimit: 5,
        });
        if (!result.canceled && result.assets?.length) {
          setImages((prev) => [...prev, ...result.assets].slice(0, 5));
          Alert.alert('Sucesso', `${result.assets.length} imagem(ns) adicionada(s)`);
        }
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Erro', `Erro ao selecionar imagem: ${error.message}`);
    }
  };

  const takePhoto = async () => {
    try {
      if (Platform.OS === 'web') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          const video = document.createElement('video');
          video.srcObject = stream;
          video.play();
          video.onloadedmetadata = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            const dataURL = canvas.toDataURL('image/jpeg', 0.8);
            stream.getTracks().forEach((t) => t.stop());
            const imageData = { uri: dataURL, type: 'image/jpeg', name: `photo_${Date.now()}.jpg`, size: dataURL.length };
            setImages((prev) => [...prev, imageData].slice(0, 5));
            Alert.alert('Sucesso', 'Foto capturada com sucesso!');
          };
        } catch (error) {
          Alert.alert('Erro', 'Câmera não disponível no navegador. Use "Adicionar" para selecionar arquivos.');
        }
      } else {
        const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
        if (!result.canceled && result.assets?.length) {
          setImages((prev) => [...prev, ...result.assets].slice(0, 5));
          Alert.alert('Sucesso', 'Foto capturada com sucesso!');
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Erro', `Erro ao capturar foto: ${error.message}`);
    }
  };

  const removeImage = (indexToRemove) => setImages((prev) => prev.filter((_, i) => i !== indexToRemove));

  // ====== DOCUMENTOS ======
  const pickDocuments = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = '.pdf,.doc,.docx,.txt,.rtf,.csv,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/rtf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/*';
        return new Promise((resolve) => {
          input.onchange = (event) => {
            const files = Array.from(event.target.files || []);
            const mapped = files.map((file) => ({
              uri: URL.createObjectURL(file),
              type: file.type || 'application/octet-stream',
              name: file.name,
              size: file.size,
              webFile: file,
            }));
            setDocuments((prev) => [...prev, ...mapped].slice(0, 10));
            Alert.alert('Sucesso', `${mapped.length} arquivo(s) anexado(s)`);
            resolve();
          };
          input.click();
        });
      } else {
        const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
        if (result && !result.canceled) {
          const picked = (result.assets || []).map((a) => ({ uri: a.uri, type: a.mimeType || 'application/octet-stream', name: a.name, size: a.size }));
          setDocuments((prev) => [...prev, ...picked].slice(0, 10));
          Alert.alert('Sucesso', `${picked.length} arquivo(s) anexado(s)`);
        }
      }
    } catch (error) {
      console.error('Document pick error:', error);
      Alert.alert('Erro', `Não foi possível anexar arquivos: ${error.message}`);
    }
  };

  const removeDocument = (indexToRemove) => setDocuments((prev) => prev.filter((_, i) => i !== indexToRemove));

  // ====== PROGRESSO ======
  const getFormProgress = () => {
    let progress = 0;
    let total = 4;
    if (images.length > 0) progress++;
    if (historyText.trim()) progress++;
    if (previousHistoryText.trim()) progress++;
    if (physicalExamText.trim()) progress++;
    return Math.round((progress / total) * 100);
  };

  // ====== SUBMIT ======
  const submitAnalysis = async () => {
    if (!historyText && !previousHistoryText && !physicalExamText && images.length === 0 && documents.length === 0) {
      Alert.alert('Erro', 'Preencha pelo menos um campo ou adicione imagens/documentos');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();

      if (selectedPatient?.name && selectedPatient?.id) {
        formData.append('patientId', selectedPatient.id);
        formData.append('title', `Análise para ${selectedPatient.name}`);
      } else {
        formData.append('title', 'Análise Geral');
      }

      let fullDescription = historyText || '';
      if (previousHistoryText) {
        fullDescription = fullDescription ? `${fullDescription}\n\nHistórico Prévio: ${previousHistoryText}` : `Histórico Prévio: ${previousHistoryText}`;
      }
      formData.append('description', fullDescription);
      formData.append('symptoms', physicalExamText);

      images.forEach((image, index) => {
        if (Platform.OS === 'web' && image.webFile) {
          formData.append('images', image.webFile, image.name || `image_${index}.jpg`);
        } else {
          const imageFile = { uri: image.uri, type: image.type || image.mimeType || 'image/jpeg', name: image.fileName || image.name || `image_${index}.jpg` };
          formData.append('images', imageFile);
        }
      });

      // anexar documentos
      documents.forEach((doc, index) => {
        if (Platform.OS === 'web' && doc.webFile) {
          formData.append('documents', doc.webFile, doc.name || `file_${index}`);
        } else {
          const docFile = { uri: doc.uri, type: doc.type || 'application/octet-stream', name: doc.name || `file_${index}` };
          formData.append('documents', docFile);
        }
      });

      try {
        const response = await axios.post('/analysis', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 15000 });
        const analysisId = response.data?.analysis?.id;
        if (analysisId) {
          setCurrentAnalysisId(analysisId);
          setAiAnalysisVisible(true);
          clearForm();
        } else {
          throw new Error('ID da análise não encontrado');
        }
      } catch (apiError) {
        console.log('API call failed, using mock:', apiError?.message);
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

  const handleAIAnalysisComplete = (data) => {
    setAiAnalysisVisible(false);
    setCurrentAnalysisId(null);
    navigation.navigate('AnalysisResult', {
      analysisId: data.analysisId,
      analysis: { id: data.analysisId, title: data.title || 'Análise Médica Completa', confidence: data.confidence, status: 'completed' }
    });
  };

  const handleAIAnalysisError = (error) => {
    setAiAnalysisVisible(false);
    setCurrentAnalysisId(null);
    Alert.alert('❌ Erro na Análise', error?.message || 'Ocorreu um erro durante o processamento da IA.', [{ text: 'OK' }]);
  };

  const progress = getFormProgress();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* HEADER PREMIUM */}
      <View style={styles.headerContainer}>
        <View style={styles.headerGradient} />
        <Animated.View style={[styles.headerContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Icon name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerTitle}>
              <Text style={styles.headerTitleText}>Nova Análise</Text>
              <Text style={styles.headerSubtitle}>Análise com Inteligência Artificial</Text>
            </View>
            <TouchableOpacity style={styles.helpButton}>
              <Icon name="help" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Progress */}
          <View style={styles.progressCard}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressTitle}>Progresso do Formulário</Text>
              <Text style={styles.progressPercentage}>{progress}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
              </View>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* CONTEÚDO */}
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Paciente */}
        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {selectedPatient?.name ? (
            <View style={styles.selectedPatientCard}>
              <View style={styles.patientHeader}>
                <View style={styles.patientAvatar}><Text style={styles.patientInitial}>{selectedPatient.name.charAt(0).toUpperCase()}</Text></View>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{selectedPatient.name}</Text>
                  <Text style={styles.patientEmail}>{selectedPatient.email || 'Email não informado'}</Text>
                </View>
                <TouchableOpacity style={styles.removePatientButton} onPress={() => setSelectedPatient(null)}>
                  <Icon name="close" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
              <View style={styles.patientBadge}>
                <Icon name="person" size={16} color="#10B981" />
                <Text style={styles.patientBadgeText}>Paciente Vinculado</Text>
              </View>
            </View>
          ) : (
            <View style={styles.noPatientCard}>
              <View style={styles.noPatientHeader}>
                <Icon name="person-outline" size={32} color="#6B7280" />
                <View style={styles.noPatientInfo}>
                  <Text style={styles.noPatientTitle}>Análise Geral</Text>
                  <Text style={styles.noPatientSubtitle}>Sem paciente específico vinculado</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.selectPatientButton}>
                <Icon name="person-add" size={16} color="#667EEA" />
                <Text style={styles.selectPatientText}>Vincular Paciente</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* Imagens */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('images')}>
            <View style={styles.sectionHeaderLeft}>
              <Icon name="photo-library" size={24} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Imagens Médicas</Text>
              <View style={styles.counterBadge}><Text style={styles.counterText}>{images.length}/5</Text></View>
            </View>
            <Icon name={expandedSection === 'images' ? 'expand-less' : 'expand-more'} size={24} color="#9CA3AF" />
          </TouchableOpacity>
          {expandedSection === 'images' && (
            <View style={styles.sectionContent}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer} contentContainerStyle={styles.imagesContent}>
                {images.map((image, index) => (
                  <View key={index} style={styles.imageCard}>
                    <Image source={{ uri: image.uri }} style={styles.medicalImage} />
                    <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}>
                      <Icon name="close" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.imageNumber}><Text style={styles.imageNumberText}>{index + 1}</Text></View>
                  </View>
                ))}
                {images.length < 5 && (
                  <TouchableOpacity style={styles.addImageCard} onPress={pickImages}>
                    <Icon name="add-photo-alternate" size={32} color="#9CA3AF" />
                    <Text style={styles.addImageText}>Adicionar{"\n"}Imagem</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
              <View style={styles.imageActions}>
                <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
                  <Icon name="camera-alt" size={20} color="#FFFFFF" />
                  <Text style={styles.cameraButtonText}>{Platform.OS === 'web' ? 'Câmera Web' : 'Capturar'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.galleryButton} onPress={pickImages}>
                  <Icon name="photo-library" size={20} color="#667EEA" />
                  <Text style={styles.galleryButtonText}>Galeria</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.imageInfo}>
                <Icon name="info" size={16} color="#6B7280" />
                <Text style={styles.imageInfoText}>Adicione até 5 imagens médicas (fotografias, radiografias, exames, etc.)</Text>
              </View>
            </View>
          )}
        </View>

        {/* Documentos */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('docs')}>
            <View style={styles.sectionHeaderLeft}>
              <Icon name="attach-file" size={24} color="#0EA5E9" style={{ transform: [{ rotate: '45deg' }] }} />
              <Text style={styles.sectionTitle}>Arquivos / Documentos</Text>
              <View style={[styles.counterBadge, { backgroundColor: '#ECFEFF', borderColor: '#CFFAFE' }]}><Text style={[styles.counterText, { color: '#0369A1' }]}>{documents.length}/10</Text></View>
            </View>
            <Icon name={expandedSection === 'docs' ? 'expand-less' : 'expand-more'} size={24} color="#9CA3AF" />
          </TouchableOpacity>
          {expandedSection === 'docs' && (
            <View style={styles.sectionContent}>
              <View style={styles.docActions}>
                <TouchableOpacity style={styles.docAddBtn} onPress={pickDocuments}>
                  <Icon name="upload-file" size={20} color="#1F2937" />
                  <Text style={styles.docAddText}>Anexar Arquivos</Text>
                </TouchableOpacity>
              </View>
              {documents.length > 0 ? (
                <View style={styles.docList}>
                  {documents.map((doc, idx) => (
                    <View key={`${doc.name}-${idx}`} style={styles.docItem}>
                      <View style={styles.docIconWrap}><Icon name="description" size={18} color="#111827" /></View>
                      <View style={styles.docInfo}>
                        <Text style={styles.docName} numberOfLines={1}>{doc.name || `arquivo_${idx}`}</Text>
                        <Text style={styles.docMeta}>{(doc.type || '').split('/')[1] || 'arquivo'} • {formatBytes(doc.size)}</Text>
                      </View>
                      <TouchableOpacity style={styles.docRemove} onPress={() => removeDocument(idx)}>
                        <Icon name="close" size={18} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.docEmpty}> 
                  <Icon name="inventory-2" size={36} color="#94A3B8" />
                  <Text style={styles.docEmptyText}>Nenhum arquivo anexado ainda</Text>
                </View>
              )}
              <View style={styles.imageInfo}>
                <Icon name="info" size={16} color="#6B7280" />
                <Text style={styles.imageInfoText}>Formatos aceitos: PDF, DOC(X), TXT, RTF, CSV, XLS(X) e imagens. Até 10 arquivos.</Text>
              </View>
            </View>
          )}
        </View>

        {/* História Clínica */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('history')}>
            <View style={styles.sectionHeaderLeft}>
              <Icon name="history" size={24} color="#10B981" />
              <Text style={styles.sectionTitle}>História Clínica</Text>
              {historyText.length > 0 && (<View style={styles.completedBadge}><Icon name="check" size={12} color="#10B981" /></View>)}
            </View>
            <Icon name={expandedSection === 'history' ? 'expand-less' : 'expand-more'} size={24} color="#9CA3AF" />
          </TouchableOpacity>
          {expandedSection === 'history' && (
            <View style={styles.sectionContent}>
              <View style={styles.inputContainer}>
                <View style={styles.inputHeader}>
                  <Text style={styles.inputLabel}>História da Doença Atual</Text>
                  <Text style={styles.inputCounter}>{historyText.length}/1000</Text>
                </View>
                <TextInput style={styles.textArea} multiline numberOfLines={6} value={historyText} onChangeText={setHistoryText} placeholder="Descreva a história da doença atual, início dos sintomas, evolução, fatores desencadeantes..." placeholderTextColor="#9CA3AF" maxLength={1000} />
              </View>
              <View style={styles.inputContainer}>
                <View style={styles.inputHeader}>
                  <Text style={styles.inputLabel}>História Médica Pregressa</Text>
                  <Text style={styles.inputCounter}>{previousHistoryText.length}/1000</Text>
                </View>
                <TextInput style={styles.textArea} multiline numberOfLines={6} value={previousHistoryText} onChangeText={setPreviousHistoryText} placeholder="Histórico médico anterior, cirurgias, medicações em uso, alergias, antecedentes familiares..." placeholderTextColor="#9CA3AF" maxLength={1000} />
              </View>
            </View>
          )}
        </View>

        {/* Exame Físico */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('exam')}>
            <View style={styles.sectionHeaderLeft}>
              <Icon name="medical-services" size={24} color="#F59E0B" />
              <Text style={styles.sectionTitle}>Exame Físico</Text>
              {physicalExamText.length > 0 && (<View style={styles.completedBadge}><Icon name="check" size={12} color="#10B981" /></View>)}
            </View>
            <Icon name={expandedSection === 'exam' ? 'expand-less' : 'expand-more'} size={24} color="#9CA3AF" />
          </TouchableOpacity>
          {expandedSection === 'exam' && (
            <View style={styles.sectionContent}>
              <View style={styles.inputContainer}>
                <View style={styles.inputHeader}>
                  <Text style={styles.inputLabel}>Achados do Exame Físico</Text>
                  <Text style={styles.inputCounter}>{physicalExamText.length}/1000</Text>
                </View>
                <TextInput style={styles.textArea} multiline numberOfLines={6} value={physicalExamText} onChangeText={setPhysicalExamText} placeholder="Descreva os achados do exame físico, sinais clínicos, alterações observadas..." placeholderTextColor="#9CA3AF" maxLength={1000} />
              </View>
              <View style={styles.examInfo}>
                <Icon name="tips-and-updates" size={16} color="#F59E0B" />
                <Text style={styles.examInfoText}>Seja específico sobre localização, características, intensidade e outros detalhes relevantes</Text>
              </View>
            </View>
          )}
        </View>

        {/* IA */}
        <View style={styles.aiInfoCard}>
          <View style={styles.aiInfoHeader}>
            <Icon name="psychology" size={28} color="#667EEA" />
            <Text style={styles.aiInfoTitle}>Análise com IA Médica</Text>
          </View>
          <Text style={styles.aiInfoText}>Nossa Inteligência Artificial analisará todos os dados fornecidos e gerará:</Text>
          <View style={styles.aiFeaturesList}>
            <View style={styles.aiFeature}><Icon name="check-circle" size={16} color="#10B981" /><Text style={styles.aiFeatureText}>Diagnóstico diferencial detalhado</Text></View>
            <View style={styles.aiFeature}><Icon name="check-circle" size={16} color="#10B981" /><Text style={styles.aiFeatureText}>Análise de etiologia e fisiopatologia</Text></View>
            <View style={styles.aiFeature}><Icon name="check-circle" size={16} color="#10B981" /><Text style={styles.aiFeatureText}>Recomendações de tratamento</Text></View>
            <View style={styles.aiFeature}><Icon name="check-circle" size={16} color="#10B981" /><Text style={styles.aiFeatureText}>Análise de risco e prognóstico</Text></View>
          </View>
        </View>

        {/* SUBMIT */}
        <View style={styles.submitSection}>
          <TouchableOpacity style={[styles.submitButton, loading && styles.submitButtonDisabled]} onPress={submitAnalysis} disabled={loading}>
            <View style={styles.submitButtonGradient} />
            <View style={styles.submitButtonContent}>
              {loading ? (<Icon name="hourglass-bottom" size={24} color="#FFFFFF" />) : (<Icon name="psychology" size={24} color="#FFFFFF" />)}
              <Text style={styles.submitButtonText}>{loading ? 'Enviando para IA...' : 'Iniciar Análise com IA'}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.submitInfo}>
            <Icon name="timer" size={16} color="#6B7280" />
            <Text style={styles.submitInfoText}>Análise completa em aproximadamente 2-3 minutos</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal de Progresso da IA */}
      <AIAnalysisProgress visible={aiAnalysisVisible} analysisId={currentAnalysisId} doctorId={selectedPatient?.doctorId || 'general'} onComplete={handleAIAnalysisComplete} onError={handleAIAnalysisError} />
    </View>
  );
};

export default NewAnalysisScreen;

// util local
const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return '-';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  // Header Premium
  headerContainer: { height: 180, position: 'relative', overflow: 'hidden' },
  headerGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0F172A', background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)' },
  headerContent: { flex: 1, paddingTop: (StatusBar.currentHeight || 40) + 10, paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  helpButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  headerTitle: { flex: 1, alignItems: 'center' },
  headerTitleText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: 0.2 },
  headerSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },

  // Progress
  progressCard: { marginTop: 16, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  progressTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', opacity: 0.95 },
  progressPercentage: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  progressBarContainer: { width: '100%' },
  progressBarBackground: { width: '100%', height: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#22C55E', borderRadius: 999 },

  // Content
  content: { flex: 1, marginTop: -10 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  // Section
  section: { marginBottom: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, ...(Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10 } : { elevation: 2 }) },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  counterBadge: { marginLeft: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#E0E7FF' },
  counterText: { fontSize: 11, fontWeight: '800', color: '#3730A3' },
  sectionContent: { marginTop: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 12 },

  // Selected Patient
  selectedPatientCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, ...(Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10 } : { elevation: 2 }) },
  patientHeader: { flexDirection: 'row', alignItems: 'center' },
  patientAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E0E7FF', marginRight: 12 },
  patientInitial: { color: '#3730A3', fontWeight: '800', fontSize: 16 },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  patientEmail: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  removePatientButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FEE2E2' },
  patientBadge: { marginTop: 12, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#D1FAE5' },
  patientBadgeText: { color: '#065F46', fontWeight: '800', fontSize: 12 },

  // No patient
  noPatientCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 14 },
  noPatientHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  noPatientInfo: { flex: 1 },
  noPatientTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  noPatientSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  selectPatientButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#F8FAFF', borderWidth: 1, borderColor: '#E0E7FF' },
  selectPatientText: { color: '#667EEA', fontWeight: '800', fontSize: 12 },

  // Imagens
  imagesContainer: { maxHeight: 160 },
  imagesContent: { paddingRight: 6 },
  imageCard: { width: 120, height: 120, borderRadius: 14, overflow: 'hidden', marginRight: 10, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', position: 'relative' },
  medicalImage: { width: '100%', height: '100%' },
  removeImageButton: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  imageNumber: { position: 'absolute', bottom: 6, left: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.55)' },
  imageNumberText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  addImageCard: { width: 120, height: 120, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  addImageText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 6, lineHeight: 16 },
  imageActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cameraButton: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#1F2937', ...(Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6 } : { elevation: 2 }) },
  cameraButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  galleryButton: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  galleryButtonText: { color: '#374151', fontWeight: '800', fontSize: 13 },
  imageInfo: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 10 },
  imageInfoText: { fontSize: 12, color: '#6B7280', flex: 1 },

  // Documentos
  docActions: { flexDirection: 'row', gap: 10 },
  docAddBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  docAddText: { color: '#111827', fontWeight: '800', fontSize: 13 },
  docList: { marginTop: 10 },
  docItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', marginBottom: 8 },
  docIconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5E7EB', marginRight: 10 },
  docInfo: { flex: 1 },
  docName: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  docMeta: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  docRemove: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  docEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', marginTop: 8 },
  docEmptyText: { marginTop: 6, fontSize: 12, color: '#6B7280' },

  // Inputs
  inputContainer: { marginBottom: 12 },
  inputHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  inputLabel: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  inputCounter: { fontSize: 12, color: '#64748B' },
  textArea: { minHeight: 120, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 10, textAlignVertical: 'top', color: '#0F172A', fontSize: 14 },

  // Exam Info
  examInfo: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 },
  examInfoText: { fontSize: 12, color: '#6B7280', flex: 1 },

  // IA Info
  aiInfoCard: { marginTop: 8, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 14 },
  aiInfoHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  aiInfoTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  aiInfoText: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  aiFeaturesList: { gap: 8 },
  aiFeature: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiFeatureText: { fontSize: 13, color: '#0F172A' },

  // Submit
  submitSection: { marginTop: 12 },
  submitButton: { height: 54, borderRadius: 16, overflow: 'hidden', position: 'relative', ...(Platform.OS === 'ios' ? { shadowColor: '#667EEA', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16 } : { elevation: 3 }) },
  submitButtonDisabled: { opacity: 0.85 },
  submitButtonGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#667EEA', background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)' },
  submitButtonContent: { flex: 1, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  submitButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  submitInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', marginTop: 10 },
  submitInfoText: { fontSize: 12, color: '#6B7280' },
});
