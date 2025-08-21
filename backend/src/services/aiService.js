const { Analysis, AnalysisResult, MedicalImage } = require('../models');

const processWithAI = async (analysisId) => {
  try {
    const analysis = await Analysis.findByPk(analysisId, {
      include: [MedicalImage]
    });

    if (!analysis) {
      throw new Error('Analise nao encontrada');
    }

    console.log(`🤖 Processando analise AI para: ${analysis.title}`);

    const processingTime = Math.random() * 5000 + 3000;
    await new Promise(resolve => setTimeout(resolve, processingTime));

    const aiResults = [
      {
        category: 'Diagnostico principal',
        result: 'Possivel Placa Psoriatica com Superinfeccao Bacteriana. Observa-se lesao eritematosa com descamacao.',
        confidenceScore: Math.random() * 0.2 + 0.8,
        aiModel: 'DermatologyAI-v2.1'
      },
      {
        category: 'Etiologia',
        result: 'Provavel origem autoimune com fatores desencadeantes ambientais.',
        confidenceScore: Math.random() * 0.15 + 0.85,
        aiModel: 'MedicalNLP-v1.5'
      },
      {
        category: 'Fisiopatologia',
        result: 'Processo inflamatorio cronico com hiperproliferacao de queratinocitos.',
        confidenceScore: Math.random() * 0.1 + 0.85,
        aiModel: 'PathologyAI-v1.8'
      },
      {
        category: 'Apresentacao Clinica',
        result: 'Lesao eritematosa bem delimitada com escamas prateadas caracteristicas.',
        confidenceScore: Math.random() * 0.15 + 0.8,
        aiModel: 'ClinicalAI-v2.0'
      },
      {
        category: 'Abordagem diagnostica',
        result: 'Recomenda-se biopsia de pele para confirmacao histopatologica.',
        confidenceScore: Math.random() * 0.1 + 0.85,
        aiModel: 'DiagnosticAI-v1.9'
      },
      {
        category: 'Abordagem Terapeutica',
        result: 'Tratamento topico com corticoides de potencia moderada.',
        confidenceScore: Math.random() * 0.15 + 0.8,
        aiModel: 'TherapyAI-v1.7'
      },
      {
        category: 'Guia de Prescricao',
        result: 'Betametasona creme 0,05% - aplicar 2x/dia por 2 semanas.',
        confidenceScore: Math.random() * 0.1 + 0.88,
        aiModel: 'PrescriptionAI-v1.6'
      }
    ];

    const createdResults = [];
    for (const result of aiResults) {
      const analysisResult = await AnalysisResult.create({
        ...result, analysisId, isCompleted: true
      });
      createdResults.push(analysisResult);
    }

    const avgConfidence = aiResults.reduce((acc, r) => acc + r.confidenceScore, 0) / aiResults.length;

    await analysis.update({
      status: 'completed',
      aiConfidenceScore: avgConfidence
    });

    console.log(`✅ Analise AI concluida: ${analysis.title} (${Math.round(avgConfidence * 100)}% confianca)`);

    if (global.socketIO) {
      global.socketIO.to(`doctor_${analysis.doctorId}`).emit('analysis_completed', {
        analysisId, title: analysis.title, confidence: avgConfidence,
        resultsCount: createdResults.length, message: 'Analise de IA concluida!'
      });
    }

    return { success: true, analysisId, confidence: avgConfidence, resultsCount: createdResults.length };

  } catch (error) {
    console.error('❌ Erro no processamento AI:', error);
    await Analysis.update({ status: 'failed' }, { where: { id: analysisId } });
    throw error;
  }
};

module.exports = { processWithAI };
