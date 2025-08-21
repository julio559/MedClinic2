const express = require('express');
const multer = require('multer');
const path = require('path');
const { Analysis, AnalysisResult, MedicalImage, Patient, Subscription } = require('../models');
const { authenticate } = require('../middleware/auth');
const { processWithAI } = require('../services/aiService');
const router = express.Router();

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/medical-images');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'images') {
      // Verificar se é imagem
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Apenas imagens são permitidas'), false);
      }
    } else if (file.fieldname === 'documents') {
      // Verificar se é documento permitido
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Apenas PDF e imagens são permitidos para documentos'), false);
      }
    } else {
      cb(new Error('Campo de arquivo não reconhecido'), false);
    }
  }
});

// GET /api/analysis - Listar todas as análises do médico
router.get('/', authenticate, async (req, res) => {
  try {
    const analyses = await Analysis.findAll({
      where: { doctorId: req.user.userId },
      include: [
        {
          model: Patient,
          attributes: ['id', 'name', 'email'],
          required: false // LEFT JOIN para incluir análises sem paciente
        },
        {
          model: AnalysisResult,
          attributes: ['id', 'category', 'result', 'confidenceScore', 'isCompleted'],
          required: false
        },
        {
          model: MedicalImage,
          attributes: ['id', 'filename', 'originalName', 'imageType'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Formattar resposta para o frontend
    const formattedAnalyses = analyses.map(analysis => ({
      id: analysis.id,
      title: analysis.title,
      description: analysis.description,
      symptoms: analysis.symptoms,
      status: analysis.status,
      aiConfidenceScore: analysis.aiConfidenceScore,
      createdAt: analysis.createdAt,
      updatedAt: analysis.updatedAt,
      patient: analysis.Patient ? {
        id: analysis.Patient.id,
        name: analysis.Patient.name,
        email: analysis.Patient.email
      } : null,
      resultsCount: analysis.AnalysisResults ? analysis.AnalysisResults.length : 0,
      imagesCount: analysis.MedicalImages ? analysis.MedicalImages.length : 0,
      // Para compatibilidade com o frontend, extrair diagnóstico principal
      diagnosis: analysis.AnalysisResults && analysis.AnalysisResults.length > 0 
        ? analysis.AnalysisResults.find(r => r.category.includes('Diagnóstico') || r.category.includes('Diagnostico'))?.result || analysis.title
        : analysis.title
    }));

    res.json(formattedAnalyses);
  } catch (error) {
    console.error('Error fetching analyses:', error);
    res.status(500).json({ error: 'Erro ao buscar análises' });
  }
});

// POST /api/analysis - Criar nova análise
router.post('/', authenticate, upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'documents', maxCount: 3 }
]), async (req, res) => {
  try {
    const { title, description, symptoms, patientId } = req.body;
    const doctorId = req.user.userId;

    console.log('📝 Nova análise recebida:', {
      title,
      description: description?.length || 0,
      symptoms: symptoms?.length || 0,
      patientId: patientId || 'sem paciente',
      doctorId,
      images: req.files?.images?.length || 0,
      documents: req.files?.documents?.length || 0
    });

    // Verificar limite de análises do plano
    const subscription = await Subscription.findOne({
      where: { userId: doctorId }
    });

    if (subscription) {
      if (subscription.analysisUsed >= subscription.analysisLimit) {
        return res.status(400).json({ 
          error: 'Limite de análises atingido para seu plano atual',
          currentUsage: subscription.analysisUsed,
          limit: subscription.analysisLimit
        });
      }
    }

    // Validação básica
    if (!title && !description && !symptoms && (!req.files || (!req.files.images && !req.files.documents))) {
      return res.status(400).json({ 
        error: 'Forneça pelo menos um título, descrição, sintomas ou arquivo para análise' 
      });
    }

    // Verificar se o paciente existe (apenas se fornecido)
    if (patientId && patientId !== '' && patientId !== 'null') {
      const patient = await Patient.findOne({
        where: { id: patientId, doctorId }
      });
      
      if (!patient) {
        return res.status(404).json({ error: 'Paciente não encontrado' });
      }
    }

    // Normalizar patientId (converter strings vazias e 'null' para null)
    const normalizedPatientId = (patientId && patientId !== '' && patientId !== 'null') ? patientId : null;

    // Criar análise
    const analysis = await Analysis.create({
      title: title || 'Análise Médica',
      description: description || null,
      symptoms: symptoms || null,
      status: 'pending',
      patientId: normalizedPatientId,
      doctorId: doctorId
    });

    console.log('✅ Análise criada:', analysis.id, 'para paciente:', normalizedPatientId || 'sem paciente');

    // Salvar imagens médicas
    if (req.files && req.files.images) {
      for (const imageFile of req.files.images) {
        await MedicalImage.create({
          filename: imageFile.filename,
          originalName: imageFile.originalname,
          filePath: imageFile.path,
          fileSize: imageFile.size,
          mimeType: imageFile.mimetype,
          imageType: getImageType(imageFile.mimetype),
          analysisId: analysis.id
        });
        console.log('📸 Imagem salva:', imageFile.originalname);
      }
    }

    // Salvar documentos como imagens médicas também
    if (req.files && req.files.documents) {
      for (const docFile of req.files.documents) {
        await MedicalImage.create({
          filename: docFile.filename,
          originalName: docFile.originalname,
          filePath: docFile.path,
          fileSize: docFile.size,
          mimeType: docFile.mimetype,
          imageType: 'other',
          analysisId: analysis.id
        });
        console.log('📄 Documento salvo:', docFile.originalname);
      }
    }

    // Atualizar contador de análises usadas
    if (subscription) {
      await subscription.increment('analysisUsed');
      console.log(`📊 Análises usadas: ${subscription.analysisUsed + 1}/${subscription.analysisLimit}`);
    }

    // Iniciar processamento com IA em background
    console.log('🤖 Iniciando processamento com IA...');
    processWithAI(analysis.id).catch(error => {
      console.error('❌ Erro no processamento de IA:', error);
    });

    // Resposta imediata para o frontend
    res.status(201).json({
      message: 'Análise criada com sucesso',
      analysis: {
        id: analysis.id,
        title: analysis.title,
        description: analysis.description,
        symptoms: analysis.symptoms,
        status: analysis.status,
        createdAt: analysis.createdAt,
        patientId: analysis.patientId,
        doctorId: analysis.doctorId
      }
    });

  } catch (error) {
    console.error('❌ Erro ao criar análise:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/analysis/:id - Buscar análise específica
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const analysis = await Analysis.findOne({
      where: { 
        id,
        doctorId: req.user.userId
      },
      include: [
        {
          model: Patient,
          attributes: ['id', 'name', 'email', 'birthDate', 'gender', 'medicalHistory', 'allergies'],
          required: false // LEFT JOIN para incluir análises sem paciente
        },
        {
          model: AnalysisResult,
          order: [['createdAt', 'ASC']],
          required: false
        },
        {
          model: MedicalImage,
          attributes: ['id', 'filename', 'originalName', 'imageType', 'mimeType', 'createdAt'],
          required: false
        }
      ]
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Análise não encontrada' });
    }

    res.json(analysis);
  } catch (error) {
    console.error('Error fetching analysis:', error);
    res.status(500).json({ error: 'Erro ao buscar análise' });
  }
});

// GET /api/analysis/:id/results - Buscar resultados de uma análise específica
router.get('/:id/results', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const analysis = await Analysis.findOne({
      where: { 
        id,
        doctorId: req.user.userId
      },
      include: [
        {
          model: Patient,
          attributes: ['id', 'name', 'email', 'birthDate', 'gender', 'medicalHistory', 'allergies'],
          required: false // LEFT JOIN para incluir análises sem paciente
        },
        {
          model: AnalysisResult,
          order: [['createdAt', 'ASC']],
          required: false
        },
        {
          model: MedicalImage,
          attributes: ['id', 'filename', 'originalName', 'imageType', 'mimeType', 'createdAt'],
          required: false
        }
      ]
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Análise não encontrada' });
    }

    res.json(analysis);
  } catch (error) {
    console.error('Error fetching analysis results:', error);
    res.status(500).json({ error: 'Erro ao buscar resultados da análise' });
  }
});

// PUT /api/analysis/:id/status - Atualizar status da análise
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'processing', 'completed', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const analysis = await Analysis.findOne({
      where: { 
        id,
        doctorId: req.user.userId
      }
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Análise não encontrada' });
    }

    await analysis.update({ status });

    res.json({
      message: 'Status atualizado com sucesso',
      analysis: {
        id: analysis.id,
        status: analysis.status,
        updatedAt: analysis.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating analysis status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status da análise' });
  }
});

// DELETE /api/analysis/:id - Deletar análise
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const analysis = await Analysis.findOne({
      where: { 
        id,
        doctorId: req.user.userId
      }
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Análise não encontrada' });
    }

    // Deletar análise (cascade delete cuidará dos resultados e imagens)
    await analysis.destroy();

    res.json({ message: 'Análise deletada com sucesso' });
  } catch (error) {
    console.error('Error deleting analysis:', error);
    res.status(500).json({ error: 'Erro ao deletar análise' });
  }
});

// POST /api/analysis/:id/reprocess - Reprocessar análise com IA
router.post('/:id/reprocess', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const analysis = await Analysis.findOne({
      where: { 
        id,
        doctorId: req.user.userId
      }
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Análise não encontrada' });
    }

    // Resetar status e remover resultados anteriores
    await AnalysisResult.destroy({
      where: { analysisId: id }
    });

    await analysis.update({ 
      status: 'pending',
      aiConfidenceScore: null
    });

    // Reprocessar com IA
    console.log('🔄 Reprocessando análise com IA:', id);
    processWithAI(analysis.id).catch(error => {
      console.error('❌ Erro no reprocessamento:', error);
    });

    res.json({
      message: 'Análise enviada para reprocessamento',
      analysis: {
        id: analysis.id,
        status: analysis.status
      }
    });
  } catch (error) {
    console.error('Error reprocessing analysis:', error);
    res.status(500).json({ error: 'Erro ao reprocessar análise' });
  }
});

// Função auxiliar para determinar tipo de imagem
function getImageType(mimeType) {const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { Analysis, AnalysisResult, MedicalImage, Patient, Subscription } = require('../models');
const { authenticate } = require('../middleware/auth');
const { processWithAI } = require('../services/aiService');

const router = express.Router();

// Garante que a pasta de upload exista
const uploadPath = path.join(__dirname, '../uploads/medical-images');
fs.mkdirSync(uploadPath, { recursive: true });

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'images') {
      if (file.mimetype.startsWith('image/')) return cb(null, true);
      return cb(new Error('Apenas imagens são permitidas'), false);
    }
    if (file.fieldname === 'documents') {
      const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
      if (allowed.includes(file.mimetype)) return cb(null, true);
      return cb(new Error('Apenas PDF e imagens são permitidos para documentos'), false);
    }
    return cb(new Error('Campo de arquivo não reconhecido'), false);
  }
});

// Util: normalizar patientId vindo do body/form-data
const normalizeId = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim().toLowerCase();
  if (s === '' || s === 'null' || s === 'undefined') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

// GET /api/analysis - Listar todas as análises do médico
router.get('/', authenticate, async (req, res) => {
  try {
    const analyses = await Analysis.findAll({
      where: { doctorId: req.user.userId },
      include: [
        {
          model: Patient,
          attributes: ['id', 'name', 'email'],
          required: false // LEFT JOIN para permitir analyses sem paciente
        },
        {
          model: AnalysisResult,
          attributes: ['id', 'category', 'result', 'confidenceScore', 'isCompleted'],
          required: false
        },
        {
          model: MedicalImage,
          attributes: ['id', 'filename', 'originalName', 'imageType'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const formatted = analyses.map(analysis => ({
      id: analysis.id,
      title: analysis.title,
      description: analysis.description,
      symptoms: analysis.symptoms,
      status: analysis.status,
      aiConfidenceScore: analysis.aiConfidenceScore,
      createdAt: analysis.createdAt,
      updatedAt: analysis.updatedAt,
      patient: analysis.Patient ? {
        id: analysis.Patient.id,
        name: analysis.Patient.name,
        email: analysis.Patient.email
      } : null,
      resultsCount: analysis.AnalysisResults ? analysis.AnalysisResults.length : 0,
      imagesCount: analysis.MedicalImages ? analysis.MedicalImages.length : 0,
      diagnosis:
        (analysis.AnalysisResults && analysis.AnalysisResults.length > 0)
          ? (analysis.AnalysisResults.find(r =>
              (r.category || '').includes('Diagnóstico') || (r.category || '').includes('Diagnostico')
            )?.result || analysis.title)
          : analysis.title
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching analyses:', error);
    res.status(500).json({ error: 'Erro ao buscar análises' });
  }
});

// POST /api/analysis - Criar nova análise (patientId opcional)
router.post(
  '/',
  authenticate,
  upload.fields([{ name: 'images', maxCount: 5 }, { name: 'documents', maxCount: 3 }]),
  async (req, res) => {
    try {
      const { title, description, symptoms, patientId } = req.body;
      const doctorId = req.user.userId;
      const parsedPatientId = normalizeId(patientId);

      console.log('📝 Nova análise recebida:', {
        title,
        description: description?.length || 0,
        symptoms: symptoms?.length || 0,
        patientId: parsedPatientId ?? 'sem paciente',
        doctorId,
        images: req.files?.images?.length || 0,
        documents: req.files?.documents?.length || 0
      });

      // Verifica limite do plano
      const subscription = await Subscription.findOne({ where: { userId: doctorId } });
      if (subscription && subscription.analysisUsed >= subscription.analysisLimit) {
        return res.status(400).json({
          error: 'Limite de análises atingido para seu plano atual',
          currentUsage: subscription.analysisUsed,
          limit: subscription.analysisLimit
        });
      }

      // Validação básica (patientId é opcional)
      const hasAnyContent =
        Boolean(title) || Boolean(description) || Boolean(symptoms) ||
        Boolean(req.files?.images?.length) || Boolean(req.files?.documents?.length);
      if (!hasAnyContent) {
        return res.status(400).json({
          error: 'Forneça pelo menos um título, descrição, sintomas ou arquivo para análise'
        });
      }

      // Só valida paciente se houver ID
      if (parsedPatientId !== null) {
        const patient = await Patient.findOne({ where: { id: parsedPatientId, doctorId } });
        if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });
      }

      // Cria análise (patientId pode ser null)
      const analysis = await Analysis.create({
        title: title || 'Análise Médica',
        description: description || null,
        symptoms: symptoms || null,
        status: 'pending',
        patientId: parsedPatientId,
        doctorId
      });

      console.log('✅ Análise criada:', analysis.id, 'paciente:', analysis.patientId ?? 'null');

      // Salva imagens
      if (req.files?.images) {
        for (const imageFile of req.files.images) {
          await MedicalImage.create({
            filename: imageFile.filename,
            originalName: imageFile.originalname,
            filePath: imageFile.path,
            fileSize: imageFile.size,
            mimeType: imageFile.mimetype,
            imageType: getImageType(imageFile.mimetype),
            analysisId: analysis.id
          });
          console.log('📸 Imagem salva:', imageFile.originalname);
        }
      }

      // Salva documentos
      if (req.files?.documents) {
        for (const docFile of req.files.documents) {
          await MedicalImage.create({
            filename: docFile.filename,
            originalName: docFile.originalname,
            filePath: docFile.path,
            fileSize: docFile.size,
            mimeType: docFile.mimetype,
            imageType: 'other',
            analysisId: analysis.id
          });
          console.log('📄 Documento salvo:', docFile.originalname);
        }
      }

      // Atualiza contador do plano
      if (subscription) {
        await subscription.increment('analysisUsed');
        console.log(`📊 Análises usadas: ${subscription.analysisUsed + 1}/${subscription.analysisLimit}`);
      }

      // Dispara processamento de IA (assíncrono)
      console.log('🤖 Iniciando processamento com IA...');
      processWithAI(analysis.id).catch(err => console.error('❌ Erro no processamento de IA:', err));

      // Resposta
      res.status(201).json({
        message: 'Análise criada com sucesso',
        analysis: {
          id: analysis.id,
          title: analysis.title,
          description: analysis.description,
          symptoms: analysis.symptoms,
          status: analysis.status,
          createdAt: analysis.createdAt,
          patientId: analysis.patientId, // pode ser null
          doctorId: analysis.doctorId
        }
      });
    } catch (error) {
      console.error('❌ Erro ao criar análise:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/analysis/:id - Buscar análise específica
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const analysis = await Analysis.findOne({
      where: { id, doctorId: req.user.userId },
      include: [
        {
          model: Patient,
          attributes: ['id', 'name', 'email', 'birthDate', 'gender', 'medicalHistory', 'allergies'],
          required: false
        },
        { model: AnalysisResult, required: false },
        {
          model: MedicalImage,
          attributes: ['id', 'filename', 'originalName', 'imageType', 'mimeType', 'createdAt'],
          required: false
        }
      ],
      order: [[AnalysisResult, 'createdAt', 'ASC']]
    });

    if (!analysis) return res.status(404).json({ error: 'Análise não encontrada' });
    res.json(analysis);
  } catch (error) {
    console.error('Error fetching analysis:', error);
    res.status(500).json({ error: 'Erro ao buscar análise' });
  }
});

// GET /api/analysis/:id/results - Buscar resultados de uma análise específica
router.get('/:id/results', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const analysis = await Analysis.findOne({
      where: { id, doctorId: req.user.userId },
      include: [
        {
          model: Patient,
          attributes: ['id', 'name', 'email', 'birthDate', 'gender', 'medicalHistory', 'allergies'],
          required: false
        },
        { model: AnalysisResult, required: false },
        {
          model: MedicalImage,
          attributes: ['id', 'filename', 'originalName', 'imageType', 'mimeType', 'createdAt'],
          required: false
        }
      ],
      order: [[AnalysisResult, 'createdAt', 'ASC']]
    });

    if (!analysis) return res.status(404).json({ error: 'Análise não encontrada' });
    res.json(analysis);
  } catch (error) {
    console.error('Error fetching analysis results:', error);
    res.status(500).json({ error: 'Erro ao buscar resultados da análise' });
  }
});

// PUT /api/analysis/:id/status - Atualizar status da análise
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const valid = ['pending', 'processing', 'completed', 'failed'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Status inválido' });

    const analysis = await Analysis.findOne({ where: { id, doctorId: req.user.userId } });
    if (!analysis) return res.status(404).json({ error: 'Análise não encontrada' });

    await analysis.update({ status });

    res.json({
      message: 'Status atualizado com sucesso',
      analysis: { id: analysis.id, status: analysis.status, updatedAt: analysis.updatedAt }
    });
  } catch (error) {
    console.error('Error updating analysis status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status da análise' });
  }
});

// DELETE /api/analysis/:id - Deletar análise
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const analysis = await Analysis.findOne({ where: { id, doctorId: req.user.userId } });
    if (!analysis) return res.status(404).json({ error: 'Análise não encontrada' });

    await analysis.destroy(); // cascade cuida de results/imagens
    res.json({ message: 'Análise deletada com sucesso' });
  } catch (error) {
    console.error('Error deleting analysis:', error);
    res.status(500).json({ error: 'Erro ao deletar análise' });
  }
});

// Reprocessar com IA
router.post('/:id/reprocess', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const analysis = await Analysis.findOne({ where: { id, doctorId: req.user.userId } });
    if (!analysis) return res.status(404).json({ error: 'Análise não encontrada' });

    await AnalysisResult.destroy({ where: { analysisId: id } });
    await analysis.update({ status: 'pending', aiConfidenceScore: null });

    console.log('🔄 Reprocessando análise com IA:', id);
    processWithAI(analysis.id).catch(err => console.error('❌ Erro no reprocessamento:', err));

    res.json({ message: 'Análise enviada para reprocessamento', analysis: { id: analysis.id, status: analysis.status } });
  } catch (error) {
    console.error('Error reprocessing analysis:', error);
    res.status(500).json({ error: 'Erro ao reprocessar análise' });
  }
});

// GET /api/analysis/:id/status - Status leve p/ polling
router.get('/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const analysis = await Analysis.findOne({
      where: { id, doctorId: req.user.userId },
      include: [{ model: AnalysisResult, attributes: ['id'], required: false }]
    });
    if (!analysis) return res.status(404).json({ error: 'Análise não encontrada' });

    res.json({
      id: analysis.id,
      status: analysis.status,                    // 'pending' | 'processing' | 'completed' | 'failed'
      aiConfidenceScore: analysis.aiConfidenceScore,
      resultsCount: analysis.AnalysisResults?.length || 0
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao buscar status' });
  }
});


// Aux: tipo de imagem
function getImageType(mimeType) {
  const typeMap = {
    'image/jpeg': 'photo',
    'image/jpg': 'photo',
    'image/png': 'photo',
    'image/gif': 'photo',
    'image/bmp': 'photo',
    'image/webp': 'photo',
    'application/pdf': 'other'
  };
  return typeMap[mimeType] || 'other';
}

module.exports = router;

  const typeMap = {
    'image/jpeg': 'photo',
    'image/jpg': 'photo',
    'image/png': 'photo',
    'image/gif': 'photo',
    'image/bmp': 'photo',
    'image/webp': 'photo',
    'application/pdf': 'other'
  };
  
  return typeMap[mimeType] || 'other';
}

module.exports = router;