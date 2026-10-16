import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import CartaoProduto from '../components/CartaoProduto.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCarrinho } from '../context/CarrinhoContext.jsx';

export default function Produtor() {
  const { id } = useParams();
  const { utilizador, token } = useAuth();
  const carrinho = useCarrinho();
  const [dados, setDados] = useState(null);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    Promise.all([api(`/producers/${id}`), api(`/reviews?produtor=${id}`)])
      .then(([perfil, lista]) => {
        setDados(perfil);
        setAvaliacoes(lista);
        setErro('');
      })
      .catch((err) => setErro(err.message));
  }, [id]);

  async function denunciar(avaliacaoId) {
    try {
      await api(`/reviews/${avaliacaoId}/denuncia`, { metodo: 'POST', token });
      setAvaliacoes((lista) => lista.map((item) => (
        item._id === avaliacaoId ? { ...item, denunciada: true } : item
      )));
    } catch (err) {
      setErro(err.message);
    }
  }

  if (erro && !dados) return <div className="alert alert-danger">{erro}</div>;
  if (!dados) return <p>A carregar produtor…</p>;

  const { produtor, produtos, avaliacaoMedia, totalAvaliacoes } = dados;
  const coordenadas = produtor.produtor?.localizacao;
  const nome = produtor.produtor?.nomeExploracao || produtor.nome;
  const mapa = coordenadas?.lat != null && coordenadas?.lng != null
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${coordenadas.lng - 0.02}%2C${coordenadas.lat - 0.015}%2C${coordenadas.lng + 0.02}%2C${coordenadas.lat + 0.015}&layer=mapnik&marker=${coordenadas.lat}%2C${coordenadas.lng}`
    : null;

  return (
    <>
      <header className="mb-4">
        <p className="texto-secundario mb-1">Produtor local</p>
        <h1>{nome}</h1>
        <p className="texto-secundario mb-2">{produtor.produtor?.localidade}</p>
        {avaliacaoMedia != null && (
          <p className="mb-0" aria-label={`Classificação média ${avaliacaoMedia.toFixed(1)} em 5`}>
            <strong>★ {avaliacaoMedia.toFixed(1)}</strong> · {totalAvaliacoes} avaliação{totalAvaliacoes === 1 ? '' : 'ões'}
          </p>
        )}
      </header>

      {produtor.produtor?.descricao && <p className="lead">{produtor.produtor.descricao}</p>}
      {mapa ? (
        <iframe className="mapa-produtor mb-4" title={`Localização de ${nome}`} src={mapa} loading="lazy" />
      ) : (
        <a className="btn btn-outline-secondary mb-4" target="_blank" rel="noreferrer"
          href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(produtor.produtor?.localidade || nome)}`}>
          Ver localização no mapa
        </a>
      )}

      <section aria-labelledby="produtos-produtor" className="mb-5">
        <h2 id="produtos-produtor" className="h4 mb-3">Produtos disponíveis</h2>
        <div className="grelha-produtos">
          {produtos.map((produto) => (
            <CartaoProduto key={produto._id} produto={{ ...produto, produtor }}
              onAdicionar={utilizador?.papel === 'comprador'
                ? () => carrinho.adicionar({ ...produto, produtor })
                : undefined} />
          ))}
        </div>
        {!produtos.length && <p className="texto-secundario">Este produtor ainda não tem produtos.</p>}
      </section>

      <section aria-labelledby="avaliacoes-produtor">
        <h2 id="avaliacoes-produtor" className="h4 mb-3">Avaliações</h2>
        {!avaliacoes.length && <p className="texto-secundario">Ainda não existem avaliações.</p>}
        {avaliacoes.map((avaliacao) => (
          <article className="card card-body mb-2" key={avaliacao._id}>
            <div className="d-flex justify-content-between gap-3">
              <strong>{avaliacao.autor?.nome || 'Comprador'} · {'★'.repeat(avaliacao.classificacao)}</strong>
              {utilizador && !avaliacao.denunciada && (
                <button className="btn btn-sm btn-link" type="button" onClick={() => denunciar(avaliacao._id)}>
                  Denunciar
                </button>
              )}
            </div>
            {avaliacao.produto?.nome && <span className="small texto-secundario">{avaliacao.produto.nome}</span>}
            {avaliacao.comentario && <p className="mb-0 mt-2">{avaliacao.comentario}</p>}
          </article>
        ))}
      </section>
      {erro && <div className="alert alert-danger mt-3">{erro}</div>}
    </>
  );
}
