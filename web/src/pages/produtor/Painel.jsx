// Produtor: painel de gestão e tratamento de encomendas.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import EstadoEncomenda from '../../components/EstadoEncomenda.jsx';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useEventoSocket } from '../../context/SocketContext.jsx';
import { useApi } from '../../hooks/useApi.js';

const ESTADO_SEGUINTE = { pendente: 'confirmada', confirmada: 'pronta', pronta: 'entregue' };
const euros = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });

export default function PainelProdutor() {
  const { utilizador, token } = useAuth();
  const { dados, erro, aCarregar, recarregar, setDados } = useApi('/orders');
  const { dados: estatisticas } = useApi('/producers/me/estatisticas');
  const { dados: leiloes } = useApi(`/auctions?produtor=${utilizador._id}`);
  const [erroAlteracao, setErroAlteracao] = useState('');
  const [aAlterar, setAAlterar] = useState('');
  const encomendas = dados || [];

  useEventoSocket('nova-encomenda', recarregar);
  useEventoSocket('leilao-terminado', recarregar);

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
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <h1 className="mb-0">Painel do produtor</h1>
        <Link to="/produtor/leiloes/novo" className="btn btn-success">Criar leilão</Link>
      </div>

      <section className="row g-3 mb-4" aria-label="Indicadores de vendas">
        {[
          ['Produtos', estatisticas?.produtos ?? 0],
          ['Encomendas', estatisticas?.encomendas ?? 0],
          ['Leilões', estatisticas?.leiloes ?? 0],
          ['Vendas entregues', euros.format(estatisticas?.totalVendas ?? 0)]
        ].map(([rotulo, valor]) => (
          <div className="col-6 col-lg-3" key={rotulo}><div className="card card-body h-100">
            <span className="texto-secundario small">{rotulo}</span><strong className="fs-4">{valor}</strong>
          </div></div>
        ))}
      </section>

      <section className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h2 className="h4 mb-0">Leilões</h2>
          <Link to="/produtor/leiloes/novo">Novo leilão</Link>
        </div>
        <div className="list-group">
          {(leiloes || []).map((leilao) => (
            <Link className="list-group-item list-group-item-action d-flex justify-content-between gap-3"
              to={`/leiloes/${leilao._id}`} key={leilao._id}>
              <span>{leilao.lote}</span>
              <span className={`badge estado-leilao estado-leilao--${leilao.estado}`}>{leilao.estado}</span>
            </Link>
          ))}
        </div>
        {leiloes && !leiloes.length && <p className="texto-secundario">Ainda não criou leilões.</p>}
      </section>

      <h2 className="h4">Encomendas</h2>
      {(erro || erroAlteracao) && <div className="alert alert-danger">{erro || erroAlteracao}</div>}
      {aCarregar && !dados && <p>A carregar encomendas…</p>}
      {!aCarregar && !encomendas.length && !erro && (
        <div className="alert alert-light border">Ainda não recebeu encomendas.</div>
      )}

      {encomendas.map((encomenda) => (
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
          {ESTADO_SEGUINTE[encomenda.estado] && (
            <button type="button" className="btn btn-outline-success align-self-start mt-3"
              disabled={aAlterar === encomenda._id} onClick={() => avancarEstado(encomenda)}>
              {aAlterar === encomenda._id
                ? 'A atualizar…'
                : `Marcar como ${ESTADO_SEGUINTE[encomenda.estado]}`}
            </button>
          )}
        </article>
      ))}
    </>
  );
}
