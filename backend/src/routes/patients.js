const express = require('express');
const { Patient, Analysis, AnalysisResult } = require('../models');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// GET /api/patients
router.get('/', authenticate, async (req, res) => {
  try {
    const patients = await Patient.findAll({
      where: { doctorId: req.userId },
      include: [
        {
          model: Analysis,
          as: 'Analyses',
          include: [{ model: AnalysisResult, as: 'AnalysisResults' }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/patients
router.post('/', authenticate, async (req, res) => {
  try {
    const patient = await Patient.create({
      ...req.body,
      doctorId: req.userId
    });

    res.status(201).json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/patients/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const patient = await Patient.findOne({
      where: { id: req.params.id, doctorId: req.userId },
      include: [
        {
          model: Analysis,
          as: 'Analyses',
          include: [{ model: AnalysisResult, as: 'AnalysisResults' }]
        }
      ],
      order: [[{ model: Analysis, as: 'Analyses' }, 'createdAt', 'DESC']]
    });

    if (!patient) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
