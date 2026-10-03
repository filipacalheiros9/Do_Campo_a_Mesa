// Visitante: página pública do produtor
import { useParams } from 'react-router-dom';
import CartaoProduto from '../components/CartaoProduto.jsx';
import PorImplementar from '../components/PorImplementar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCarrinho } from '../context/CarrinhoContext.jsx';
import produtosSimulados from '../data/produtos.json';

export default function Produtor() {
  const { id } = useParams();
  const { utilizador } = useAuth();
  const carrinho = useCarrinho();
  const produtos = produtosSimulados.filter((produto) => produto.produtor?._id === id);
  const produtor = produtos[0]?.produtor;

  if (!produtor) {
    return <div className="alert alert-warning">Produtor não encontrado.</div>;
  }

  return (
    <>
      <header className="mb-4">
        <p className="texto-secundario mb-1">Produtor local</p>
        <h1>{produtor.nome}</h1>
        <p className="texto-secundario mb-0">{produtor.produtor?.localidade}</p>
      </header>

      <PorImplementar passo={3}>
        obter os dados públicos através de <code>GET /api/producers/{id}</code> e apresentar mapa e avaliações.
      </PorImplementar>

      <section aria-labelledby="produtos-produtor">
        <h2 id="produtos-produtor" className="h4 mb-3">Produtos disponíveis</h2>
        <div className="grelha-produtos">
          {produtos.map((produto) => (
            <CartaoProduto key={produto._id} produto={produto}
              onAdicionar={utilizador?.papel === 'comprador'
                ? () => carrinho.adicionar(produto)
                : undefined} />
          ))}
        </div>
      </section>
    </>
  );
}
