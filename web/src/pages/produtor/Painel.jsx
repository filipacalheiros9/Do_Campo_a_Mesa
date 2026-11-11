// Produtor: painel de gestão e tratamento de encomendas.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import EstadoEncomenda from '../../components/EstadoEncomenda.jsx';
import FiltrosEncomendas, { FILTROS_ENCOMENDAS_INICIAIS, filtrarEncomendas } from '../../components/FiltrosEncomendas.jsx';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useEventoSocket } from '../../context/SocketContext.jsx';
import { useApi } from '../../hooks/useApi.js';

const ESTADO_SEGUINTE = { pendente: 'confirmada', confirmada: 'pronta', pronta: 'entregue' };
const euros = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
const LIMITE_RECENTES = 5;

export default function PainelProdutor() {
  const { utilizador, token } = useAuth();
  const { dados, erro, aCarregar, recarregar, setDados } = useApi('/orders');
  const { dados: estatisticas, recarregar: recarregarEstatisticas } = useApi('/producers/me/estatisticas');
  const { dados: leiloes } = useApi(`/auctions?produtor=${utilizador._id}`);
  const [erroAlteracao, setErroAlteracao] = useState('');
  const [aAlterar, setAAlterar] = useState('');
  const [dataLeilao, setDataLeilao] = useState('');
  const [filtrosEncomendas, setFiltrosEncomendas] = useState(FILTROS_ENCOMENDAS_INICIAIS);
  const encomendas = dados || [];
  const temFiltrosEncomendas = Object.values(filtrosEncomendas).some(Boolean);
  const encomendasVisiveis = temFiltrosEncomendas
    ? filtrarEncomendas(encomendas, filtrosEncomendas)
    : encomendas.slice(0, LIMITE_RECENTES);

  const diaLeilao = dataLeilao && new Date(`${dataLeilao}T00:00:00`).toDateString();
  const leiloesOrdenados = (leiloes || [])
    .filter((leilao) => !diaLeilao || new Date(leilao.iniciaEm).toDateString() === diaLeilao)
    .sort((a, b) => new Date(b.createdAt || b.iniciaEm) - new Date(a.createdAt || a.iniciaEm));
  const leiloesVisiveis = diaLeilao ? leiloesOrdenados : leiloesOrdenados.slice(0, LIMITE_RECENTES);

  const atualizarPainel = () => {
    recarregar();
    recarregarEstatisticas();
  };

  useEventoSocket('nova-encomenda', atualizarPainel);
  useEventoSocket('leilao-terminado', atualizarPainel);
  useEventoSocket('pagamento-confirmado', atualizarPainel);
  useEventoSocket('nova-avaliacao', recarregarEstatisticas);

  const avancarEstado = async (encomenda) => {
    const estado = ESTADO_SEGUINTE[encomenda.estado];
    if (!estado) return;
    setAAlterar(encomenda._id);
    setErroAlteracao('');
    try {
      const atualizada = await api(`/orders/${encomenda._id}/estado`, {
        metodo: 'PATCH', corpo: { estado }, token
      });
      setDados((lista) => lista.map((item) => (
        item._id === encomenda._id ? atualizada : item
      )));
    } catch (err) {
      setErroAlteracao(err.message);
    } finally {
      setAAlterar('');
    }
  };

  return (
    <>
      <header className="destaque mb-4">
        <h1 className="mb-0">Painel do produtor</h1>
      </header>

      <section className="row g-3 mb-4" aria-label="Indicadores de vendas">
        {[
          ['Produtos', estatisticas?.produtos ?? 0],
          ['Encomendas', estatisticas?.encomendas ?? 0],
          ['Leilões', estatisticas?.leiloes ?? 0],
          ['Vendas entregues', euros.format(estatisticas?.totalVendas ?? 0)],
          ['Avaliação média', estatisticas?.avaliacaoMedia == null
            ? 'Sem avaliações'
            : `${estatisticas.avaliacaoMedia.toFixed(1)} / 5 (${estatisticas.totalAvaliacoes})`]
        ].map(([rotulo, valor]) => (
          <div className="col-6 col-lg" key={rotulo}><div className="card card-body h-100">
            <span className="texto-secundario small">{rotulo}</span><strong className="fs-4">{valor}</strong>
          </div></div>
        ))}
      </section>

      <section className="card card-body mb-4" aria-labelledby="titulo-stock-baixo">
        <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
          <div>
            <h2 className="h4 mb-1" id="titulo-stock-baixo">Stock baixo</h2>
            <p className="texto-secundario small mb-0">Produtos com dez unidades ou menos.</p>
          </div>
          <Link to="/produtor/produtos" className="btn btn-sm btn-success">Repor stock</Link>
        </div>

        {estatisticas?.stockBaixo?.length ? (
          <div className="list-group list-group-flush">
            {estatisticas.stockBaixo.map((produto) => (
              <Link to="/produtor/produtos" className="list-group-item list-group-item-action px-0
                d-flex justify-content-between align-items-center gap-3" key={produto._id}>
                <span>{produto.nome}</span>
                <strong className="text-danger">{produto.stock} {produto.unidade}</strong>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-success mb-0">Não existem produtos com stock baixo.</p>
        )}
      </section>

      <section className="mb-4">
        <h2 className="h4 mb-2">Leilões</h2>
        {leiloes?.length > 0 && (
          <div className="card card-body mb-4" role="group" aria-label="Filtros dos leilões">
            <div className="row g-3 align-items-end">
              <div className="col-sm">
                <label className="form-label" htmlFor="filtro-data-leilao">Data de início do leilão</label>
                <input id="filtro-data-leilao" type="date" className="form-control" value={dataLeilao}
                  onChange={(e) => setDataLeilao(e.target.value)} />
              </div>
              <div className="col-sm-auto">
                <button type="button" className="btn btn-sm btn-danger" disabled={!dataLeilao}
                  onClick={() => setDataLeilao('')}>Limpar filtros</button>
              </div>
            </div>
          </div>
        )}
        {!diaLeilao && leiloes?.length > LIMITE_RECENTES && (
          <p className="texto-secundario small mb-2">A mostrar os {LIMITE_RECENTES} leilões criados mais recentemente.</p>
        )}
        <div className="list-group">
          {leiloesVisiveis.map((leilao) => (
            <Link className="list-group-item list-group-item-action d-flex justify-content-between align-items-center gap-3"
              to={`/leiloes/${leilao._id}`} key={leilao._id}>
              <span>
                {leilao.lote}
                <span className="d-block texto-secundario small">{new Date(leilao.iniciaEm).toLocaleDateString('pt-PT')}</span>
              </span>
              <span className={`badge estado-leilao estado-leilao--${leilao.estado}`}>{leilao.estado}</span>
            </Link>
          ))}
        </div>
        {leiloes && !leiloes.length && <p className="texto-secundario">Ainda não criou leilões.</p>}
        {diaLeilao && leiloes?.length > 0 && !leiloesVisiveis.length && (
          <p className="texto-secundario" role="status">Nenhum leilão começa na data selecionada.</p>
        )}
      </section>

      <h2 className="h4">Encomendas</h2>
      {(erro || erroAlteracao) && <div className="alert alert-danger">{erro || erroAlteracao}</div>}
      {aCarregar && !dados && <p>A carregar encomendas…</p>}
      {encomendas.length > 0 && (
        <FiltrosEncomendas filtros={filtrosEncomendas} aoAlterar={setFiltrosEncomendas} rotuloEstado="Estado da entrega" />
      )}
      {!temFiltrosEncomendas && encomendas.length > LIMITE_RECENTES && (
        <p className="texto-secundario small mb-2">A mostrar as {LIMITE_RECENTES} encomendas mais recentes.</p>
      )}
      {!aCarregar && !encomendas.length && !erro && (
        <div className="alert alert-light border">Ainda não recebeu encomendas.</div>
      )}
      {temFiltrosEncomendas && encomendas.length > 0 && !encomendasVisiveis.length && (
        <div className="alert alert-light border" role="status">Nenhuma encomenda corresponde aos filtros.</div>
      )}

      {encomendasVisiveis.map((encomenda) => (
        <article key={encomenda._id} className="card p-3 mb-3">
          <div className="d-flex justify-content-between flex-wrap gap-2 mb-3">
            <div>
              <h3 className="h6 mb-1">
                #{String(encomenda._id).slice(-6).toUpperCase()} · {encomenda.comprador?.nome || 'Comprador'}
              </h3>
              <span className="texto-secundario small">
                {new Date(encomenda.createdAt).toLocaleString('pt-PT')}
              </span>
            </div>
            <strong>{euros.format(encomenda.total)}</strong>
          </div>
          <EstadoEncomenda estado={encomenda.estado} />
          <p className={`small fw-semibold mt-3 mb-0 ${encomenda.pagamento?.estado === 'pago' ? 'text-success' : 'text-warning'}`}>
            {encomenda.pagamento?.estado === 'pago'
              ? `Pagamento confirmado · ${encomenda.pagamento.metodo === 'mbway' ? 'MB WAY' : 'Cartão'}`
              : 'A aguardar pagamento do comprador'}
          </p>
          {ESTADO_SEGUINTE[encomenda.estado] && (
            <button type="button" className="btn btn-success align-self-start mt-3"
              disabled={aAlterar === encomenda._id || encomenda.pagamento?.estado !== 'pago'}
              onClick={() => avancarEstado(encomenda)}>
              {encomenda.pagamento?.estado !== 'pago'
                ? 'Aguardar pagamento'
                : aAlterar === encomenda._id
                ? 'A atualizar…'
                : `Marcar como ${ESTADO_SEGUINTE[encomenda.estado]}`}
            </button>
          )}
        </article>
      ))}
    </>
  );
}
