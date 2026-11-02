// Dados de exemplo: npm run seed   (APAGA as coleções antes de inserir)
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const Review = require('../models/Review');

const minutos = (quantidade) => quantidade * 60 * 1000;

const copiarLinha = (produto, quantidade) => ({
  produto: produto._id,
  nome: produto.nome,
  precoUnit: produto.preco,
  unidade: produto.unidade,
  quantidade
});

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  try {
    // O seed é repetível: começa sempre com as coleções da aplicação vazias.
    await Promise.all([
      Review.deleteMany(),
      Bid.deleteMany(),
      Order.deleteMany(),
      Auction.deleteMany(),
      Product.deleteMany(),
      User.deleteMany()
    ]);

    const passwordHash = await bcrypt.hash('password123', 12);
    const [admin, horta, mel, comprador, restaurante] = await User.create([
      { nome: 'Administração', email: 'admin@exemplo.pt', passwordHash, papel: 'admin' },
      {
        nome: 'Horta da Ribeira', email: 'horta@exemplo.pt', passwordHash, papel: 'produtor',
        produtor: {
          nomeExploracao: 'Horta da Ribeira',
          descricao: 'Hortícolas e fruta produzidos em modo sustentável.',
          localidade: 'Ponte de Lima',
          localizacao: { lat: 41.7676, lng: -8.5833 },
          validado: true
        }
      },
      {
        nome: 'Mel do Soajo', email: 'mel@exemplo.pt', passwordHash, papel: 'produtor',
        produtor: {
          nomeExploracao: 'Mel do Soajo',
          descricao: 'Mel artesanal produzido na serra do Soajo.',
          localidade: 'Arcos de Valdevez',
          localizacao: { lat: 41.8738, lng: -8.2633 },
          validado: true
        }
      },
      { nome: 'Tasca do Lima', email: 'tasca@exemplo.pt', passwordHash, papel: 'comprador' },
      { nome: 'Restaurante do Minho', email: 'restaurante@exemplo.pt', passwordHash, papel: 'comprador' }
    ]);

    const [kiwi, abobora, couve, melUrze, melCastanheiro] = await Product.create([
      { produtor: horta._id, nome: 'Kiwi Hayward', categoria: 'Fruta', preco: 2.4, unidade: 'kg', stock: 298, biologico: true, epocas: ['Outono', 'Inverno'] },
      { produtor: horta._id, nome: 'Abóbora-menina', categoria: 'Hortícolas', preco: 1.2, unidade: 'kg', stock: 80, epocas: ['Outono'] },
      { produtor: horta._id, nome: 'Couve-galega', categoria: 'Hortícolas', preco: 1.5, unidade: 'molho', stock: 39, biologico: true, epocas: ['Outono', 'Inverno'] },
      { produtor: mel._id, nome: 'Mel de urze', categoria: 'Mel', preco: 7.5, unidade: '500 g', stock: 36 },
      { produtor: mel._id, nome: 'Mel de castanheiro', categoria: 'Mel', preco: 7, unidade: '500 g', stock: 21 }
    ]);

    const agora = Date.now();

    // As linhas guardam uma cópia dos dados comerciais no momento da compra.
    const [encomendaEntregue, encomendaPendente] = await Order.create([
      {
        comprador: comprador._id,
        produtor: horta._id,
        linhas: [copiarLinha(kiwi, 2), copiarLinha(couve, 1)],
        estado: 'entregue',
        entrega: { tipo: 'levantamento' },
        pagamento: {
          estado: 'pago', metodo: 'cartao', referencia: 'PAG-SEED-LOJA-001',
          pagoEm: new Date(agora - minutos(180))
        }
      },
      {
        comprador: restaurante._id,
        produtor: mel._id,
        linhas: [copiarLinha(melUrze, 2)],
        estado: 'pendente',
        entrega: { tipo: 'entrega', morada: 'Rua do Mercado, 10, Braga' },
        pagamento: {
          estado: 'pago', metodo: 'mbway', referencia: 'PAG-SEED-LOJA-002',
          pagoEm: new Date(agora - minutos(5))
        }
      }
    ]);

    const [leilaoAtivo, leilaoAgendado, leilaoTerminado] = await Auction.create([
      {
        produtor: horta._id,
        produto: kiwi._id,
        lote: '200 kg de kiwi Hayward, calibre A',
        descricao: 'Kiwi biológico selecionado e pronto para levantamento.',
        quantidade: '200 kg',
        precoBase: 200,
        incremento: 5,
        licitacaoAtual: {
          valor: 215,
          comprador: comprador._id,
          nome: comprador.nome,
          em: new Date(agora - minutos(4))
        },
        numLicitacoes: 3,
        iniciaEm: new Date(agora - minutos(10)),
        terminaEm: new Date(agora + minutos(20)),
        estado: 'ativo'
      },
      {
        produtor: mel._id,
        produto: melCastanheiro._id,
        lote: 'Caixa de 24 frascos de mel de castanheiro',
        descricao: 'Frascos de 500 g provenientes do mesmo lote de produção.',
        quantidade: '24 frascos',
        precoBase: 120,
        incremento: 5,
        iniciaEm: new Date(agora + minutos(60)),
        terminaEm: new Date(agora + minutos(90)),
        estado: 'agendado'
      },
      {
        produtor: horta._id,
        produto: abobora._id,
        lote: 'Lote de 100 kg de abóbora-menina',
        descricao: 'Lote já encerrado, mantido para demonstrar o histórico.',
        quantidade: '100 kg',
        precoBase: 100,
        incremento: 10,
        licitacaoAtual: {
          valor: 130,
          comprador: restaurante._id,
          nome: restaurante.nome,
          em: new Date(agora - minutos(100))
        },
        numLicitacoes: 2,
        iniciaEm: new Date(agora - minutos(120)),
        terminaEm: new Date(agora - minutos(90)),
        estado: 'terminado'
      }
    ]);

    await Bid.create([
      { leilao: leilaoAtivo._id, comprador: comprador._id, nome: comprador.nome, valor: 205, createdAt: new Date(agora - minutos(8)) },
      { leilao: leilaoAtivo._id, comprador: restaurante._id, nome: restaurante.nome, valor: 210, createdAt: new Date(agora - minutos(6)) },
      { leilao: leilaoAtivo._id, comprador: comprador._id, nome: comprador.nome, valor: 215, createdAt: new Date(agora - minutos(4)) },
      { leilao: leilaoTerminado._id, comprador: comprador._id, nome: comprador.nome, valor: 110, createdAt: new Date(agora - minutos(110)) },
      { leilao: leilaoTerminado._id, comprador: restaurante._id, nome: restaurante.nome, valor: 130, createdAt: new Date(agora - minutos(100)) }
    ]);

    // O leilão histórico já terminou antes do seed, por isso a respetiva venda
    // também tem de existir. Sem esta associação, o ciclo tentaria concluí-lo
    // novamente e reservar 100 kg do stock atual da abóbora.
    const encomendaLeilao = await Order.create({
      comprador: restaurante._id,
      produtor: horta._id,
      linhas: [{
        produto: abobora._id,
        nome: `Lote: ${leilaoTerminado.lote}`,
        precoUnit: leilaoTerminado.licitacaoAtual.valor,
        unidade: 'lote',
        quantidade: 1
      }],
      estado: 'entregue',
      origem: 'leilao',
      leilao: leilaoTerminado._id,
      pagamento: {
        estado: 'pago', metodo: 'cartao', referencia: 'PAG-SEED-LEILAO-001',
        pagoEm: new Date(agora - minutos(80))
      }
    });
    leilaoTerminado.encomenda = encomendaLeilao._id;
    await leilaoTerminado.save();

    await Review.create([
      {
        autor: comprador._id,
        produtor: horta._id,
        produto: kiwi._id,
        encomenda: encomendaEntregue._id,
        classificacao: 5,
        comentario: 'Produto fresco e pronto à hora combinada.',
        estadoModeracao: 'aprovada',
        visivel: true
      },
      {
        autor: comprador._id,
        produtor: horta._id,
        encomenda: encomendaEntregue._id,
        classificacao: 5,
        comentario: 'Atendimento muito atencioso.',
        estadoModeracao: 'aprovada',
        visivel: true
      }
    ]);

    console.log('Seed concluído:');
    console.log(`  ${[admin, horta, mel, comprador, restaurante].length} utilizadores`);
    console.log('  5 produtos');
    console.log(`  ${[encomendaEntregue, encomendaPendente, encomendaLeilao].length} encomendas`);
    console.log('  3 pagamentos');
    console.log(`  ${[leilaoAtivo, leilaoAgendado, leilaoTerminado].length} leilões`);
    console.log('  5 licitações');
    console.log('  2 avaliações');
    console.log('\nUtilizadores (password: password123):');
    console.log([admin, horta, mel, comprador, restaurante]
      .map((utilizador) => `  ${utilizador.papel.padEnd(10)} ${utilizador.email}`)
      .join('\n'));
  } finally {
    await mongoose.disconnect();
  }
}

seed().catch((err) => {
  console.error('Erro ao executar o seed:', err);
  process.exit(1);
});
