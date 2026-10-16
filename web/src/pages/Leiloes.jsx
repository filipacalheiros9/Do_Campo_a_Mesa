import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, urlFicheiro } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const euros = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
const dataHora = new Intl.DateTimeFormat('pt-PT', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

export default function Leiloes() {
  const { utilizador } = useAuth();
  const [leiloes, setLeiloes] = useState([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const dados = await api('/auctions');
        if (!ativo) return;

        // Os leilões terminados deixam de aparecer na página de entrada.
        setLeiloes(dados.filter((leilao) => leilao.estado !== 'terminado'));
        setErro('');
      } catch (err) {
        if (ativo) setErro(err.message);
      } finally {
        if (ativo) setACarregar(false);
      }
    }

    carregar();
    const temporizador = setInterval(carregar, 5000);
    return () => {
      ativo = false;
      clearInterval(temporizador);
    };
  }, []);

  return (
    <>
      <header className="destaque mb-4">
        <h1>Leilões</h1>
        <p className="texto-secundario mb-0">
          Assista aos leilões em direto e licite nos lotes dos produtores locais.
        </p>
      </header>

      {erro && <div className="alert alert-danger" role="alert">{erro}</div>}
      {aCarregar && <p className="texto-secundario">A carregar os leilões…</p>}

      {!aCarregar && !erro && leiloes.length === 0 && (
        <div className="alert alert-light border">
          Não existem leilões ativos ou agendados neste momento.
        </div>
      )}

      <section className="grelha-leiloes" aria-label="Leilões ativos e agendados">
        {leiloes.map((leilao) => {
          const valorAtual = Number(leilao.licitacaoAtual?.valor ?? leilao.precoBase);
          const nomeProdutor = leilao.produtor?.produtor?.nomeExploracao || leilao.produtor?.nome;
          const localidade = leilao.produtor?.produtor?.localidade;
          const ativoAgora = leilao.estado === 'ativo';

          return (
            <article key={leilao._id} className="card cartao-leilao h-100">
              {leilao.produto?.imagemUrl ? (
                <img className="cartao-leilao__foto" src={urlFicheiro(leilao.produto.imagemUrl)}
                  alt={leilao.lote} loading="lazy" />
              ) : (
                <div className="cartao-leilao__imagem" aria-hidden="true">⚒</div>
              )}

              <div className="card-body d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                  <span className={`badge estado-leilao estado-leilao--${leilao.estado}`}>
                    {ativoAgora ? 'Em direto' : 'Agendado'}
                  </span>
                  <span className="small texto-secundario">
                    {leilao.numLicitacoes || 0} licitação{leilao.numLicitacoes === 1 ? '' : 'ões'}
                  </span>
                </div>

                <h2 className="h5 mb-1">{leilao.lote}</h2>
                <p className="small texto-secundario mb-3">
                  {[nomeProdutor, localidade].filter(Boolean).join(' · ')}
                </p>

                <dl className="row small mb-3">
                  <dt className="col-6">{ativoAgora ? 'Licitação atual' : 'Preço base'}</dt>
                  <dd className="col-6 text-end fw-bold mb-2">{euros.format(valorAtual)}</dd>
                  <dt className="col-6">Incremento</dt>
                  <dd className="col-6 text-end mb-2">{euros.format(Number(leilao.incremento))}</dd>
                  <dt className="col-6">{ativoAgora ? 'Termina' : 'Começa'}</dt>
                  <dd className="col-6 text-end mb-0">
                    {dataHora.format(new Date(ativoAgora ? leilao.terminaEm : leilao.iniciaEm))}
                  </dd>
                </dl>

                <Link to={`/leiloes/${leilao._id}`} className="btn btn-success w-100 mt-auto">
                  {utilizador ? 'Entrar na sala' : 'Entrar para assistir'}
                </Link>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
