const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const db = require('./models');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

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

// Função para testar importação de rota
function testRoute(routeName, routePath) {
  try {
    const route = require(routePath);
    console.log(`✅ ${routeName} routes carregadas - Tipo:`, typeof route);
    
    // Verificar se é um router válido
    if (typeof route === 'function' || (route && typeof route.use === 'function')) {
      return route;
    } else {
      console.error(`❌ ${routeName} não é um router válido:`, Object.keys(route || {}));
      return null;
    }
  } catch (error) {
    console.error(`❌ Erro ao carregar ${routeName} routes:`, error.message);
    return null;
  }
}

// Testar cada rota individualmente
console.log('🔍 Testando importação de rotas...');

const authRoutes = testRoute('Auth', './routes/auth');
const userRoutes = testRoute('User', './routes/users');
const patientRoutes = testRoute('Patient', './routes/patients');
const analysisRoutes = testRoute('Analysis', './routes/analysis');
const subscriptionRoutes = testRoute('Subscription', './routes/subscriptions');

// Configurar rotas apenas se foram carregadas com sucesso
console.log('🔗 Configurando rotas...');

if (authRoutes) {
  try {
    app.use('/api/auth', authRoutes);
    console.log('✅ Auth routes configuradas');
  } catch (error) {
    console.error('❌ Erro ao configurar auth routes:', error.message);
  }
}

if (userRoutes) {
  try {
    app.use('/api/users', userRoutes);
    console.log('✅ User routes configuradas');
  } catch (error) {
    console.error('❌ Erro ao configurar user routes:', error.message);
  }
}

if (patientRoutes) {
  try {
    app.use('/api/patients', patientRoutes);
    console.log('✅ Patient routes configuradas');
  } catch (error) {
    console.error('❌ Erro ao configurar patient routes:', error.message);
  }
}

if (analysisRoutes) {
  try {
    app.use('/api/analysis', analysisRoutes);
    console.log('✅ Analysis routes configuradas');
  } catch (error) {
    console.error('❌ Erro ao configurar analysis routes:', error.message);
  }
}

if (subscriptionRoutes) {
  try {
    app.use('/api/subscriptions', subscriptionRoutes);
    console.log('✅ Subscription routes configuradas');
  } catch (error) {
    console.error('❌ Erro ao configurar subscription routes:', error.message);
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Medical AI Backend funcionando!',
    database: 'MySQL conectado',
    openai: process.env.OPENAI_API_KEY ? 'Configurada' : 'Não configurada',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    routes: {
      auth: !!authRoutes,
      users: !!userRoutes,
      patients: !!patientRoutes,
      analysis: !!analysisRoutes,
      subscriptions: !!subscriptionRoutes
    }
  });
});

// Rota de teste
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Servidor funcionando!',
    timestamp: new Date().toISOString()
  });
});

// Middleware de tratamento de erro global
app.use((error, req, res, next) => {
  console.error('❌ Erro global:', error);
  
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Rota não encontrada',
    path: req.originalUrl 
  });
});

// Socket.IO para notificações em tempo real
io.on('connection', (socket) => {
  console.log('👨‍⚕️ Doctor connected:', socket.id);
  
  socket.on('join_doctor_room', (doctorId) => {
    socket.join(`doctor_${doctorId}`);
    console.log(`👨‍⚕️ Doctor ${doctorId} joined room`);
  });
  
  socket.on('disconnect', () => {
    console.log('👨‍⚕️ Doctor disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

// Inicializar servidor
db.sequelize.sync({ force: false }).then(() => {
  server.listen(PORT, () => {
    console.log('=====================================');
    console.log('🚀 Server rodando na porta', PORT);
    console.log('🗄️ MySQL conectado:', process.env.DB_NAME);
    console.log('🤖 OpenAI:', process.env.OPENAI_API_KEY ? '✅ Configurada' : '❌ Não configurada');
    console.log('📊 Health check: http://localhost:' + PORT + '/health');
    console.log('🧪 Test: http://localhost:' + PORT + '/test');
    console.log('📁 Upload dir:', uploadDir);
    console.log('🔗 Socket.IO: Habilitado');
    console.log('=====================================');
  });
}).catch(error => {
  console.error('❌ Erro ao conectar MySQL:', error.message);
  console.error('Verifique suas configurações de banco no arquivo .env');
  process.exit(1);
});

// Exportar socketIO para uso em outros módulos
global.socketIO = io;

module.exports = app;