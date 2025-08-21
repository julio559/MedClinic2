// src/services/aiService.js
const { Analysis, AnalysisResult, MedicalImage, Patient } = require('../models');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// =====================
// Config de modelos
// =====================
const MODEL_TEXT   = process.env.OPENAI_TEXT_MODEL   || 'gpt-4o';
const MODEL_VISION = process.env.OPENAI_VISION_MODEL || MODEL_TEXT;

// =====================
// OpenAI
// =====================
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// =====================
// Schema obrigatório
// =====================
const REQUIRED_CATEGORIES = [
  'diagnostico_principal',
  'etiologia',
  'fisiopatologia',
  'apresentacao_clinica',
  'abordagem_diagnostica',
  'abordagem_terapeutica',
  'guia_prescricao'
];

/**
 * IMPORTANTE:
 * Mantivemos o mesmo schema (resultado:string, justificativa:string, confianca:number) para não quebrar o salvamento.
 * O "resultado" agora vem ricamente formatado (markdown leve) com subtítulos e listas.
 */
const JSON_SCHEMA_TEXT = `
Objeto JSON com 7 chaves obrigatórias:
{
  "diagnostico_principal": { "resultado": string, "confianca": number (0..1), "justificativa": string },
  "etiologia": { "resultado": string, "confianca": number (0..1), "justificativa": string },
  "fisiopatologia": { "resultado": string, "confianca": number (0..1), "justificativa": string },
  "apresentacao_clinica": { "resultado": string, "confianca": number (0..1), "justificativa": string },
  "abordagem_diagnostica": { "resultado": string, "confianca": number (0..1), "justificativa": string },
  "abordagem_terapeutica": { "resultado": string, "confianca": number (0..1), "justificativa": string },
  "guia_prescricao": { "resultado": string, "confianca": number (0..1), "justificativa": string }
}

Regras:
- Responder SOMENTE com JSON válido (sem texto extra).
- Campo "resultado" deve ser um texto rico (markdown leve) com subtítulos "###" e listas "-" ou "•".
- Sempre que possível, incluir: probabilidades estimadas (%), sinais de alarme, fatores de risco, rastros de evidência e CID-10.
- Em "abordagem_diagnostica": incluir Diferenciais (3–6 com %), Exames prioritários (com motivo/impacto), Red flags, e critérios clínicos se houver.
- Em "abordagem_terapeutica": incluir medidas não farmacológicas (curto e longo prazo), farmacológicas (classes, 1ª/2ª linha), doses usuais (adulto/ajustes), principais efeitos adversos e interações.
- Em "guia_prescricao": sintetizar um regime possível com posologia (unidades e intervalo), duração típica e monitorização, e alternativas se alergia/contraindicação.
- "confianca": número entre 0 e 1 (0.00–1.00).
- Se dados forem insuficientes, explicitar "Dados insuficientes" e orientar coleta/exames.
`.trim();

// =====================
// Serviço principal
// =====================
const processWithAI = async (analysisId) => {
  try {
    const analysis = await Analysis.findByPk(analysisId, {
      include: [{ model: MedicalImage }, { model: Patient }]
    });
    if (!analysis) throw new Error('Análise não encontrada');
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY ausente. Configure e tente novamente.');

    console.log(`🤖 Iniciando análise de IA MÉDICA para: ${analysis.title}`);
    await analysis.update({ status: 'processing' });

    const medicalPrompt = buildMedicalPrompt(analysis);

    let imageAnalysis = '';
    if (analysis.MedicalImages && analysis.MedicalImages.length > 0) {
      imageAnalysis = await analyzeImages(analysis.MedicalImages);
    }

    const aiAnalysis = await performMedicalAnalysis(medicalPrompt, imageAnalysis);

    const savedResults = await saveAnalysisResults(analysis.id, aiAnalysis);
    const avgConfidence = savedResults.reduce((acc, r) => acc + r.confidenceScore, 0) / savedResults.length;

    await analysis.update({ status: 'completed', aiConfidenceScore: avgConfidence });

    console.log(`✅ Análise concluída: ${analysis.title} (${Math.round(avgConfidence * 100)}% confiança)`);

    if (global.socketIO) {
      global.socketIO.to(`doctor_${analysis.doctorId}`).emit('analysis_completed', {
        analysisId: analysis.id,
        title: analysis.title,
        confidence: avgConfidence,
        resultsCount: savedResults.length,
        message: 'Análise de IA médica concluída!'
      });
    }

    return { success: true, analysisId: analysis.id, confidence: avgConfidence, resultsCount: savedResults.length };

  } catch (error) {
    console.error('❌ Erro no processamento de IA:', error);
    await Analysis.update({ status: 'failed' }, { where: { id: analysisId } });
    throw error;
  }
};

// =====================
// Prompt base (DETALHADO)
// =====================
const buildMedicalPrompt = (analysis) => {
  const patient = analysis.Patient;
  return `
SISTEMA DE APOIO DIAGNÓSTICO PARA MÉDICOS (PT-BR) — MODO DETALHADO

NOTA: Para uso por profissionais habilitados. Conteúdo não substitui o julgamento clínico.

DADOS DO PACIENTE
- Nome: ${patient?.name || 'Paciente não identificado'}
- Idade: ${patient?.birthDate ? calculateAge(patient.birthDate) : 'Idade não informada'}
- Sexo: ${patient?.gender || 'Não informado'}
- História pregressa: ${patient?.medicalHistory || 'Não informada'}
- Alergias: ${patient?.allergies || 'Não informadas'}

CASO ATUAL
- Motivo/Contexto: ${analysis.title}
- História da doença atual: ${analysis.description || 'Não fornecida'}
- Sintomas/Achados: ${analysis.symptoms || 'Não fornecidos'}

INSTRUÇÕES DE FORMATAÇÃO
- Use o SCHEMA abaixo e responda APENAS com JSON válido.
- Eleve o nível de detalhe: inclua probabilidades (%), red flags, CID-10 quando aplicável, critérios diagnósticos, impactos de exames, e doses/posologia em linguagem clínica segura.
- Em cada "resultado", use markdown leve com "###" para subtítulos e "-" para listas (sem tabelas).
- Mantenha linguagem técnica, objetiva e baseada em evidência; cite diretrizes quando relevante (ex.: AAD, BAD, IDSA, AHA/ACC, etc.), mas sem links.

SCHEMA
${JSON_SCHEMA_TEXT}

RETORNE APENAS O JSON.
`.trim();
};

// =====================
// Análise de imagens
// =====================
const analyzeImages = async (medicalImages) => {
  try {
    console.log(`🖼️ Analisando ${medicalImages.length} imagem(ns) com ${MODEL_VISION}`);
    const imageAnalyses = [];

    for (const image of medicalImages) {
      try {
        if (!fs.existsSync(image.filePath)) {
          console.warn(`Arquivo não encontrado: ${image.filePath}`);
          continue;
        }
        const imageBuffer = fs.readFileSync(image.filePath);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = image.mimeType || 'image/jpeg';

        const response = await withRetries(() =>
          openai.chat.completions.create({
            model: MODEL_VISION,
            messages: [
              {
                role: "system",
                content:
                  "Você é um especialista em interpretação de imagens médicas (dermatologia/dermatoscopia e radiologia). Produza laudo técnico, objetivo, com achados descritivos, impressões diagnósticas diferenciais (com probabilidade) e recomendações de exames adicionais quando pertinentes."
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text:
`Gere LAUDO detalhado:
- Técnica/qualidade da imagem
- Anatomia/região/lesão
- Achados descritivos (morfologia, distribuição, coloração/padrões)
- Hipóteses e diferenciais (3–6) com probabilidade estimada
- Recomendações de exames/complementos (e impacto clínico)
- Observações de segurança e sinais de alarme`
                  },
                  { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
                ]
              }
            ],
            max_tokens: 1500,
            temperature: 0.1
          })
        );

        const imageAnalysis = response.choices?.[0]?.message?.content || '(sem conteúdo)';
        imageAnalyses.push({
          filename: image.originalName,
          type: image.imageType,
          analysis: imageAnalysis
        });

        console.log(`✅ Laudo gerado: ${image.originalName}`);
      } catch (err) {
        console.error(`Erro em ${image.originalName}:`, err?.message || err);
      }
    }

    if (imageAnalyses.length === 0) return '';
    return (
      `\n\nRELATÓRIO DAS IMAGENS ENVIADAS:\n` +
      imageAnalyses.map(img =>
        `\n=== IMAGEM: ${img.filename} (Tipo: ${img.type}) ===\n${img.analysis}\n`
      ).join('\n')
    );
  } catch (error) {
    console.error('Erro na análise de imagens:', error);
    return '';
  }
};

// =====================
// Geração principal
// =====================
const performMedicalAnalysis = async (prompt, imageAnalysis) => {
  const fullPrompt = `${prompt}${imageAnalysis || ''}`.trim();

  let aiContent = await callAIForJSON(fullPrompt);
  let data = tryParseJSON(aiContent);

  if (!data) {
    aiContent = await repairJsonWithAI(aiContent);
    data = tryParseJSON(aiContent);
  }
  if (!data) {
    aiContent = await regenerateAnalysisWithAI(fullPrompt);
    data = tryParseJSON(aiContent);
  }
  if (!data) {
    aiContent = await regenerateAnalysisWithAI(fullPrompt, /* minimal */ true);
    data = tryParseJSON(aiContent);
  }
  if (!data) throw new Error('Falha ao obter JSON válido da IA.');

  const missing = REQUIRED_CATEGORIES.filter(k => !data[k] || !data[k].resultado);
  if (missing.length > 0) {
    aiContent = await fillMissingCategoriesWithAI(data, missing);
    data = tryParseJSON(aiContent) || data;
  }

  // Normalizar 'confianca'
  for (const c of REQUIRED_CATEGORIES) {
    if (data[c]?.confianca !== undefined) {
      const v = Number(data[c].confianca);
      data[c].confianca = Number.isFinite(v) ? Math.min(Math.max(v, 0), 1) : 0.75;
    } else if (data[c]) {
      data[c].confianca = 0.75;
    }
  }

  return data;
};

// =====================
// Chamadas auxiliares à IA (com retry 429/5xx)
// =====================
async function callAIForJSON(userContent) {
  console.log('🧠 Solicitando JSON à IA com', MODEL_TEXT);
  const resp = await withRetries(() =>
    openai.chat.completions.create({
      model: MODEL_TEXT,
      messages: [
        {
          role: "system",
          content:
            "Você é um sistema de IA médica. Gere resposta APENAS em JSON válido conforme o schema fornecido. Use linguagem técnica em PT-BR."
        },
        { role: "user", content: userContent }
      ],
      temperature: 0.2,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    })
  );
  const content = resp.choices?.[0]?.message?.content ?? '';
  console.log('✅ Resposta IA recebida (tamanho):', content.length);
  return content;
}

async function repairJsonWithAI(invalidContent) {
  console.log('🧩 Reparando JSON inválido com', MODEL_TEXT);
  const prompt = `
O conteúdo abaixo NÃO é JSON válido ou viola o schema. Conserte para JSON VÁLIDO e COMPLETE todas as chaves obrigatórias.

SCHEMA:
${JSON_SCHEMA_TEXT}

CONTEÚDO PARA REPARO (NÃO repita nada fora do JSON):
${invalidContent}

Responda SOMENTE com JSON válido.
`.trim();

  const resp = await withRetries(() =>
    openai.chat.completions.create({
      model: MODEL_TEXT,
      messages: [
        { role: "system", content: "Você conserta JSON para ficar estritamente válido segundo um schema. Responda apenas JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0,
      max_tokens: 3500,
      response_format: { type: "json_object" }
    })
  );
  return resp.choices?.[0]?.message?.content ?? '';
}

async function regenerateAnalysisWithAI(fullPrompt, minimal = false) {
  console.log('🔁 Regenerando análise com', MODEL_TEXT);
  const tighten = minimal
    ? 'Forneça texto objetivo e conciso em cada campo.'
    : 'Forneça justificativas clínicas robustas, diferenciais com % e plano terapêutico prático (inclua doses usuais).';
  const prompt = `
Refaça a resposta obedecendo ao SCHEMA e às DIRETRIZES. Responda SOMENTE com JSON.

DIRETRIZES:
- Terminologia médica, evidência clínica, objetividade.
- "confianca" entre 0 e 1.
- Sem texto fora do JSON.

SCHEMA:
${JSON_SCHEMA_TEXT}

CASO CLÍNICO:
${fullPrompt}

${tighten}
`.trim();

  const resp = await withRetries(() =>
    openai.chat.completions.create({
      model: MODEL_TEXT,
      messages: [
        { role: "system", content: "Você é IA médica; gere JSON estritamente válido conforme schema. Sem texto extra." },
        { role: "user", content: prompt }
      ],
      temperature: minimal ? 0.1 : 0.2,
      max_tokens: 3800,
      response_format: { type: "json_object" }
    })
  );
  return resp.choices?.[0]?.message?.content ?? '';
}

async function fillMissingCategoriesWithAI(partialObj, missingKeys) {
  console.log('🧩 Completando categorias faltantes com', MODEL_TEXT, '->', missingKeys);
  const prompt = `
Complete as categorias faltantes no objeto abaixo, obedecendo o SCHEMA e mantendo o estilo/nível de detalhe.
Retorne o OBJETO COMPLETO (todas as 7 categorias). Responda SOMENTE com JSON.

SCHEMA:
${JSON_SCHEMA_TEXT}

CATEGORIAS FALTANTES: ${missingKeys.join(', ')}

OBJETO PARCIAL:
${JSON.stringify(partialObj)}
`.trim();

  const resp = await withRetries(() =>
    openai.chat.completions.create({
      model: MODEL_TEXT,
      messages: [
        { role: "system", content: "Você completa JSONs médicos para aderir ao schema. Responda apenas JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 3500,
      response_format: { type: "json_object" }
    })
  );
  return resp.choices?.[0]?.message?.content ?? '';
}

// =====================
// Persistência
// =====================
const saveAnalysisResults = async (analysisId, aiAnalysis) => {
  console.log('💾 Salvando resultados da análise médica...');
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
  for (const [key, name] of Object.entries(categoryMapping)) {
    const cat = aiAnalysis[key];
    if (!cat || !cat.resultado) continue;

    const result = await AnalysisResult.create({
      category: name,
      result: String(cat.resultado),
      confidenceScore: clamp01(Number(cat.confianca ?? 0.75)),
      aiModel: `${MODEL_TEXT} (texto) + ${MODEL_VISION} (imagem)`,
      isCompleted: true,
      analysisId
    });

    savedResults.push(result);
    console.log(`✅ ${name}: ${Math.round(result.confidenceScore * 100)}% confiança`);
  }

  console.log(`💾 ${savedResults.length} resultados salvos`);
  return savedResults;
};

// =====================
// Utils
// =====================
const clamp01 = (n) => (Number.isFinite(n) ? Math.min(Math.max(n, 0), 1) : 0.75);

const calculateAge = (birthDate) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return `${age} anos`;
};

const tryParseJSON = (txt) => {
  if (!txt || typeof txt !== 'string') return null;
  try { return JSON.parse(txt); } catch { return null; }
};

// Retry simples com backoff exponencial + jitter para 429/5xx
async function withRetries(fn, { tries = 4, baseMs = 800 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err?.status || err?.code;
      const retriable = status === 429 || (typeof status === 'number' && status >= 500);
      if (!retriable || attempt === tries) throw err;
      const delay = Math.round(baseMs * Math.pow(2, attempt - 1) + Math.random() * 200);
      console.warn(`⏳ Retry ${attempt}/${tries - 1} em ${delay}ms (motivo: ${status})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

const validateOpenAIConfig = () => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error('❌ OPENAI_API_KEY não configurada no .env');
    return false;
  }
  if (!/^sk-/.test(key)) {
    console.error('❌ OPENAI_API_KEY inválida (deve começar com "sk-")');
    return false;
  }
  console.log('✅ OpenAI configurada');
  console.log('ℹ️ Modelos em uso:', { MODEL_TEXT, MODEL_VISION });
  return true;
};

// =====================
// Exports
// =====================
module.exports = {
  processWithAI,
  validateOpenAIConfig,
  testOpenAIConnection: async () => {
    try {
      if (!process.env.OPENAI_API_KEY) return false;
      const res = await withRetries(() =>
        openai.chat.completions.create({
          model: MODEL_TEXT,
          messages: [{ role: "user", content: "Responda apenas: OK" }],
          max_tokens: 5
        })
      );
      return (res.choices?.[0]?.message?.content || '').trim().startsWith('OK');
    } catch {
      return false;
    }
  }
};
