// Visitante: catálogo com pesquisa e filtros
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CartaoProduto from '../components/CartaoProduto.jsx';
import { useCarrinho } from '../context/CarrinhoContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api, USAR_DADOS_SIMULADOS } from '../api/client.js';
import { formatarTempo, useContagem } from '../hooks/useContagem.js';
import { useLeiloesEmDireto } from '../hooks/useLeiloesEmDireto.js';
import produtosSimulados from '../data/produtos.json';

const CATEGORIAS = ['Todos', 'Hortícolas', 'Fruta', 'Mel', 'Vinho', 'Queijo', 'Padaria'];
const EPOCAS = ['Todas', 'Primavera', 'Verão', 'Outono', 'Inverno'];
const euros = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });

export default function Catalogo() {
  const [produtos, setProdutos] = useState([]);
  const [filtro, setFiltro] = useState({
    q: '', categoria: 'Todos', produtor: '', localidade: '', epoca: 'Todas', modo: 'todos'
  });
  const [produtores, setProdutores] = useState([]);
  const [erro, setErro] = useState('');
  const carrinho = useCarrinho();
  const { utilizador } = useAuth();
  const leiloesDestaque = useLeiloesEmDireto(5000, true);
  const leilaoDestaque = leiloesDestaque[0];
  const prestesAComecar = leilaoDestaque?.estado === 'agendado';
  const tempoRestante = useContagem(
    prestesAComecar ? leilaoDestaque?.iniciaEm : leilaoDestaque?.terminaEm
  );

  useEffect(() => {
    if (USAR_DADOS_SIMULADOS) {
      const unicos = new Map(produtosSimulados.map((produto) => [produto.produtor._id, produto.produtor]));
      setProdutores([...unicos.values()]);
      return;
    }

    api('/producers').then(setProdutores).catch(() => setProdutores([]));
  }, []);

  useEffect(() => {
    if (USAR_DADOS_SIMULADOS) {
      // Semana 2: filtragem local sobre dados simulados
      const pesquisa = filtro.q.trim().toLowerCase();
      const localidade = filtro.localidade.trim().toLowerCase();

      setProdutos(produtosSimulados.filter((p) =>
        (filtro.categoria === 'Todos' || p.categoria === filtro.categoria) &&
        (!filtro.produtor || p.produtor?._id === filtro.produtor) &&
        (!localidade || p.produtor?.produtor?.localidade?.toLowerCase().includes(localidade)) &&
        (filtro.modo === 'todos' || p.biologico === (filtro.modo === 'biologico')) &&
        p.nome.toLowerCase().includes(pesquisa)));
      setErro('');
      return undefined;
    }

    // Aguarda 300 ms após a última alteração antes de pedir dados à API.
    const temporizador = setTimeout(() => {
      const parametros = new URLSearchParams();
      if (filtro.q.trim()) parametros.set('q', filtro.q.trim());
      if (filtro.categoria !== 'Todos') parametros.set('categoria', filtro.categoria);
      if (filtro.produtor) parametros.set('produtor', filtro.produtor);
      if (filtro.localidade.trim()) parametros.set('localidade', filtro.localidade.trim());
      if (filtro.epoca !== 'Todas') parametros.set('epoca', filtro.epoca);
      if (filtro.modo !== 'todos') parametros.set('bio', String(filtro.modo === 'biologico'));

      api(`/products?${parametros}`)
        .then((dados) => {
          setProdutos(dados);
          setErro('');
        })
        .catch((e) => setErro(e.message));
    }, 300);

    return () => clearTimeout(temporizador);
  }, [filtro]);

  const mudar = (campo) => (e) =>
    setFiltro((f) => ({ ...f, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <>
      <section className={`inicio-hero mb-4 ${leilaoDestaque ? 'inicio-hero--com-leilao' : ''}`}>
        <div className="destaque">
          <p className="inicio-hero__rotulo mb-2">Alto Minho · Produção local</p>
          <h1>Direto de quem produz, para a sua mesa.</h1>
          <p className="texto-secundario mb-0">
            Produtores do Alto Minho. Encomende ou dispute os lotes da época nos leilões em direto.
          </p>
        </div>

        {leilaoDestaque && (
          <aside className="destaque-leilao"
            aria-label={prestesAComecar ? 'Leilão prestes a começar' : 'Leilão em direto'}>
            <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
              <span className="destaque-leilao__estado">
                ● {prestesAComecar ? 'Começa dentro de 5 minutos' : 'Leilão em direto'}
              </span>
              <span className="small">{leilaoDestaque.numLicitacoes || 0} licitações</span>
            </div>
            <h2>{leilaoDestaque.lote}</h2>
            <p className="destaque-leilao__produtor">
              {leilaoDestaque.produtor?.produtor?.nomeExploracao || leilaoDestaque.produtor?.nome}
              {leilaoDestaque.produtor?.produtor?.localidade
                ? ` · ${leilaoDestaque.produtor.produtor.localidade}` : ''}
            </p>
            <div className="destaque-leilao__dados">
              <div><span>{prestesAComecar ? 'Preço base' : 'Licitação atual'}</span><strong>{euros.format(
                Number(leilaoDestaque.licitacaoAtual?.valor ?? leilaoDestaque.precoBase)
              )}</strong></div>
              <div><span>{prestesAComecar ? 'Começa em' : 'Termina em'}</span>
                <strong>{formatarTempo(tempoRestante)}</strong></div>
            </div>
            <Link className="btn btn-light w-100 mt-3" to={`/leiloes/${leilaoDestaque._id}`}>
              {prestesAComecar
                ? 'Ver leilão'
                : (utilizador?.papel === 'comprador' ? 'Entrar e licitar' : 'Entrar no leilão')}
            </Link>
          </aside>
        )}
      </section>

      <section className="filtros mb-3" aria-label="Filtros">
        <label className="visually-hidden" htmlFor="pesquisa">Pesquisar</label>
        <input id="pesquisa" type="search" className="form-control" placeholder="Pesquisar kiwi, mel, Alvarinho…"
          value={filtro.q} onChange={mudar('q')} />
        <div className="d-flex flex-wrap gap-2">
          {CATEGORIAS.map((c) => (
            <button key={c} type="button"
              className={`btn btn-sm ${filtro.categoria === c ? 'btn-dark' : 'btn-outline-secondary'}`}
              onClick={() => setFiltro((f) => ({ ...f, categoria: c }))}>{c}</button>
          ))}
        </div>
        <select className="form-select" aria-label="Produtor" value={filtro.produtor} onChange={mudar('produtor')}>
          <option value="">Todos os produtores</option>
          {produtores.map((p) => <option key={p._id} value={p._id}>{p.produtor?.nomeExploracao || p.nome}</option>)}
        </select>
        <input className="form-control" aria-label="Localidade" placeholder="Localidade"
          value={filtro.localidade} onChange={mudar('localidade')} />
        <select className="form-select" aria-label="Época" value={filtro.epoca} onChange={mudar('epoca')}>
          {EPOCAS.map((epoca) => <option key={epoca}>{epoca}</option>)}
        </select>
        <select className="form-select" aria-label="Modo de produção" value={filtro.modo} onChange={mudar('modo')}>
          <option value="todos">Todos os modos</option>
          <option value="biologico">Biológico</option>
          <option value="convencional">Convencional</option>
        </select>
      </section>

      {erro && <div className="alert alert-danger">{erro}</div>}

      <section className="grelha-produtos" aria-label="Produtos">
        {produtos.map((p) => (
          <CartaoProduto key={p._id} produto={p}
            onAdicionar={utilizador?.papel === 'comprador' ? () => carrinho.adicionar(p) : undefined} />
        ))}
      </section>
      {produtos.length === 0 && <p className="texto-secundario">Nenhum produto encontrado.</p>}
    </>
  );
}
