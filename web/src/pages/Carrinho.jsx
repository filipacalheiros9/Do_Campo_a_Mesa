import { useCarrinho } from '../context/CarrinhoContext.jsx';
import PorImplementar from '../components/PorImplementar.jsx';

const euro = (valor) => valor.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });

export default function Carrinho() {
  const {
    linhas,
    gruposPorProdutor,
    alterarQuantidade,
    remover,
    esvaziar,
    total
  } = useCarrinho();

  return (
    <>
      <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
        <h1 className="mb-0">Carrinho</h1>
        {linhas.length > 0 && (
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={esvaziar}>
            Esvaziar carrinho
          </button>
        )}
      </div>

      {linhas.length === 0 ? <p>O carrinho está vazio.</p> : (
        gruposPorProdutor.map((grupo) => (
          <section key={grupo.produtor?._id || grupo.produtor?.nome || 'sem-produtor'} className="mb-4"
            aria-label={`Produtos de ${grupo.produtor?.nome || 'produtor'}`}>
            <h2 className="h5">
              {grupo.produtor?.nome || 'Produtor'}
            </h2>
            <ul className="list-group mb-2">
              {grupo.linhas.map(({ produto, quantidade }) => (
                <li key={produto._id} className="list-group-item">
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                    <div>
                      <strong>{produto.nome}</strong>
                      <div className="texto-secundario small">{euro(produto.preco)} / {produto.unidade}</div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <label htmlFor={`quantidade-${produto._id}`} className="visually-hidden">
                        Quantidade de {produto.nome}
                      </label>
                      <input id={`quantidade-${produto._id}`} type="number" min="1" step="1"
                        className="form-control form-control-sm" style={{ width: '5rem' }}
                        value={quantidade}
                        onChange={(e) => alterarQuantidade(produto._id, e.target.value)} />
                      <span className="fw-semibold text-nowrap">{euro(produto.preco * quantidade)}</span>
                      <button type="button" className="btn btn-sm btn-outline-danger"
                        onClick={() => remover(produto._id)}>
                        Remover
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-end fw-semibold mb-0">Subtotal: {euro(grupo.total)}</p>
          </section>
        ))
      )}
      <p className="fs-5 fw-bold text-end">Total: {euro(total)}</p>
      <PorImplementar passo={3}>
        escolher levantamento ou entrega e submeter com <code>POST /api/orders</code> (uma encomenda por produtor).
      </PorImplementar>
    </>
  );
}
