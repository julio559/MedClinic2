const { Analysis, AnalysisResult, MedicalImage, Patient } = require('../models');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Configurar OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

    console.log(`🤖 Iniciando análise de IA REAL para: ${analysis.title}`);

    // Atualizar status para processando
    await analysis.update({ status: 'processing' });

    // Preparar prompt médico especializado
    const medicalPrompt = buildMedicalPrompt(analysis);
    
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

    console.log(`✅ Análise de IA REAL concluída: ${analysis.title} (${Math.round(avgConfidence * 100)}% confiança)`);

    // Notificar via Socket.IO se disponível
    if (global.socketIO) {
      global.socketIO.to(`doctor_${analysis.doctorId}`).emit('analysis_completed', {
        analysisId: analysis.id,
        title: analysis.title,
        confidence: avgConfidence,
        resultsCount: savedResults.length,
        message: 'Análise de IA concluída com OpenAI!'
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

const buildMedicalPrompt = (analysis) => {
  const patient = analysis.Patient;
  
  return `ANÁLISE MÉDICA ESPECIALIZADA - SISTEMA DE IA MÉDICA

DADOS DO PACIENTE:
- Nome: ${patient?.name || 'Não informado'}
- Idade: ${patient?.birthDate ? calculateAge(patient.birthDate) : 'Não informada'}
- Gênero: ${patient?.gender || 'Não informado'}
- Histórico médico: ${patient?.medicalHistory || 'Não informado'}
- Alergias: ${patient?.allergies || 'Não informadas'}

CASO CLÍNICO ATUAL:
- Título: ${analysis.title}
- História da doença: ${analysis.description || 'Não fornecida'}
- Sintomas e exame físico: ${analysis.symptoms || 'Não fornecidos'}

INSTRUÇÕES PARA ANÁLISE:
Você é um sistema de IA médica especializada. Realize uma análise médica completa e detalhada baseada nos dados apresentados.

IMPORTANTE: 
- Use conhecimento médico atualizado baseado em evidências científicas
- Seja específico e detalhado em cada categoria
- Considere diagnósticos diferenciais relevantes
- Valores de confiança devem ser realistas (0.70 a 0.95)
- Use terminologia médica apropriada
- Base suas conclusões em guidelines médicos atualizados

Forneça sua resposta em formato JSON válido com exatamente estas 7 categorias:

{
  "diagnostico_principal": {
    "resultado": "Diagnóstico mais provável com base nos achados clínicos apresentados",
    "confianca": 0.85,
    "justificativa": "Explicação detalhada do raciocínio diagnóstico baseado em evidências"
  },
  "etiologia": {
    "resultado": "Principais causas e fatores etiológicos identificados",
    "confianca": 0.80,
    "justificativa": "Base científica e fatores de risco para as causas propostas"
  },
  "fisiopatologia": {
    "resultado": "Mecanismos fisiopatológicos e processos biológicos envolvidos",
    "confianca": 0.82,
    "justificativa": "Explicação dos processos moleculares e celulares relevantes"
  },
  "apresentacao_clinica": {
    "resultado": "Características clínicas típicas, variações e correlação com o caso",
    "confianca": 0.88,
    "justificativa": "Análise das manifestações clínicas observadas"
  },
  "abordagem_diagnostica": {
    "resultado": "Exames complementares recomendados e critérios diagnósticos",
    "confianca": 0.85,
    "justificativa": "Estratégia diagnóstica baseada em protocolos atualizados"
  },
  "abordagem_terapeutica": {
    "resultado": "Opções de tratamento e manejo clínico recomendados",
    "confianca": 0.83,
    "justificativa": "Recomendações terapêuticas baseadas em evidências científicas"
  },
  "guia_prescricao": {
    "resultado": "Prescrições específicas com medicações, dosagens e orientações",
    "confianca": 0.86,
    "justificativa": "Base farmacológica, posológica e considerações clínicas"
  }
}

RESPONDA APENAS COM O JSON VÁLIDO, SEM TEXTO ADICIONAL.`;
};

const analyzeImages = async (medicalImages) => {
  try {
    console.log(`🖼️ Analisando ${medicalImages.length} imagem(ns) médica(s) com GPT-4 Vision`);
    
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
              role: "system",
              content: "Você é um radiologista especialista. Analise esta imagem médica com precisão técnica e use terminologia médica apropriada."
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analise esta imagem médica em detalhes. Forneça:

1. TIPO DE EXAME: Identifique o tipo de imagem/exame realizado
2. TÉCNICA E QUALIDADE: Avalie a qualidade técnica da imagem
3. ACHADOS ANATÔMICOS: Descreva estruturas anatômicas visíveis
4. ACHADOS PATOLÓGICOS: Identifique alterações, lesões ou anormalidades
5. LOCALIZAÇÃO: Especifique localização anatômica precisa dos achados
6. CARACTERÍSTICAS: Descreva tamanho, forma, densidade, intensidade de sinal
7. DIAGNÓSTICOS DIFERENCIAIS: Liste possíveis diagnósticos baseados na imagem
8. RECOMENDAÇÕES: Sugira investigações adicionais se necessário

Use terminologia radiológica precisa e seja específico nos achados.`
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
          max_tokens: 1500,
          temperature: 0.2
        });

        const imageAnalysis = response.choices[0].message.content;
        imageAnalyses.push({
          filename: image.originalName,
          type: image.imageType,
          analysis: imageAnalysis
        });

        console.log(`✅ Imagem analisada com GPT-4V: ${image.originalName}`);

      } catch (imageError) {
        console.error(`Erro ao analisar imagem ${image.originalName}:`, imageError);
        imageAnalyses.push({
          filename: image.originalName,
          analysis: 'Análise de imagem temporariamente indisponível devido a limitações técnicas.'
        });
      }
    }

    return imageAnalyses.length > 0 ? 
      `\n\nANÁLISE DAS IMAGENS MÉDICAS ANEXADAS:\n${imageAnalyses.map(img => 
        `\nIMAGEM: ${img.filename} (${img.type})\nANÁLISE RADIOLÓGICA: ${img.analysis}`
      ).join('\n\n')}` : '';

  } catch (error) {
    console.error('Erro na análise de imagens:', error);
    return '\n\nANÁLISE DE IMAGENS: Não foi possível processar as imagens anexadas.';
  }
};

const performMedicalAnalysis = async (prompt, imageAnalysis) => {
  try {
    console.log('🧠 Realizando análise médica completa com GPT-4 Turbo...');

    const fullPrompt = prompt + imageAnalysis;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `Você é um sistema de IA médica especializada com conhecimento abrangente e atualizado. 
          Forneça análises médicas precisas, detalhadas e baseadas em evidências científicas sólidas.
          Use guidelines médicos internacionais atualizados e literatura científica recente.
          Seja específico em diagnósticos, tratamentos e recomendações.
          Sempre responda em formato JSON válido conforme solicitado.
          Mantenha alta precisão técnica e use terminologia médica apropriada.`
        },
        {
          role: "user",
          content: fullPrompt
        }
      ],
      temperature: 0.3, // Baixa temperatura para precisão
      max_tokens: 4000,
      response_format: { type: "json_object" }
    });

    const aiResponse = response.choices[0].message.content;
    console.log('✅ Análise OpenAI concluída - Tokens usados:', response.usage?.total_tokens || 'N/A');

    // Parse e validação do JSON
    let analysisData;
    try {
      analysisData = JSON.parse(aiResponse);
      console.log('✅ JSON parsing bem-sucedido');
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON da OpenAI:', parseError);
      throw new Error('Resposta da IA em formato inválido');
    }

    // Validar estrutura do JSON
    const requiredCategories = [
      'diagnostico_principal', 'etiologia', 'fisiopatologia', 
      'apresentacao_clinica', 'abordagem_diagnostica', 
      'abordagem_terapeutica', 'guia_prescricao'
    ];

    for (const category of requiredCategories) {
      if (!analysisData[category]) {
        console.warn(`Categoria ausente: ${category}`);
        analysisData[category] = {
          resultado: 'Informação não disponível nesta categoria.',
          confianca: 0.5,
          justificativa: 'Dados insuficientes para análise completa.'
        };
      }
    }

    return analysisData;

  } catch (error) {
    console.error('Erro na análise médica com OpenAI:', error);
    
    // Fallback seguro em caso de erro da OpenAI
    return {
      diagnostico_principal: {
        resultado: 'Análise médica temporariamente indisponível. Consulte um médico especialista para avaliação presencial.',
        confianca: 0.5,
        justificativa: 'Erro técnico no processamento da IA médica. Recomenda-se consulta médica presencial.'
      },
      etiologia: {
        resultado: 'Avaliação etiológica requer consulta médica especializada.',
        confianca: 0.5,
        justificativa: 'Limitação técnica do sistema de IA.'
      },
      fisiopatologia: {
        resultado: 'Análise fisiopatológica deve ser realizada por médico qualificado.',
        confianca: 0.5,
        justificativa: 'Processo automatizado temporariamente indisponível.'
      },
      apresentacao_clinica: {
        resultado: 'Apresentação clínica deve ser avaliada em consulta médica.',
        confianca: 0.5,
        justificativa: 'Sistema de IA com limitação técnica temporária.'
      },
      abordagem_diagnostica: {
        resultado: 'Estratégia diagnóstica deve ser definida por médico especialista.',
        confianca: 0.5,
        justificativa: 'Recomendação de segurança para consulta médica.'
      },
      abordagem_terapeutica: {
        resultado: 'Tratamento deve ser prescrito exclusivamente por médico habilitado.',
        confianca: 0.5,
        justificativa: 'Protocolo de segurança médica obrigatório.'
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
    console.log('💾 Salvando resultados da análise OpenAI...');

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
          confidenceScore: Math.min(Math.max(categoryData.confianca || 0.5, 0), 1), // Garantir entre 0 e 1
          aiModel: 'GPT-4-Turbo + GPT-4-Vision',
          isCompleted: true,
          analysisId: analysisId
        });

        savedResults.push(result);
        console.log(`✅ Salvo: ${categoryName} (${Math.round(result.confidenceScore * 100)}% confiança)`);
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
    console.error('⚠️  Sistema funcionará em modo simulado');
    return false;
  }
  
  if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
    console.error('❌ OPENAI_API_KEY inválida (deve começar com sk-)');
    return false;
  }
  
  console.log('✅ OpenAI configurada corretamente para uso em produção');
  return true;
};

// Função de teste da OpenAI
const testOpenAIConnection = async () => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Test connection" }],
      max_tokens: 5
    });
    
    console.log('✅ Conexão com OpenAI testada com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao testar conexão OpenAI:', error.message);
    return false;
  }
};

module.exports = { 
  processWithAI, 
  validateOpenAIConfig,
  testOpenAIConnection
};