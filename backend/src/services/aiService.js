// backend/src/services/aiService.js
/* eslint-disable no-console */
console.log('[aiService] carregado - lazy OpenAI v2');

const { Analysis, AnalysisResult, MedicalImage, Patient } = require('../models');
const fs = require('fs');

// =====================
// Config de modelos
// =====================
const MODEL_TEXT   = process.env.OPENAI_TEXT_MODEL   || 'gpt-4o';
const MODEL_VISION = process.env.OPENAI_VISION_MODEL || MODEL_TEXT;

// =====================
// OpenAI (instanciação lazy, tolerante)
// =====================
let _openai; // singleton
function getOpenAI() {
  const key = (process.env.OPENAI_API_KEY || '').trim();
  if (!key) {
    // não deixe o SDK lançar: nós mesmos paramos aqui
    throw new Error('OPENAI_API_KEY ausente. Configure e tente novamente.');
  }
  if (!_openai) {
    // IMPORTA AQUI dentro (evita qualquer efeito colateral no require)
    const OpenAI = require('openai');
    _openai = new OpenAI({ apiKey: key });
  }
  return _openai;
}

/**
 * Conexão Realtime SEMPRE com cliente injetado.
 * Import dinâmico (ESM) para evitar side-effects no topo.
 * @param {object} options - opções do connect() do SDK (ex.: model, url, transport, etc)
 * @returns {Promise<any>} conexão/cliente retornado por connect()
 */
async function connectRealtime(options = {}) {
  const { connect } = await import('openai/beta/realtime/ws');
  return connect({
    client: getOpenAI(), // injeta o singleton configurado
    ...options,
  });
}

// =====================
// Schema obrigatório (inalterado)
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

Regras de estilo e conteúdo:
- Responda SOMENTE com JSON válido (sem texto extra).
- Campo "resultado" com markdown leve:
  • Subtítulos iniciando com "###"
  • Listas com bullets "•" ou listas numeradas "1."
  • NÃO usar asteriscos (*) nem hífens (-) como marcadores ou para ênfase; evite itálico/negrito com * ou _
- Sempre que possível, incluir: probabilidades estimadas (%), sinais de alarme (red flags), fatores de risco, rastros de evidência e CID-10.
- Em "diagnostico_principal.resultado", inclua obrigatoriamente a seção "### Características essenciais" com os achados-chave/criterios clínicos e laboratoriais que sustentam o diagnóstico.
- Em "abordagem_diagnostica": Diferenciais (3–6 com %), Exames prioritários (com motivo/impacto), Red flags, e critérios clínicos/escoras se houver.
- Em "abordagem_terapeutica": medidas não farmacológicas (curto/longo prazo), farmacológicas (classes, 1ª/2ª linha), doses usuais adultas e ajustes (renal/hepático/idoso), principais efeitos adversos e interações relevantes.
- Em "guia_prescricao": sintetize um regime possível com posologia clara (unidade e intervalo), duração típica, monitorização, e alternativas se alergia/contraindicação.
- "confianca": número entre 0 e 1 (0.00–1.00).
- Se dados forem insuficientes, explicite "Dados insuficientes" e oriente coleta/exames complementares.
`.trim();

// =====================
// Serviço principal
// =====================
const processWithAI = async (analysisId) => {
  try {
    const analysis = await Analysis.findByPk(analysisId, {
      include: [
        { model: Patient, as: 'Patient' },
        { model: AnalysisResult, as: 'AnalysisResults' },
        { model: MedicalImage, as: 'MedicalImages' }
      ]
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
// Prompt base (Aprimorado)
// =====================
const buildMedicalPrompt = (analysis) => {
  const patient = analysis.Patient;
  return `
SISTEMA DE APOIO DIAGNÓSTICO PARA MÉDICOS (PT-BR) — MODO DETALHADO E ESTRUTURADO
AVISO: Conteúdo destinado a profissionais. Não substitui o julgamento clínico.

PERFIL DO PACIENTE
• Nome: ${patient?.name || 'Paciente não identificado'}
• Idade: ${patient?.birthDate ? calculateAge(patient.birthDate) : 'Idade não informada'}
• Sexo: ${patient?.gender || 'Não informado'}
• História pregressa: ${patient?.medicalHistory || 'Não informada'}
• Alergias: ${patient?.allergies || 'Não informadas'}

CASO ATUAL
• Motivo/Contexto: ${analysis.title}
• História da doença atual: ${analysis.description || 'Não fornecida'}
• Sintomas/Achados: ${analysis.symptoms || 'Não fornecidos'}

DIRETRIZES DE QUALIDADE
• Linguagem técnica, objetiva e baseada em evidência.
• Quantificar incerteza: inclua probabilidades estimadas (%).
• Incorporar fatores de risco, red flags e CID-10 quando aplicável.
• Especificar impacto clínico dos exames sugeridos (o que confirma/afasta, muda conduta).
• Em farmacoterapia: cite classes, 1ª/2ª linha, doses adultas típicas, ajustes (renal/hepático/idoso), interações relevantes e eventos adversos centrais.
• Segurança: destaque condutas imediatas quando houver risco (ex.: sepse, SCA, AVC, hemorragia, obstrução biliar complicada).

FORMATAÇÃO (OBRIGATÓRIA)
• Responder APENAS com JSON válido conforme SCHEMA.
• Subtítulos com "###".
• Bullets com "•" ou listas numeradas "1.", "2.", ...
• NÃO usar asteriscos (*) nem hífens (-) como marcadores; evitar itálico/negrito com * ou _.
• No "diagnostico_principal.resultado" inclua explicitamente: "### Características essenciais" (critérios/achados clínicos e laboratoriais que sustentam o diagnóstico).

SCHEMA
${JSON_SCHEMA_TEXT}

RETORNE SOMENTE O JSON.
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
        if (!image.filePath || !fs.existsSync(image.filePath)) {
          console.warn(`Arquivo não encontrado: ${image.filePath}`);
          continue;
        }
        const imageBuffer = fs.readFileSync(image.filePath);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = image.mimeType || 'image/jpeg';

        const response = await withRetries(() =>
          getOpenAI().chat.completions.create({
            model: MODEL_VISION,
            messages: [
              {
                role: "system",
                content:
                  "Você é um especialista em interpretação de imagens médicas (dermatologia/dermatoscopia e radiologia). Produza laudo técnico, objetivo, com achados descritivos, diferenciais com probabilidade e recomendações claras. Formate com subtítulos '###' e bullets '•'. Não use * ou -."
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text:
`Gere LAUDO detalhado (sem * e -, use •):
• Técnica/qualidade da imagem
• Anatomia/região/lesão
• Achados descritivos (morfologia, distribuição, coloração/padrões)
• Hipóteses e diferenciais (3–6) com probabilidade estimada
• Recomendações de exames/complementos (com impacto clínico)
• Observações de segurança e sinais de alarme`
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
// Geração principal (com validação forte de JSON)
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

  // Sanitizar textos
  data = sanitizeAndBeautifyResults(data);

  return data;
};

// =====================
// Chamadas auxiliares à IA (com retry 429/5xx)
// =====================
async function callAIForJSON(userContent) {
  console.log('🧠 Solicitando JSON à IA com', MODEL_TEXT);
  const resp = await withRetries(() =>
    getOpenAI().chat.completions.create({
      model: MODEL_TEXT,
      messages: [
        {
          role: "system",
          content:
            "Você é um sistema de IA médica. Gere resposta APENAS em JSON estritamente válido conforme o schema. Linguagem técnica em PT-BR. Formate com '###' e bullets '•'. Proibido usar * e - como marcadores; evite itálico/negrito com * ou _."
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
O conteúdo abaixo NÃO é JSON válido ou viola o schema. Corrija para JSON VÁLIDO e COMPLETE todas as chaves obrigatórias.

SCHEMA:
${JSON_SCHEMA_TEXT}

CONTEÚDO PARA REPARO (NÃO inclua nada fora do JSON):
${invalidContent}

Regras adicionais de estilo:
- Subtítulos "###"
- Bullets "•" ou numeração "1."
- Não use * ou - como marcadores; evite ênfase com * ou _.

Responda SOMENTE com JSON válido.
`.trim();

  const resp = await withRetries(() =>
    getOpenAI().chat.completions.create({
      model: MODEL_TEXT,
      messages: [
        { role: "system", content: "Você repara JSONs para aderir estritamente ao schema. Responda apenas JSON. Sem * e -." },
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
  console.log('🔁 Regerando análise com', MODEL_TEXT);
  const tighten = minimal
    ? 'Forneça texto objetivo, conciso e clinicamente seguro em cada campo.'
    : 'Forneça justificativas robustas, diferenciais com %, CID-10 e plano terapêutico prático com doses usuais e ajustes.';
  const prompt = `
Refaça a resposta obedecendo ao SCHEMA e às DIRETRIZES. Responda SOMENTE com JSON.

DIRETRIZES:
• Terminologia médica baseada em evidência.
• "confianca" entre 0 e 1.
• Subtítulos "###"; bullets "•" ou numeração.
• Sem texto fora do JSON.
• Proibido asteriscos (*) e hífens (-) como marcadores; evite itálico/negrito com * ou _.
• "diagnostico_principal.resultado" DEVE incluir "### Características essenciais".

SCHEMA:
${JSON_SCHEMA_TEXT}

CASO CLÍNICO:
${fullPrompt}

${tighten}
`.trim();

  const resp = await withRetries(() =>
    getOpenAI().chat.completions.create({
      model: MODEL_TEXT,
      messages: [
        { role: "system", content: "Você é IA médica; gere JSON estritamente válido conforme schema. Sem texto extra. Sem * e -." },
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

Regras de estilo:
• Subtítulos "###"
• Bullets "•" ou listas numeradas
• Sem * e - como marcadores; evite ênfase com * ou _.
• Em "diagnostico_principal", inclua "### Características essenciais".

SCHEMA:
${JSON_SCHEMA_TEXT}

CATEGORIAS FALTANTES: ${missingKeys.join(', ')}

OBJETO PARCIAL:
${JSON.stringify(partialObj)}
`.trim();

  const resp = await withRetries(() =>
    getOpenAI().chat.completions.create({
      model: MODEL_TEXT,
      messages: [
        { role: "system", content: "Você completa JSONs médicos para aderir ao schema. Responda apenas JSON, sem * e -." },
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
// Utils (formatação/limpeza)
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

function beautifyResultado(txt) {
  if (!txt) return txt;
  let s = String(txt);
  s = s.replace(/\*\*(.*?)\*\*/g, '$1');
  s = s.replace(/\*(.*?)\*/g, '$1');
  s = s.replace(/^[ \t]*[-*][ \t]+/gm, '• ');
  s = s.replace(/^[ \t]*[-*][ \t]*\[(?: |x|X)\][ \t]*/gm, '• ');
  s = s.replace(/^\s*-{3,}\s*$/gm, '');
  s = s.replace(/^(### .+)(\n)(?!\n)/gm, '$1\n');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

function sanitizeAndBeautifyResults(data) {
  for (const key of REQUIRED_CATEGORIES) {
    if (data[key]) {
      if (typeof data[key].resultado === 'string') {
        data[key].resultado = beautifyResultado(data[key].resultado);
      }
      if (typeof data[key].justificativa === 'string') {
        data[key].justificativa = beautifyResultado(data[key].justificativa);
      }
    }
  }
  return data;
}

// Retry simples com backoff
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
  if (!/^sk-/.test(key) && !/^sk-proj-/.test(key)) {
    console.error('❌ OPENAI_API_KEY inválida (deve começar com "sk-" ou "sk-proj-")');
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
  // públicos
  processWithAI,
  validateOpenAIConfig,
  testOpenAIConnection: async () => {
    try {
      if (!process.env.OPENAI_API_KEY) return false;
      const res = await withRetries(() =>
        getOpenAI().chat.completions.create({
          model: MODEL_TEXT,
          messages: [{ role: "user", content: "Responda apenas: OK" }],
          max_tokens: 5
        })
      );
      return (res.choices?.[0]?.message?.content || '').trim().startsWith('OK');
    } catch {
      return false;
    }
  },

  // novos helpers para evitar erros de cliente implícito
  getOpenAIClient: () => getOpenAI(),
  connectRealtime, // para qualquer uso do beta/realtime
};
