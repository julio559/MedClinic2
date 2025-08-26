const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { Analysis, AnalysisResult, MedicalImage, Patient, Subscription } = require('../models');
const { processWithAI } = require('../services/aiService');

let { authenticate } = require('../middleware/auth') || {};
const ensure = (fn) => (typeof fn === 'function' ? fn : (_req, _res, next) => next());
authenticate = ensure(authenticate);

const router = express.Router();

/** garante pasta de upload */
const uploadPath = path.join(__dirname, '../uploads/medical-images');
fs.mkdirSync(uploadPath, { recursive: true });

/** multer */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadPath),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'images') {
      return file.mimetype.startsWith('image/')
        ? cb(null, true)
        : cb(new Error('Apenas imagens são permitidas'), false);
    }
    if (file.fieldname === 'documents') {
      const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
      return allowed.includes(file.mimetype)
        ? cb(null, true)
        : cb(new Error('Apenas PDF e imagens são permitidos para documentos'), false);
    }
    return cb(new Error('Campo de arquivo não reconhecido'), false);
  }
});

/** utils */
const normalizeId = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim().toLowerCase();
  if (s === '' || s === 'null' || s === 'undefined') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
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

/** GET /api/analysis */
router.get('/', authenticate, async (req, res) => {
  try {
    const doctorId = req.userId;
    const analyses = await Analysis.findAll({
      where: { doctorId },
      include: [
        { model: Patient, as: 'Patient', attributes: ['id', 'name', 'email'], required: false },
        { model: AnalysisResult, as: 'AnalysisResults', attributes: ['id', 'category', 'result', 'confidenceScore', 'isCompleted'], required: false },
        { model: MedicalImage, as: 'MedicalImages', attributes: ['id', 'filename', 'originalName', 'imageType'], required: false }
      ],
      order: [['createdAt', 'DESC']]
    });

    const formatted = analyses.map(a => ({
      id: a.id,
      title: a.title,
      description: a.description,
      symptoms: a.symptoms,
      status: a.status,
      aiConfidenceScore: a.aiConfidenceScore,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      patient: a.Patient ? { id: a.Patient.id, name: a.Patient.name, email: a.Patient.email } : null,
      resultsCount: a.AnalysisResults ? a.AnalysisResults.length : 0,
      imagesCount: a.MedicalImages ? a.MedicalImages.length : 0,
      diagnosis:
        (a.AnalysisResults && a.AnalysisResults.length > 0)
          ? (a.AnalysisResults.find(r =>
              (r.category || '').includes('Diagnóstico') || (r.category || '').includes('Diagnostico')
            )?.result || a.title)
          : a.title
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching analyses:', error);
    res.status(500).json({ error: 'Erro ao buscar análises' });
  }
});

/** POST /api/analysis */
router.post(
  '/',
  authenticate,
  upload.fields([{ name: 'images', maxCount: 5 }, { name: 'documents', maxCount: 3 }]),
  async (req, res) => {
    try {
      const { title, description, symptoms, patientId } = req.body;
      const doctorId = req.userId;
      const parsedPatientId = normalizeId(patientId);

      const subscription = await Subscription.findOne({ where: { userId: doctorId } });
      if (subscription && subscription.analysisUsed >= subscription.analysisLimit) {
        return res.status(400).json({
          error: 'Limite de análises atingido para seu plano atual',
          currentUsage: subscription.analysisUsed,
          limit: subscription.analysisLimit
        });
      }

      const hasAnyContent =
        Boolean(title) || Boolean(description) || Boolean(symptoms) ||
        Boolean(req.files?.images?.length) || Boolean(req.files?.documents?.length);
      if (!hasAnyContent) {
        return res.status(400).json({
          error: 'Forneça pelo menos um título, descrição, sintomas ou arquivo para análise'
        });
      }

      if (parsedPatientId !== null) {
        const patient = await Patient.findOne({ where: { id: parsedPatientId, doctorId } });
        if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });
      }

      const analysis = await Analysis.create({
        title: title || 'Análise Médica',
        description: description || null,
        symptoms: symptoms || null,
        status: 'pending',
        patientId: parsedPatientId,
        doctorId
      });

      if (req.files?.images) {
        for (const f of req.files.images) {
          await MedicalImage.create({
            filename: f.filename,
            originalName: f.originalname,
            filePath: f.path,
            fileSize: f.size,
            mimeType: f.mimetype,
            imageType: getImageType(f.mimetype),
            analysisId: analysis.id
          });
        }
      }
      if (req.files?.documents) {
        for (const f of req.files.documents) {
          await MedicalImage.create({
            filename: f.filename,
            originalName: f.originalname,
            filePath: f.path,
            fileSize: f.size,
            mimeType: f.mimetype,
            imageType: 'other',
            analysisId: analysis.id
          });
        }
      }

      if (subscription) await subscription.increment('analysisUsed');

      // background (usa os mesmos aliases dentro do aiService ao fazer includes!)
      processWithAI(analysis.id).catch(err => console.error('❌ Erro no processamento de IA:', err));

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
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
);

/** GET /api/analysis/:id */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const doctorId = req.userId;
    const { id } = req.params;
    const analysis = await Analysis.findOne({
      where: { id, doctorId },
      include: [
        { model: Patient, as: 'Patient', attributes: ['id', 'name', 'email', 'birthDate', 'gender', 'medicalHistory', 'allergies'], required: false },
        { model: AnalysisResult, as: 'AnalysisResults', required: false },
        { model: MedicalImage, as: 'MedicalImages', attributes: ['id', 'filename', 'originalName', 'imageType', 'mimeType', 'createdAt'], required: false }
      ],
      order: [[{ model: AnalysisResult, as: 'AnalysisResults' }, 'createdAt', 'ASC']]
    });
    if (!analysis) return res.status(404).json({ error: 'Análise não encontrada' });
    res.json(analysis);
  } catch (error) {
    console.error('Error fetching analysis:', error);
    res.status(500).json({ error: 'Erro ao buscar análise' });
  }
});

/** GET /api/analysis/:id/results */
router.get('/:id/results', authenticate, async (req, res) => {
  try {
    const doctorId = req.userId;
    const { id } = req.params;
    const analysis = await Analysis.findOne({
      where: { id, doctorId },
      include: [
        { model: Patient, as: 'Patient', attributes: ['id', 'name', 'email', 'birthDate', 'gender', 'medicalHistory', 'allergies'], required: false },
        { model: AnalysisResult, as: 'AnalysisResults', required: false },
        { model: MedicalImage, as: 'MedicalImages', attributes: ['id', 'filename', 'originalName', 'imageType', 'mimeType', 'createdAt'], required: false }
      ],
      order: [[{ model: AnalysisResult, as: 'AnalysisResults' }, 'createdAt', 'ASC']]
    });
    if (!analysis) return res.status(404).json({ error: 'Análise não encontrada' });
    res.json(analysis);
  } catch (error) {
    console.error('Error fetching analysis results:', error);
    res.status(500).json({ error: 'Erro ao buscar resultados da análise' });
  }
});

/** PUT /api/analysis/:id/status */
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const doctorId = req.userId;
    const { id } = req.params;
    const { status } = req.body;
    const valid = ['pending', 'processing', 'completed', 'failed'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Status inválido' });

    const analysis = await Analysis.findOne({ where: { id, doctorId } });
    if (!analysis) return res.status(404).json({ error: 'Análise não encontrada' });

    await analysis.update({ status });
    res.json({ message: 'Status atualizado com sucesso', analysis: { id: analysis.id, status: analysis.status, updatedAt: analysis.updatedAt } });
  } catch (error) {
    console.error('Error updating analysis status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status da análise' });
  }
});

/** DELETE /api/analysis/:id */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const doctorId = req.userId;
    const { id } = req.params;
    const analysis = await Analysis.findOne({ where: { id, doctorId } });
    if (!analysis) return res.status(404).json({ error: 'Análise não encontrada' });

    await analysis.destroy();
    res.json({ message: 'Análise deletada com sucesso' });
  } catch (error) {
    console.error('Error deleting analysis:', error);
    res.status(500).json({ error: 'Erro ao deletar análise' });
  }
});

/** POST /api/analysis/:id/reprocess */
router.post('/:id/reprocess', authenticate, async (req, res) => {
  try {
    const doctorId = req.userId;
    const { id } = req.params;
    const analysis = await Analysis.findOne({ where: { id, doctorId } });
    if (!analysis) return res.status(404).json({ error: 'Análise não encontrada' });

    await AnalysisResult.destroy({ where: { analysisId: id } });
    await analysis.update({ status: 'pending', aiConfidenceScore: null });

    processWithAI(analysis.id).catch(err => console.error('❌ Erro no reprocessamento:', err));
    res.json({ message: 'Análise enviada para reprocessamento', analysis: { id: analysis.id, status: analysis.status } });
  } catch (error) {
    console.error('Error reprocessing analysis:', error);
    res.status(500).json({ error: 'Erro ao reprocessar análise' });
  }
});

/** GET /api/analysis/:id/status */
router.get('/:id/status', authenticate, async (req, res) => {
  try {
    const doctorId = req.userId;
    const { id } = req.params;
    const analysis = await Analysis.findOne({
      where: { id, doctorId },
      include: [{ model: AnalysisResult, as: 'AnalysisResults', attributes: ['id'], required: false }]
    });
    if (!analysis) return res.status(404).json({ error: 'Análise não encontrada' });
    res.json({
      id: analysis.id,
      status: analysis.status,
      aiConfidenceScore: analysis.aiConfidenceScore,
      resultsCount: analysis.AnalysisResults?.length || 0
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao buscar status' });
  }
});

module.exports = router;
