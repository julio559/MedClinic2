const { Analysis, AnalysisResult, MedicalImage, Patient } = require('../models');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Configurar OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Adicione sua chave da OpenAI no .env
});

const processWithAI = async (analysisId) => {
  try {
    const analysis = await Analysis.findByPk(analysisId, {
      include: [
        { model: MedicalImage },
        { model: Patient }
      ]
    });

    if (!analysis) {
      throw new Error('Análise não encontrada');
    }

    console.log(`🤖 Iniciando análise de IA real para: ${analysis.title}`);

    // Atualizar status para processando
    await analysis.update({ status: 'processing' });

    // Preparar prompt médico especializado
    const medicalPrompt = await buildMedicalPrompt(analysis);
    
    // Processar imagens se houver
    let imageAnalysis = '';
    if (analysis.MedicalImages && analysis.MedicalImages.length > 0) {
      imageAnalysis = await analyzeImages(analysis.MedicalImages);
    }

    // Realizar análise médica completa com OpenAI
    const aiAnalysis = await performMedicalAnalysis(medicalPrompt, imageAnalysis);

    // Salvar resultados no banco
    const savedResults = await saveAnalysisResults(analysis.id, aiAnalysis);

    // Calcular confiança média
    const avgConfidence = savedResults.reduce((acc, r) => acc + r.confidenceScore, 0) / savedResults.length;

    // Atualizar análise como concluída
    await analysis.update({
      status: 'completed',
      aiConfidenceScore: avgConfidence
    });

    console.log(`✅ Análise de IA concluída: ${analysis.title} (${Math.round(avgConfidence * 100)}% confiança)`);

    // Notificar via Socket.IO se disponível
    if (global.socketIO) {
      global.socketIO.to(`doctor_${analysis.doctorId}`).emit('analysis_completed', {
        analysisId: analysis.id,
        title: analysis.title,
        confidence: avgConfidence,
        resultsCount: savedResults.length,
        message: 'Análise de IA concluída com sucesso!'
      });
    }

    return {
      success: true,
      analysisId: analysis.id,
      confidence: avgConfidence,
      resultsCount: savedResults.length
    };

  } catch (error) {
    console.error('❌ Erro no processamento de IA:', error);
    
    // Marcar como falhou
    await Analysis.update(
      { status: 'failed' }, 
      { where: { id: analysisId } }
    );
    
    throw error;
  }
};

const buildMedicalPrompt = async (analysis) => {
  const patient = analysis.Patient;
  
  return `
ANÁLISE MÉDICA ESPECIALIZADA

DADOS DO PACIENTE:
- Nome: ${patient?.name || 'Não informado'}
- Idade: ${patient?.birthDate ? calculateAge(patient.birthDate) : 'Não informada'}
- Gênero: ${patient?.gender || 'Não informado'}
- Histórico médico: ${patient?.medicalHistory || 'Não informado'}
- Alergias: ${patient?.allergies || 'Não informadas'}

CASO CLÍNICO:
- Título: ${analysis.title}
- Descrição: ${analysis.description || 'Não fornecida'}
- Sintomas/Exame físico: ${analysis.symptoms || 'Não fornecidos'}

INSTRUÇÕES:
Você é um médico especialista com vasta experiência. Realize uma análise médica completa e detalhada do caso apresentado.

Sua resposta deve ser em formato JSON válido com exatamente estas 7 categorias:

{
  "diagnostico_principal": {
    "resultado": "Diagnóstico mais provável baseado nos dados apresentados",
    "confianca": 0.85,
    "justificativa": "Explicação detalhada do raciocínio diagnóstico"
  },
  "etiologia": {
    "resultado": "Possíveis causas e fatores etiológicos",
    "confianca": 0.80,
    "justificativa": "Base científica para as causas propostas"
  },
  "fisiopatologia": {
    "resultado": "Mecanismos fisiopatológicos envolvidos",
    "confianca": 0.82,
    "justificativa": "Explicação dos processos biológicos"
  },
  "apresentacao_clinica": {
    "resultado": "Características clínicas típicas e variações",
    "confianca": 0.88,
    "justificativa": "Correlação com o quadro apresentado"
  },
  "abordagem_diagnostica": {
    "resultado": "Exames complementares e critérios diagnósticos recomendados",
    "confianca": 0.85,
    "justificativa": "Estratégia diagnóstica baseada em evidências"
  },
  "abordagem_terapeutica": {
    "resultado": "Opções de tratamento e manejo clínico",
    "confianca": 0.83,
    "justificativa": "Recomendações terapêuticas fundamentadas"
  },
  "guia_prescricao": {
    "resultado": "Prescrições específicas com dosagens e orientações",
    "confianca": 0.86,
    "justificativa": "Base farmacológica e posológica"
  }
}

IMPORTANTE:
- Use conhecimento médico atualizado e baseado em evidências
- Seja específico e detalhado em cada categoria
- Valores de confiança devem ser realistas (0.7 a 0.95)
- Responda apenas com JSON válido, sem texto adicional
- Use terminologia médica apropriada
- Considere diagnósticos diferenciais quando relevante
`;
};

const analyzeImages = async (medicalImages) => {
  try {
    console.log(`🖼️ Analisando ${medicalImages.length} imagem(ns) médica(s)`);
    
    const imageAnalyses = [];
    
    for (const image of medicalImages) {
      try {
        // Verificar se o arquivo existe
        if (!fs.existsSync(image.filePath)) {
          console.warn(`Arquivo de imagem não encontrado: ${image.filePath}`);
          continue;
        }

        // Converter imagem para base64
        const imageBuffer = fs.readFileSync(image.filePath);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = image.mimeType || 'image/jpeg';

        // Analisar imagem com GPT-4 Vision
        const response = await openai.chat.completions.create({
          model: "gpt-4-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analise esta imagem médica em detalhes. Descreva:
1. Tipo de imagem/exame
2. Achados visuais relevantes
3. Possíveis diagnósticos baseados na imagem
4. Características anatômicas observadas
5. Sinais patológicos identificados

Seja preciso e use terminologia médica apropriada.`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`,
                    detail: "high"
                  }
                }
              ]
            }
          ],
          max_tokens: 1000,
          temperature: 0.3
        });

        const imageAnalysis = response.choices[0].message.content;
        imageAnalyses.push({
          filename: image.originalName,
          analysis: imageAnalysis
        });

        console.log(`✅ Imagem analisada: ${image.originalName}`);

      } catch (imageError) {
        console.error(`Erro ao analisar imagem ${image.originalName}:`, imageError);
        imageAnalyses.push({
          filename: image.originalName,
          analysis: 'Não foi possível analisar esta imagem devido a limitações técnicas.'
        });
      }
    }

    return imageAnalyses.length > 0 ? 
      `\nANÁLISE DAS IMAGENS MÉDICAS:\n${imageAnalyses.map(img => 
        `${img.filename}: ${img.analysis}`
      ).join('\n\n')}` : '';

  } catch (error) {
    console.error('Erro na análise de imagens:', error);
    return '';
  }
};

const performMedicalAnalysis = async (prompt, imageAnalysis) => {
  try {
    console.log('🧠 Realizando análise médica com OpenAI...');

    const fullPrompt = prompt + imageAnalysis;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview", // Modelo mais avançado
      messages: [
        {
          role: "system",
          content: `Você é um médico especialista altamente qualificado com conhecimento médico atualizado. 
          Forneça análises médicas precisas, detalhadas e baseadas em evidências científicas.
          Sempre responda em formato JSON válido conforme solicitado.
          Use conhecimento médico de guidelines internacionais atualizados.`
        },
        {
          role: "user",
          content: fullPrompt
        }
      ],
      temperature: 0.3, // Baixa temperatura para respostas mais precisas
      max_tokens: 4000,
      response_format: { type: "json_object" } // Garantir resposta em JSON
    });

    const aiResponse = response.choices[0].message.content;
    console.log('✅ Resposta da OpenAI recebida');

    // Parse e validação do JSON
    let analysisData;
    try {
      analysisData = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON da OpenAI:', parseError);
      throw new Error('Resposta da IA em formato inválido');
    }

    return analysisData;

  } catch (error) {
    console.error('Erro na análise médica:', error);
    
    // Fallback em caso de erro da OpenAI
    return {
      diagnostico_principal: {
        resultado: 'Análise médica temporariamente indisponível. Consulte um médico especialista.',
        confianca: 0.5,
        justificativa: 'Erro técnico no processamento da IA médica.'
      },
      etiologia: {
        resultado: 'Avaliação etiológica requer consulta médica presencial.',
        confianca: 0.5,
        justificativa: 'Limitação técnica do sistema.'
      },
      fisiopatologia: {
        resultado: 'Análise fisiopatológica requer avaliação médica especializada.',
        confianca: 0.5,
        justificativa: 'Erro no processamento automatizado.'
      },
      apresentacao_clinica: {
        resultado: 'Apresentação clínica deve ser avaliada por médico qualificado.',
        confianca: 0.5,
        justificativa: 'Sistema de IA temporariamente indisponível.'
      },
      abordagem_diagnostica: {
        resultado: 'Consulte médico especialista para abordagem diagnóstica adequada.',
        confianca: 0.5,
        justificativa: 'Recomendação de segurança médica.'
      },
      abordagem_terapeutica: {
        resultado: 'Tratamento deve ser prescrito exclusivamente por médico habilitado.',
        confianca: 0.5,
        justificativa: 'Protocolo de segurança médica.'
      },
      guia_prescricao: {
        resultado: 'Prescrições devem ser feitas exclusivamente por médico responsável.',
        confianca: 0.5,
        justificativa: 'Exigência legal e ética médica.'
      }
    };
  }
};

const saveAnalysisResults = async (analysisId, aiAnalysis) => {
  try {
    console.log('💾 Salvando resultados da análise...');

    const categoryMapping = {
      'diagnostico_principal': 'Diagnóstico Principal',
      'etiologia': 'Etiologia',
      'fisiopatologia': 'Fisiopatologia', 
      'apresentacao_clinica': 'Apresentação Clínica',
      'abordagem_diagnostica': 'Abordagem Diagnóstica',
      'abordagem_terapeutica': 'Abordagem Terapêutica',
      'guia_prescricao': 'Guia de Prescrição'
    };

    const savedResults = [];

    for (const [key, categoryName] of Object.entries(categoryMapping)) {
      const categoryData = aiAnalysis[key];
      
      if (categoryData) {
        const result = await AnalysisResult.create({
          category: categoryName,
          result: categoryData.resultado || 'Resultado não disponível',
          confidenceScore: categoryData.confianca || 0.5,
          aiModel: 'GPT-4-Turbo',
          isCompleted: true,
          analysisId: analysisId,
          justification: categoryData.justificativa || '' // Campo adicional para justificativa
        });

        savedResults.push(result);
        console.log(`✅ Salvo: ${categoryName}`);
      }
    }

    console.log(`💾 ${savedResults.length} resultados salvos com sucesso`);
    return savedResults;

  } catch (error) {
    console.error('Erro ao salvar resultados:', error);
    throw error;
  }
};

// Função auxiliar para calcular idade
const calculateAge = (birthDate) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return `${age} anos`;
};

// Função para validar configuração da OpenAI
const validateOpenAIConfig = () => {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY não configurada no arquivo .env');
    return false;
  }
  
  console.log('✅ OpenAI configurada corretamente');
  return true;
};

module.exports = { 
  processWithAI, 
  validateOpenAIConfig 
};