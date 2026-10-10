// Configuração da aplicação Express (sem arrancar o servidor, para facilitar testes)
const path = require('path');
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Só a origem configurada para a SPA pode fazer pedidos através do browser.
app.use(cors({
  origin(origem, callback) {
    callback(null, !origem || origem === CLIENT_URL);
  }
}));
// Limita o tamanho dos pedidos JSON para evitar corpos excessivamente grandes.
app.use(express.json({ limit: '1mb' }));

// Em produção, o proxy da plataforma comunica o protocolo original neste cabeçalho.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  app.use((req, res, next) => {
    if (req.secure) return next();
    return res.redirect(308, `https://${req.get('host')}${req.originalUrl}`);
  });
}

// Em desenvolvimento, as imagens ficam disponíveis a partir de api/uploads/.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Passo 5: documentação OpenAPI em /api-docs
const openapi = YAML.load(path.join(__dirname, '..', 'openapi.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi));

app.get('/api/health', (req, res) => res.json({ estado: 'ok' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/producers', require('./routes/producers'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/auctions', require('./routes/auctions'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/admin', require('./routes/admin'));

app.use((req, res) => res.status(404).json({ erro: 'Recurso não encontrado' }));
app.use(errorHandler);

module.exports = app;
