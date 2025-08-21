// src/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer'); // <- necessário para o middleware global de erro
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const db = require('./models');
const { validateOpenAIConfig, testOpenAIConnection } = require('./services/aiService');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Disponibiliza o IO globalmente (para uso no aiService, etc.)
global.socketIO = io;

// Verificar e criar diretório de uploads
const uploadDir = path.join(__dirname, 'uploads/medical-images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📁 Diretório de uploads criado:', uploadDir);
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir arquivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Importar rotas
console.log('🔍 Carregando rotas...');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const patientRoutes = require('./routes/patients');
const analysisRoutes = require('./routes/analysis');
const subscriptionRoutes = require('./routes/subscriptions');
const plansRoutes = require('./routes/plans');

// Configurar rotas
console.log('🔗 Configurando rotas...');
app.use('/api/auth', authRoutes);
console.log('✅ Auth routes configuradas');

app.use('/api/users', userRoutes);
console.log('✅ User routes configuradas');

app.use('/api/patients', patientRoutes);
console.log('✅ Patient routes configuradas');

app.use('/api/analysis', analysisRoutes);
console.log('✅ Analysis routes configuradas');

app.use('/api/subscriptions', subscriptionRoutes);
console.log('✅ Subscription routes configuradas');

app.use('/api/plans', plansRoutes);
console.log('✅ Plans routes configuradas');

// Health check
app.get('/health', async (req, res) => {
  const openaiConfigured = validateOpenAIConfig();
  let openaiConnection = false;
  
  if (openaiConfigured) {
    openaiConnection = await testOpenAIConnection();
  }

  res.json({ 
    status: 'OK', 
    message: 'Medical AI Backend funcionando!',
    database: 'MySQL conectado',
    openai: {
      configured: openaiConfigured,
      connection: openaiConnection,
      status: openaiConfigured && openaiConnection ? 'Funcionando' : 'Configuração necessária'
    },
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users', 
      patients: '/api/patients',
      analysis: '/api/analysis',
      subscriptions: '/api/subscriptions',
      plans: '/api/plans'
    }
  });
});

// Rota de teste da OpenAI
app.get('/test-openai', async (req, res) => {
  try {
    const configured = validateOpenAIConfig();
    if (!configured) {
      return res.status(400).json({
        error: 'OpenAI não configurada',
        message: 'Configure OPENAI_API_KEY no arquivo .env'
      });
    }

    const connected = await testOpenAIConnection();
    if (!connected) {
      return res.status(500).json({
        error: 'Falha na conexão com OpenAI',
        message: 'Verifique se a chave da API está correta e ativa'
      });
    }

    res.json({
      success: true,
      message: 'OpenAI configurada e funcionando!',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro ao testar OpenAI',
      details: error.message
    });
  }
});

// Rota de teste simples
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Servidor funcionando!',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /health - Status do sistema',
      'GET /test-openai - Testar configuração OpenAI',
      'POST /api/auth/login - Login',
      'POST /api/auth/register - Registro',
      'GET /api/patients - Listar pacientes',
      'POST /api/analysis - Criar análise',
      'GET /api/analysis - Listar análises'
    ]
  });
});

// Middleware de tratamento de erro global
app.use((error, req, res, next) => {
  console.error('❌ Erro global:', error);
  
  // Erro de upload de arquivo (multer)
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'Arquivo muito grande',
        message: 'O arquivo deve ter no máximo 50MB'
      });
    }
    return res.status(400).json({ 
      error: 'Erro no upload',
      message: error.message
    });
  }
  
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Rota não encontrada',
    path: req.originalUrl,
    availableEndpoints: [
      'GET /health',
      'GET /test-openai', 
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/patients',
      'POST /api/analysis',
      'GET /api/analysis'
    ]
  });
});

// Socket.IO para notificações em tempo real
io.on('connection', (socket) => {
  console.log('👨‍⚕️ Doctor connected:', socket.id);
  
  // Front deve emitir: socket.emit('join_doctor_room', doctorId)
  socket.on('join_doctor_room', (doctorId) => {
    if (doctorId) {
      socket.join(`doctor_${doctorId}`);
      console.log(`👨‍⚕️ Doctor ${doctorId} joined room`);
    } else {
      console.warn('join_doctor_room sem doctorId');
    }
  });
  
  socket.on('disconnect', () => {
    console.log('👨‍⚕️ Doctor disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

// Inicializar servidor
db.sequelize.sync({ force: false }).then(async () => {
  // Testar configuração da OpenAI na inicialização
  console.log('🔍 Verificando configuração da OpenAI...');
  const openaiConfigured = validateOpenAIConfig();
  
  if (openaiConfigured) {
    const openaiConnected = await testOpenAIConnection();
    if (openaiConnected) {
      console.log('✅ OpenAI totalmente funcional');
    } else {
      console.log('⚠️  OpenAI configurada mas com problemas de conexão');
    }
  } else {
    console.log('⚠️  OpenAI não configurada - sistema funcionará em modo limitado');
    console.log('💡 Para usar IA real, adicione OPENAI_API_KEY no arquivo .env');
  }

  server.listen(PORT, () => {
    console.log('=====================================');
    console.log('🚀 Server rodando na porta', PORT);
    console.log('🗄️ MySQL conectado:', process.env.DB_NAME);
    console.log('🤖 OpenAI:', openaiConfigured ? '✅ Configurada' : '❌ Não configurada');
    console.log('📊 Health check: http://localhost:' + PORT + '/health');
    console.log('🧪 Test OpenAI: http://localhost:' + PORT + '/test-openai');
    console.log('🧪 Test: http://localhost:' + PORT + '/test');
    console.log('📁 Upload dir:', uploadDir);
    console.log('🔗 Socket.IO: Habilitado');
    console.log('=====================================\n');

    console.log('📋 Endpoints disponíveis:');
    console.log('  Auth:');
    console.log('    POST /api/auth/login');
    console.log('    POST /api/auth/register');
    console.log('  Patients:');
    console.log('    GET /api/patients');
    console.log('    POST /api/patients');
    console.log('  Analysis:');
    console.log('    GET /api/analysis');
    console.log('    POST /api/analysis');
    console.log('    GET /api/analysis/:id/results');
    console.log('    GET /api/analysis/:id/status');
    console.log('    POST /api/analysis/:id/reprocess');
    console.log('  Subscriptions:');
    console.log('    GET /api/subscriptions');
    console.log('    POST /api/subscriptions/upgrade');
    console.log('  Plans:');
    console.log('    GET /api/plans');
    console.log('=====================================\n');
  });
}).catch(error => {
  console.error('❌ Erro ao conectar MySQL:', error.message);
  console.error('Verifique suas configurações de banco no arquivo .env');
  process.exit(1);
});

module.exports = app;
