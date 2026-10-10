// Confirma na base de dados que a conta do produtor já foi aprovada.
const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    const utilizador = await User.findById(req.user.id).select('papel produtor.validado');

    if (!utilizador?.produtor?.validado) {
      return res.status(403).json({
        erro: 'A conta de produtor ainda aguarda validação do administrador'
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};
