// Comprador: acompanhamento das encomendas com atualização em tempo real.
import { useState } from 'react';
import EstadoEncomenda from '../components/EstadoEncomenda.jsx';
import FiltrosEncomendas, { FILTROS_ENCOMENDAS_INICIAIS, filtrarEncomendas } from '../components/FiltrosEncomendas.jsx';
import FormularioAvaliacao from '../components/FormularioAvaliacao.jsx';
import FormularioPagamento from '../components/FormularioPagamento.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useEventoSocket } from '../context/SocketContext.jsx';
import { useApi } from '../hooks/useApi.js';

const euros = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });

export default function Encomendas() {
  const { token } = useAuth();
  const { dados, erro, aCarregar, recarregar, setDados } = useApi('/orders');
  const [aPagar, setAPagar] = useState('');
  const [aProcessar, setAProcessar] = useState(false);
  const [erroPagamento, setErroPagamento] = useState('');
  const [filtros, setFiltros] = useState(FILTROS_ENCOMENDAS_INICIAIS);
  const encomendas = dados || [];
  const encomendasVisiveis = filtrarEncomendas(encomendas, filtros);

  useEventoSocket('encomenda-atualizada', (evento) => {
    setDados((lista) => lista?.map((encomenda) => (
      String(encomenda._id) === String(evento.id)
        ? { ...encomenda, estado: evento.estado }
        : encomenda
    )) || []);
  });

  // A encomenda de um leilão é criada no servidor quando este termina.
  useEventoSocket('leilao-ganho', recarregar);
  useEventoSocket('pagamento-confirmado', recarregar);

  async function pagar(encomendaId, { metodo }) {
    setAProcessar(true);
    setErroPagamento('');
    try {
      const atualizada = await api(`/orders/${encomendaId}/pagamento`, {
        metodo: 'POST', token, corpo: { metodo }
      });
      setDados((lista) => lista?.map((item) => (
        item._id === encomendaId ? { ...atualizada, avaliacoes: item.avaliacoes } : item
      )) || []);
      setAPagar('');
    } catch (err) {
      setErroPagamento(err.message);
    } finally {
      setAProcessar(false);
    }
  }

  if (aCarregar && !dados) return <p>A carregar encomendas…</p>;

  return (
    <>
      <header className="destaque mb-4">
        <h1>Encomendas</h1>
        <p className="texto-secundario mb-0">
          Consulte as suas encomendas e acompanhe o estado de cada entrega.
        </p>
      </header>
      {erro && <div className="alert alert-danger">{erro}</div>}
      {encomendas.length > 0 && (
        <FiltrosEncomendas filtros={filtros} aoAlterar={setFiltros} />
      )}
      {!encomendas.length && !erro && (
        <div className="alert alert-light border">Ainda não tem encomendas.</div>
      )}
      {encomendas.length > 0 && !encomendasVisiveis.length && (
        <div className="alert alert-light border" role="status">Nenhuma encomenda corresponde aos filtros.</div>
      )}

      {encomendasVisiveis.map((encomenda) => {
        const produtor = encomenda.produtor;
        const nomeProdutor = produtor?.produtor?.nomeExploracao || produtor?.nome || 'Produtor';
        const produtosAvaliados = new Set(encomenda.avaliacoes?.produtos || []);
        const linhasPorAvaliar = encomenda.linhas.filter((linha) => (
          linha.produto && !produtosAvaliados.has(String(linha.produto))
        ));
        const temAvaliacoesPorFazer = !encomenda.avaliacoes?.produtor || linhasPorAvaliar.length > 0;
        const paga = encomenda.pagamento?.estado === 'pago';
        const metodoPagamento = encomenda.pagamento?.metodo === 'mbway' ? 'MB WAY' : 'Cartão';
        return (
          <article key={encomenda._id} className="card p-3 mb-3">
            <div className="d-flex justify-content-between flex-wrap gap-2 mb-3">
              <div>
                <h2 className="h6 mb-1">
                  #{String(encomenda._id).slice(-6).toUpperCase()} · {nomeProdutor}
                </h2>
                <span className="texto-secundario small">
                  {new Date(encomenda.createdAt).toLocaleString('pt-PT')}
                </span>
              </div>
              <div className="text-end">
                {encomenda.origem === 'leilao' && <span className="badge text-bg-warning me-2">Leilão</span>}
                <strong>{euros.format(encomenda.total)}</strong>
              </div>
            </div>

            <EstadoEncomenda estado={encomenda.estado} />
            <ul className="list-unstyled small mt-3 mb-0">
              {encomenda.linhas.map((linha, indice) => (
                <li key={`${linha.produto || linha.nome}-${indice}`}>
                  {linha.quantidade} × {linha.nome} — {euros.format(linha.precoUnit)}
                </li>
              ))}
            </ul>
            <div className={`alert ${paga ? 'alert-success' : 'alert-warning'} mt-3 mb-0`}>
              {paga ? (
                <>
                  <strong>Pagamento confirmado</strong> por {metodoPagamento}
                  <span className="d-block small mt-1">
                    Referência {encomenda.pagamento.referencia} · {' '}
                    {new Date(encomenda.pagamento.pagoEm).toLocaleString('pt-PT')}
                  </span>
                </>
              ) : (
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <span><strong>Pagamento pendente.</strong> O produtor só poderá confirmar depois do pagamento.</span>
                  <button type="button" className="btn btn-sm btn-success"
                    onClick={() => { setAPagar(encomenda._id); setErroPagamento(''); }}>
                    Pagar agora
                  </button>
                </div>
              )}
            </div>
            {aPagar === encomenda._id && (
              <>
                {erroPagamento && <div className="alert alert-danger mt-3 mb-0">{erroPagamento}</div>}
                <FormularioPagamento aoConfirmar={(pagamento) => pagar(encomenda._id, pagamento)}
                  aoVoltar={() => setAPagar('')} aProcessar={aProcessar}
                  textoBotao={`Pagar ${euros.format(encomenda.total)}`} />
              </>
            )}
            {encomenda.estado === 'entregue' && temAvaliacoesPorFazer && (
              <details className="mt-3">
                <summary className="fw-semibold">Avaliar esta encomenda</summary>
                <div className="mt-3">
                  {!encomenda.avaliacoes?.produtor && (
                    <FormularioAvaliacao encomendaId={encomenda._id}
                      titulo={`Avaliar ${nomeProdutor}`} aoRegistar={recarregar} />
                  )}
                  {linhasPorAvaliar.map((linha) => (
                    <FormularioAvaliacao key={linha.produto} encomendaId={encomenda._id}
                      produto={linha.produto} titulo={`Avaliar ${linha.nome}`} aoRegistar={recarregar} />
                  ))}
                </div>
              </details>
            )}
            {encomenda.estado === 'entregue' && !temAvaliacoesPorFazer && (
              <p className="texto-secundario small mt-3 mb-0">Esta encomenda e os respetivos produtos já foram avaliados.</p>
            )}
          </article>
        );
      })}
    </>
  );
}
