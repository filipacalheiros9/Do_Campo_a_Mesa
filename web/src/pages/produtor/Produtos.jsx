// Produtor: gestão inicial do catálogo com dados simulados (Passo 2)
import CartaoProduto from '../../components/CartaoProduto.jsx';
import PorImplementar from '../../components/PorImplementar.jsx';
import produtosSimulados from '../../data/produtos.json';

export default function ProdutosProdutor() {
  return (
    <>
      <header className="mb-4">
        <p className="texto-secundario mb-1">Área do produtor</p>
        <h1>Os meus produtos</h1>
        <p className="texto-secundario mb-0">
          Consulte o catálogo que será gerido através da API nas próximas etapas.
        </p>
      </header>

      <PorImplementar passo={3}>
        Criar, editar e remover produtos e atualizar preços e stock através da API REST.
      </PorImplementar>

      <section className="grelha-produtos" aria-label="Produtos simulados do produtor">
        {produtosSimulados.map((produto) => (
          <CartaoProduto key={produto._id} produto={produto} />
        ))}
      </section>
    </>
  );
}
