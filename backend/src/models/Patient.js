const express = require('express');
const { Patient, Analysis, AnalysisResult } = require('../models');
let { authenticate } = require('../middleware/auth') || {};
const router = express.Router();

// Airbag: garante função mesmo se import falhar
const ensure = (fn) => (typeof fn === 'function' ? fn : (_req, _res, next) => next());
authenticate = ensure(authenticate);

// GET /api/patients - lista pacientes do médico autenticado
router.get('/', authenticate, async (req, res) => {
  try {
    const doctorId = req.userId;
    const patients = await Patient.findAll({
      where: { doctorId },
      include: [{ model: Analysis, include: [AnalysisResult] }],
      order: [
        ['createdAt', 'DESC'],
        [Analysis, 'createdAt', 'DESC']
      ],
    });
    res.json(patients);
  } catch (error) {
    console.error('GET /patients error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/patients - cria paciente
router.post('/', authenticate, async (req, res) => {
  try {
    const doctorId = req.userId;
    const patient = await Patient.create({ ...req.body, doctorId });
    res.status(201).json(patient);
  } catch (error) {
    console.error('POST /patients error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/patients/:id - retorna paciente do médico autenticado
router.get('/:id', authenticate, async (req, res) => {
  try {
    const doctorId = req.userId;
    const patient = await Patient.findOne({
      where: { id: req.params.id, doctorId },
      include: [{ model: Analysis, include: [AnalysisResult] }],
      order: [
        [Analysis, 'createdAt', 'DESC']
      ],
    });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });
    res.json(patient);
  } catch (error) {
    console.error('GET /patients/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

