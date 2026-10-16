// Comprador: acompanhamento das encomendas com atualização em tempo real.
import EstadoEncomenda from '../components/EstadoEncomenda.jsx';
import FormularioAvaliacao from '../components/FormularioAvaliacao.jsx';
import { useEventoSocket } from '../context/SocketContext.jsx';
import { useApi } from '../hooks/useApi.js';

const euros = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });

export default function Encomendas() {
  const { dados, erro, aCarregar, recarregar, setDados } = useApi('/orders');
  const encomendas = dados || [];

  useEventoSocket('encomenda-atualizada', (evento) => {
    setDados((lista) => lista?.map((encomenda) => (
      String(encomenda._id) === String(evento.id)
        ? { ...encomenda, estado: evento.estado }
        : encomenda
    )) || []);
  });

  // A encomenda de um leilão é criada no servidor quando este termina.
  useEventoSocket('leilao-ganho', recarregar);

  if (aCarregar && !dados) return <p>A carregar encomendas…</p>;

  return (
    <>
      <h1 className="mb-4">Encomendas</h1>
      {erro && <div className="alert alert-danger">{erro}</div>}
      {!encomendas.length && !erro && (
        <div className="alert alert-light border">Ainda não tem encomendas.</div>
      )}

      {encomendas.map((encomenda) => {
        const produtor = encomenda.produtor;
        const nomeProdutor = produtor?.produtor?.nomeExploracao || produtor?.nome || 'Produtor';
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
            {encomenda.estado === 'entregue' && (
              <details className="mt-3">
                <summary className="fw-semibold">Avaliar esta encomenda</summary>
                <div className="mt-3">
                  <FormularioAvaliacao encomendaId={encomenda._id}
                    titulo={`Avaliar ${nomeProdutor}`} />
                  {encomenda.linhas.filter((linha) => linha.produto).map((linha) => (
                    <FormularioAvaliacao key={linha.produto} encomendaId={encomenda._id}
                      produto={linha.produto} titulo={`Avaliar ${linha.nome}`} />
                  ))}
                </div>
              </details>
            )}
          </article>
        );
      })}
    </>
  );
}
