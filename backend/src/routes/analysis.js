const express = require('express');
const multer = require('multer');
const path = require('path');
const { Analysis, AnalysisResult, MedicalImage, Patient, Subscription } = require('../models');
const { authenticate } = require('../middleware/auth');
const { processWithAI } = require('../services/aiService');
const router = express.Router();

// Multer config for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/medical-images/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|dcm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/dicom';
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'));
    }
  }
});

// Create new analysis
router.post('/', authenticate, upload.array('images', 10), async (req, res) => {
  try {
    const { patientId, title, description, symptoms } = req.body;
    
    const subscription = await Subscription.findOne({
      where: { userId: req.user.userId }
    });

    if (!subscription || subscription.analysisUsed >= subscription.analysisLimit) {
      return res.status(403).json({ 
        error: 'Limite de análises atingido. Atualize seu plano.' 
      });
    }

    const patient = await Patient.findOne({
      where: { id: patientId, doctorId: req.user.userId }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    const analysis = await Analysis.create({
      title, description, symptoms, patientId, doctorId: req.user.userId, status: 'processing'
    });

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await MedicalImage.create({
          filename: file.filename,
          originalName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype,
          imageType: 'photo',
          analysisId: analysis.id
        });
      }
    }

    await subscription.update({
      analysisUsed: subscription.analysisUsed + 1
    });

    processWithAI(analysis.id).catch(console.error);

    res.status(201).json({
      message: 'Análise criada com sucesso',
      analysis
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get analysis results
router.get('/:id/results', authenticate, async (req, res) => {
  try {
    const analysis = await Analysis.findOne({
      where: { id: req.params.id, doctorId: req.user.userId },
      include: [
        { model: AnalysisResult },
        { model: MedicalImage },
        { model: Patient }
      ]
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Análise não encontrada' });
    }

    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent analyses
router.get('/recent', authenticate, async (req, res) => {
  try {
    const analyses = await Analysis.findAll({
      where: { doctorId: req.user.userId },
      include: [{ model: Patient }],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    res.json(analyses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
