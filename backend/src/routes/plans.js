const express = require('express');
const { Subscription } = require('../models');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Definir planos disponíveis (pode vir do banco depois)
const availablePlans = [
  {
    id: 'trial',
    name: 'Teste Grátis',
    price: 0,
    currency: 'BRL',
    duration: { type: 'days', value: 7 },
    analysisLimit: 3,
    features: ['3 análises', '7 dias de teste', 'Suporte básico'],
    isPopular: false
  },
  {
    id: 'monthly',
    name: 'Mensal',
    price: 39.90,
    currency: 'BRL',
    duration: { type: 'months', value: 1 },
    analysisLimit: 50,
    features: ['50 análises/mês', 'Suporte prioritário', 'Histórico completo', 'Exportar relatórios'],
    isPopular: false
  },
  {
    id: 'quarterly',
    name: 'Trimestral',
    price: 99.90,
    currency: 'BRL',
    duration: { type: 'months', value: 3 },
    analysisLimit: 200,
    features: ['200 análises/trimestre', 'Suporte prioritário', 'Histórico completo', 'Exportar relatórios', '17% de desconto'],
    isPopular: true
  },
  {
    id: 'annual',
    name: 'Anual',
    price: 359.90,
    currency: 'BRL',
    duration: { type: 'months', value: 12 },
    analysisLimit: 1000,
    features: ['1000 análises/ano', 'Suporte VIP', 'Histórico ilimitado', 'Exportar relatórios', 'API dedicada', '25% de desconto'],
    isPopular: false
  }
];

// Função para calcular data de expiração
const calculateEndDate = (plan) => {
  const now = new Date();
  const { type, value } = plan.duration;
  
  if (type === 'days') {
    now.setDate(now.getDate() + value);
  } else if (type === 'months') {
    now.setMonth(now.getMonth() + value);
  } else if (type === 'years') {
    now.setFullYear(now.getFullYear() + value);
  }
  
  return now;
};

// GET /api/plans - Listar todos os planos disponíveis
router.get('/', (req, res) => {
  try {
    res.json({
      success: true,
      plans: availablePlans
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/plans/:planId - Obter detalhes de um plano específico
router.get('/:planId', (req, res) => {
  try {
    const { planId } = req.params;
    const plan = availablePlans.find(p => p.id === planId);
    
    if (!plan) {
      return res.status(404).json({ error: 'Plano não encontrado' });
    }
    
    res.json({
      success: true,
      plan
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/plans/upgrade - Fazer upgrade de plano
router.post('/upgrade', authenticate, async (req, res) => {
  try {
    const { plan: planId } = req.body;
    const userId = req.user.userId;
    
    // Validar se o plano existe
    const selectedPlan = availablePlans.find(p => p.id === planId);
    if (!selectedPlan) {
      return res.status(400).json({ error: 'Plano inválido' });
    }
    
    // Buscar assinatura atual do usuário
    let subscription = await Subscription.findOne({
      where: { userId }
    });
    
    if (!subscription) {
      // Criar nova assinatura se não existir
      subscription = await Subscription.create({
        userId,
        plan: planId,
        status: 'active',
        startDate: new Date(),
        endDate: calculateEndDate(selectedPlan),
        analysisLimit: selectedPlan.analysisLimit,
        analysisUsed: 0
      });
    } else {
      // Atualizar assinatura existente
      const endDate = calculateEndDate(selectedPlan);
      
      await subscription.update({
        plan: planId,
        status: 'active',
        endDate,
        analysisLimit: selectedPlan.analysisLimit,
        // Resetar análises usadas apenas se for upgrade
        analysisUsed: selectedPlan.analysisLimit > subscription.analysisLimit ? 0 : subscription.analysisUsed
      });
    }
    
    // Log da alteração (opcional)
    console.log(`🔄 User ${userId} upgraded to plan: ${planId}`);
    
    res.json({
      success: true,
      message: 'Plano atualizado com sucesso',
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        analysisLimit: subscription.analysisLimit,
        analysisUsed: subscription.analysisUsed
      }
    });
    
  } catch (error) {
    console.error('Error upgrading plan:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/plans/cancel - Cancelar assinatura
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const subscription = await Subscription.findOne({
      where: { userId }
    });
    
    if (!subscription) {
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }
    
    // Cancelar assinatura (mas manter ativa até o fim do período)
    await subscription.update({
      status: 'cancelled'
    });
    
    console.log(`❌ User ${userId} cancelled subscription`);
    
    res.json({
      success: true,
      message: 'Assinatura cancelada com sucesso',
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        endDate: subscription.endDate
      }
    });
    
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/plans/usage/:userId - Obter uso atual do plano (admin only)
router.get('/usage/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verificar se o usuário pode acessar esses dados
    if (req.user.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const subscription = await Subscription.findOne({
      where: { userId }
    });
    
    if (!subscription) {
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }
    
    const plan = availablePlans.find(p => p.id === subscription.plan);
    
    res.json({
      success: true,
      usage: {
        plan: subscription.plan,
        planName: plan?.name || 'Desconhecido',
        analysisUsed: subscription.analysisUsed,
        analysisLimit: subscription.analysisLimit,
        usagePercentage: Math.round((subscription.analysisUsed / subscription.analysisLimit) * 100),
        status: subscription.status,
        endDate: subscription.endDate,
        daysRemaining: Math.max(0, Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
      }
    });
    
  } catch (error) {
    console.error('Error getting plan usage:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/plans/simulate-payment - Simular pagamento (para testes)
router.post('/simulate-payment', authenticate, async (req, res) => {
  try {
    const { planId, paymentMethod = 'credit_card' } = req.body;
    const userId = req.user.userId;
    
    const selectedPlan = availablePlans.find(p => p.id === planId);
    if (!selectedPlan) {
      return res.status(400).json({ error: 'Plano inválido' });
    }
    
    // Simular processamento de pagamento
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simular 95% de sucesso
    const paymentSuccess = Math.random() < 0.95;
    
    if (!paymentSuccess) {
      return res.status(400).json({ 
        error: 'Pagamento recusado. Tente novamente ou use outro método de pagamento.' 
      });
    }
    
    // Atualizar/criar assinatura
    let subscription = await Subscription.findOne({ where: { userId } });
    
    if (!subscription) {
      subscription = await Subscription.create({
        userId,
        plan: planId,
        status: 'active',
        startDate: new Date(),
        endDate: calculateEndDate(selectedPlan),
        analysisLimit: selectedPlan.analysisLimit,
        analysisUsed: 0
      });
    } else {
      await subscription.update({
        plan: planId,
        status: 'active',
        endDate: calculateEndDate(selectedPlan),
        analysisLimit: selectedPlan.analysisLimit,
        analysisUsed: 0
      });
    }
    
    res.json({
      success: true,
      message: 'Pagamento processado com sucesso!',
      payment: {
        id: `pay_${Date.now()}`,
        amount: selectedPlan.price,
        currency: selectedPlan.currency,
        method: paymentMethod,
        status: 'completed',
        planId: planId,
        planName: selectedPlan.name
      },
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        endDate: subscription.endDate,
        analysisLimit: subscription.analysisLimit,
        analysisUsed: subscription.analysisUsed
      }
    });
    
  } catch (error) {
    console.error('Error simulating payment:', error);
    res.status(500).json({ error: 'Erro no processamento do pagamento' });
  }
});

module.exports = router;