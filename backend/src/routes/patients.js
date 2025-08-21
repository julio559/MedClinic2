const express = require('express');
const { Patient, Analysis, AnalysisResult } = require('../models');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get all patients for doctor
router.get('/', authenticate, async (req, res) => {
  try {
    const patients = await Patient.findAll({
      where: { doctorId: req.user.userId },
      include: [{ model: Analysis, include: [AnalysisResult] }],
      order: [['createdAt', 'DESC']]
    });

    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create patient
router.post('/', authenticate, async (req, res) => {
  try {
    const patient = await Patient.create({
      ...req.body,
      doctorId: req.user.userId
    });

    res.status(201).json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get patient by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const patient = await Patient.findOne({
      where: { id: req.params.id, doctorId: req.user.userId },
      include: [{ model: Analysis, include: [AnalysisResult], order: [['createdAt', 'DESC']] }]
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
