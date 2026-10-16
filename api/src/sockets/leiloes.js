// Passo 7: leilões em tempo real
// Eventos do cliente:   'entrar' (leilaoId), 'sair' (leilaoId), 'licitar' ({ leilaoId, valor })
// Eventos do servidor:  'estado' (leilão), 'presenca' (n.º), 'nova-licitacao', 'recusada' (mensagem)
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const { isValidObjectId } = require('mongoose');

const sala = (leilaoId) => `leilao:${leilaoId}`;
const cent = (valor) => Math.round(valor * 100) / 100;

function emitirPresenca(io, leilaoId) {
  const n = io.sockets.adapter.rooms.get(sala(leilaoId))?.size ?? 0;
  io.to(sala(leilaoId)).emit('presenca', n);
}

module.exports = (io, socket) => {
  socket.on('entrar', async (leilaoId) => {
    if (!isValidObjectId(leilaoId)) {
      return socket.emit('recusada', 'Leilão inválido');
    }

    try {
      const leilao = await Auction.findById(leilaoId)
        .populate('produtor', 'nome produtor.nomeExploracao produtor.localidade')
        .populate('produto', 'nome unidade imagemUrl');
      if (!leilao) return socket.emit('recusada', 'Leilão não encontrado');

      const licitacoes = await Bid.find({ leilao: leilaoId })
        .sort({ createdAt: -1 })
        .limit(20);

      await socket.join(sala(leilaoId));
      emitirPresenca(io, leilaoId);
      socket.emit('estado', { agora: new Date(), leilao, licitacoes });
    } catch {
      socket.emit('recusada', 'Não foi possível entrar no leilão');
    }
  });

  socket.on('sair', async (leilaoId) => {
    if (!isValidObjectId(leilaoId)) return;
    await socket.leave(sala(leilaoId));
    emitirPresenca(io, leilaoId);
  });

  socket.on('licitar', async (dados = {}, responder) => {
    const recusar = (mensagem) => {
      if (typeof responder === 'function') responder({ ok: false, erro: mensagem });
      else socket.emit('recusada', mensagem);
    };

    const { leilaoId } = dados;
    const valor = cent(Number(dados.valor));

    if (socket.user.papel !== 'comprador') {
      return recusar('Apenas compradores podem licitar');
    }
    if (!isValidObjectId(leilaoId)) return recusar('Leilão inválido');
    if (!Number.isFinite(valor) || valor <= 0) return recusar('Valor inválido');

    try {
      const agora = new Date();
      const leilao = await Auction.findOneAndUpdate(
        {
          _id: leilaoId,
          estado: 'ativo',
          terminaEm: { $gt: agora },
          $expr: {
            $gte: [
              valor,
              { $round: [{ $add: ['$licitacaoAtual.valor', '$incremento'] }, 2] }
            ]
          }
        },
        {
          $set: {
            licitacaoAtual: {
              valor,
              comprador: socket.user.id,
              nome: socket.user.nome,
              em: agora
            }
          },
          $inc: { numLicitacoes: 1 }
        },
        { new: true, runValidators: true }
      );

      if (!leilao) {
        const atual = await Auction.findById(leilaoId)
          .select('estado terminaEm licitacaoAtual.valor incremento');
        if (!atual) return recusar('Leilão não encontrado');
        if (atual.estado !== 'ativo' || atual.terminaEm <= agora) {
          return recusar('O leilão não está ativo');
        }

        const minimo = cent(atual.licitacaoAtual.valor + atual.incremento);
        return recusar(`Licitação mínima: ${minimo.toFixed(2).replace('.', ',')} €`);
      }

      const bid = await Bid.create({
        leilao: leilaoId,
        comprador: socket.user.id,
        nome: socket.user.nome,
        valor
      });
      const novaLicitacao = {
        _id: bid._id,
        valor,
        comprador: socket.user.id,
        nome: socket.user.nome,
        em: bid.createdAt,
        createdAt: bid.createdAt,
        numLicitacoes: leilao.numLicitacoes
      };

      io.to(sala(leilaoId)).emit('nova-licitacao', novaLicitacao);
      if (typeof responder === 'function') responder({ ok: true, valor });
    } catch {
      recusar('Não foi possível registar a licitação');
    }
  });

  // Atualizar a presença quando o utilizador fecha a página
  socket.on('disconnecting', () => {
    for (const s of socket.rooms) {
      if (s.startsWith('leilao:')) {
        setImmediate(() => emitirPresenca(io, s.slice('leilao:'.length)));
      }
    }
  });
};
