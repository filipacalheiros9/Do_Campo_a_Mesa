// Encomendas
const router = require('express').Router();
const { isValidObjectId } = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Review = require('../models/Review');
const auth = require('../middleware/auth');
const a = require('../utils/async');
const erro = require('../utils/erro');
const { metodoValido, criarPagamentoPago } = require('../services/pagamentos');

// Valida as linhas recebidas e junta quantidades repetidas do mesmo produto.
function validarLinhas(linhas) {
  if (!Array.isArray(linhas) || linhas.length === 0) {
    throw erro(400, 'A encomenda deve ter pelo menos uma linha');
  }

  // O Map impede que o mesmo produto seja reservado várias vezes em separado.
  const quantidades = new Map();
  linhas.forEach((linha) => {
    const produtoId = linha?.produto?._id || linha?.produto;
    const quantidade = Number(linha?.quantidade);

    if (!isValidObjectId(produtoId)) {
      throw erro(400, 'Uma linha contém um produto inválido');
    }
    if (!Number.isInteger(quantidade) || quantidade < 1) {
      throw erro(400, 'A quantidade de cada linha deve ser um número inteiro positivo');
    }

    const id = String(produtoId);
    quantidades.set(id, (quantidades.get(id) || 0) + quantidade);
  });

  return [...quantidades].map(([produto, quantidade]) => ({ produto, quantidade }));
}

// Compensa as alterações já feitas quando a encomenda não pode ser concluída.
async function reporStock(reservas) {
  await Promise.all(reservas.map(({ produto, quantidade }) =>
    Product.updateOne({ _id: produto._id }, { $inc: { stock: quantidade } })
  ));
}

// POST /api/orders  (comprador)  -> 201
router.post('/', auth('comprador'), a(async (req, res) => {
  const linhasPedidas = validarLinhas(req.body?.linhas);
  const metodoPagamento = req.body?.pagamento?.metodo;
  if (!metodoValido(metodoPagamento)) {
    throw erro(400, 'Escolha cartão ou MB WAY como método de pagamento');
  }
  const entregaRecebida = req.body?.entrega;
  // Só estes campos do objeto de entrega podem chegar ao modelo.
  const entrega = entregaRecebida ? {
    tipo: entregaRecebida.tipo,
    morada: entregaRecebida.morada
  } : undefined;

  // Os dados comerciais são sempre lidos da BD; não se confia no preço enviado pelo cliente.
  const produtos = await Product.find({ _id: { $in: linhasPedidas.map((l) => l.produto) } });

  if (produtos.length !== linhasPedidas.length) {
    throw erro(404, 'Um dos produtos não foi encontrado');
  }

  const produtores = new Set(produtos.map((produto) => produto.produtor.toString()));
  // O modelo guarda um produtor por encomenda, por isso não aceita linhas misturadas.
  if (produtores.size !== 1) {
    throw erro(400, 'Cada encomenda deve conter produtos de um único produtor');
  }

  const reservas = [];
  try {
    for (const linha of linhasPedidas) {
      // A condição e o desconto são uma única operação atómica no MongoDB.
      const produto = await Product.findOneAndUpdate(
        { _id: linha.produto, stock: { $gte: linha.quantidade } },
        { $inc: { stock: -linha.quantidade } },
        { new: true }
      );

      if (!produto) {
        // Distingue um produto inexistente de um produto existente sem stock suficiente.
        const existe = await Product.exists({ _id: linha.produto });
        if (!existe) throw erro(404, 'Um dos produtos não foi encontrado');
        throw erro(409, 'Stock insuficiente para um dos produtos');
      }

      reservas.push({ produto, quantidade: linha.quantidade });
    }

    const encomenda = await Order.create({
      // O comprador vem do token JWT e nunca do corpo do pedido.
      comprador: req.user.id,
      produtor: produtos[0].produtor,
      // Guarda uma fotografia dos dados comerciais, mesmo que o produto mude depois.
      linhas: reservas.map(({ produto, quantidade }) => ({
        produto: produto._id,
        nome: produto.nome,
        precoUnit: produto.preco,
        unidade: produto.unidade,
        quantidade
      })),
      entrega,
      // O valor pago é sempre o virtual `total`, calculado a partir dos preços
      // lidos da BD. O cliente só escolhe o método da simulação.
      pagamento: criarPagamentoPago(metodoPagamento)
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${encomenda.produtor}`).emit('nova-encomenda', {
        id: encomenda._id,
        total: encomenda.total,
        comprador: req.user.nome
      });
    }

    // Location permite ao cliente saber o endereço do recurso acabado de criar.
    res.location(`/api/orders/${encomenda.id}`).status(201).json(encomenda);
  } catch (err) {
    try {
      // Anula todas as reservas feitas antes da operação que falhou.
      await reporStock(reservas);
    } catch (erroReposicao) {
      erroReposicao.cause = err;
      throw erroReposicao;
    }
    throw err;
  }
}));

// POST /api/orders/:id/pagamento (comprador) -> pagar uma encomenda de leilão
// ou outra encomenda que ainda esteja por pagar. A condição no update torna a
// operação idempotente perante dois cliques concorrentes.
router.post('/:id/pagamento', auth('comprador'), a(async (req, res) => {
  const metodo = req.body?.metodo;
  if (!metodoValido(metodo)) {
    throw erro(400, 'Escolha cartão ou MB WAY como método de pagamento');
  }

  const pagamento = criarPagamentoPago(metodo);
  const encomenda = await Order.findOneAndUpdate(
    {
      _id: req.params.id,
      comprador: req.user.id,
      'pagamento.estado': { $ne: 'pago' }
    },
    { $set: { pagamento } },
    { new: true, runValidators: true }
  )
    .populate('comprador', 'nome email')
    .populate('produtor', 'nome produtor.nomeExploracao produtor.localidade');

  if (!encomenda) {
    const existente = await Order.findById(req.params.id).select('comprador pagamento.estado');
    if (!existente) throw erro(404, 'Encomenda não encontrada');
    if (String(existente.comprador) !== String(req.user.id)) {
      throw erro(403, 'Sem acesso a esta encomenda');
    }
    throw erro(409, 'A encomenda já está paga');
  }

  const io = req.app.get('io');
  if (io) {
    const evento = {
      id: encomenda._id,
      estado: encomenda.pagamento.estado,
      metodo: encomenda.pagamento.metodo,
      referencia: encomenda.pagamento.referencia,
      total: encomenda.total
    };
    const produtorId = encomenda.produtor?._id || encomenda.produtor;
    io.to(`user:${req.user.id}`).emit('pagamento-confirmado', evento);
    io.to(`user:${produtorId}`).emit('pagamento-confirmado', evento);
  }

  res.json(encomenda);
}));

// GET /api/orders  -> 200 [encomendas do utilizador: como comprador ou como produtor]
router.get('/', auth('comprador', 'produtor'), a(async (req, res) => {
  // O mesmo endpoint aplica o filtro adequado ao papel guardado no JWT.
  const filtro = req.user.papel === 'comprador'
    ? { comprador: req.user.id }
    : { produtor: req.user.id };

  const encomendas = await Order.find(filtro)
    .sort({ createdAt: -1 })
    .populate('comprador', 'nome email')
    .populate('produtor', 'nome produtor.nomeExploracao produtor.localidade');

  if (req.user.papel !== 'comprador') return res.json(encomendas);

  const avaliacoes = await Review.find({ autor: req.user.id }).select('encomenda produto');
  const avaliacoesPorEncomenda = new Map();
  avaliacoes.forEach((avaliacao) => {
    const encomendaId = String(avaliacao.encomenda);
    const estado = avaliacoesPorEncomenda.get(encomendaId) || {
      produtor: false,
      produtos: new Set()
    };
    if (avaliacao.produto) estado.produtos.add(String(avaliacao.produto));
    else estado.produtor = true;
    avaliacoesPorEncomenda.set(encomendaId, estado);
  });

  res.json(encomendas.map((encomenda) => {
    const dados = encomenda.toObject({ virtuals: true });
    const estadoAvaliacoes = avaliacoesPorEncomenda.get(String(encomenda._id));
    return {
      ...dados,
      avaliacoes: {
        produtor: estadoAvaliacoes?.produtor || false,
        produtos: [...(estadoAvaliacoes?.produtos || [])]
      }
    };
  }));
}));

// GET /api/orders/:id  -> 200 | 404
router.get('/:id', auth('comprador', 'produtor'), a(async (req, res) => {
  const encomenda = await Order.findById(req.params.id)
    .populate('comprador', 'nome email')
    .populate('produtor', 'nome produtor.nomeExploracao produtor.localidade');
  if (!encomenda) throw erro(404, 'Encomenda não encontrada');

  const compradorId = encomenda.comprador?._id || encomenda.comprador;
  const produtorId = encomenda.produtor?._id || encomenda.produtor;
  const pertenceAoUtilizador = req.user.papel === 'comprador'
    ? String(compradorId) === String(req.user.id)
    : String(produtorId) === String(req.user.id);
  if (!pertenceAoUtilizador) throw erro(403, 'Sem acesso a esta encomenda');

  res.json(encomenda);
}));

// PATCH /api/orders/:id/estado  (produtor)  -> 200
router.patch('/:id/estado', auth('produtor'), a(async (req, res) => {
  const novoEstado = req.body?.estado;
  if (!Order.ESTADOS.includes(novoEstado)) {
    throw erro(400, 'Estado de encomenda inválido');
  }

  const encomenda = await Order.findById(req.params.id);
  if (!encomenda) throw erro(404, 'Encomenda não encontrada');
  if (encomenda.produtor.toString() !== String(req.user.id)) {
    throw erro(403, 'Só o produtor destinatário pode alterar esta encomenda');
  }
  if (encomenda.pagamento?.estado !== 'pago') {
    throw erro(409, 'A encomenda ainda não foi paga');
  }

  const estadoSeguinte = encomenda.estadoSeguinte();

  // Só é aceite a passagem para o estado imediatamente seguinte.
  if (!encomenda.podeTransitarPara(novoEstado)) {
    throw erro(409, estadoSeguinte
      ? `A encomenda só pode passar de ${encomenda.estado} para ${estadoSeguinte}`
      : 'A encomenda já está entregue');
  }

  // A condição pelo estado evita duas alterações concorrentes sobre a mesma versão.
  const atualizada = await Order.findOneAndUpdate(
    { _id: encomenda._id, estado: encomenda.estado },
    { $set: { estado: novoEstado } },
    { new: true, runValidators: true }
  )
    .populate('comprador', 'nome email')
    .populate('produtor', 'nome produtor.nomeExploracao produtor.localidade');

  if (!atualizada) {
    throw erro(409, 'O estado foi alterado por outro pedido; atualize e tente novamente');
  }

  // Avisa o comprador em tempo real quando o servidor tem Socket.IO ativo.
  const io = req.app.get('io');
  if (io) {
    const compradorId = atualizada.comprador?._id || atualizada.comprador;
    io.to(`user:${compradorId}`).emit('encomenda-atualizada', {
      id: atualizada._id,
      estado: atualizada.estado,
      produtor: atualizada.produtor?.nome
    });
  }

  res.json(atualizada);
}));

module.exports = router;
