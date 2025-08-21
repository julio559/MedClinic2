const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const db = require('./models');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static('uploads'));

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const patientRoutes = require('./routes/patients');
const analysisRoutes = require('./routes/analysis');
const subscriptionRoutes = require('./routes/subscriptions');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Medical AI Backend funcionando!',
    database: 'MySQL conectado'
  });
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('👨‍⚕️ Doctor connected:', socket.id);
  socket.on('join_doctor_room', (doctorId) => {
    socket.join(`doctor_${doctorId}`);
  });
});

const PORT = process.env.PORT || 3001;

db.sequelize.sync({ force: false }).then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server rodando na porta ${PORT}`);
    console.log(`🗄️ MySQL conectado: ${process.env.DB_NAME}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
  });
}).catch(error => {
  console.error('❌ Erro MySQL:', error.message);
});

// Export para outros arquivos
global.socketIO = io;
module.exports = app;
