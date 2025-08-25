const jwt = require('jsonwebtoken');
const { User } = require('../models');

module.exports = async function authenticate(req, res, next) {
  try {
    const auth = req.header('Authorization') || '';
    const [scheme, token] = auth.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    if (!process.env.JWT_SECRET) {
      console.error('✖ JWT_SECRET ausente no ambiente');
      return res.status(500).json({ error: 'Configuração do servidor ausente (JWT_SECRET)' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded?.userId;
    if (!userId) return res.status(401).json({ error: 'Token inválido' });

    const user = await User.findByPk(userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Usuário inválido' });
    }

    req.userId = user.id;
    next();
  } catch (error) {
    console.error('Auth middleware error:', { name: error?.name, message: error?.message });
    return res.status(401).json({ error: 'Token inválido' });
  }
};
