import { useState } from 'react';
import { useCarrinho } from '../context/CarrinhoContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

const euro = (valor) => valor.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });

export default function Carrinho() {
  const {
    linhas,
    gruposPorProdutor,
    alterarQuantidade,
    remover,
    removerProdutos,
    esvaziar,
    total
  } = useCarrinho();
  const { token } = useAuth();
  const [tipoEntrega, setTipoEntrega] = useState('levantamento');
  const [morada, setMorada] = useState('');
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  async function finalizarCompra(e) {
    e.preventDefault();
    // Evita pedidos duplicados enquanto o primeiro envio ainda está a decorrer.
    if (linhas.length === 0 || aEnviar) return;
    if (tipoEntrega === 'entrega' && !morada.trim()) {
      setErro('Indique a morada de entrega.');
      return;
    }

    setAEnviar(true);
    setErro('');
    setMensagem('');

    const grupos = gruposPorProdutor;
    // Os pedidos são independentes porque cada encomenda pertence a um só produtor.
    const resultados = await Promise.allSettled(grupos.map((grupo) =>
      api('/orders', {
        metodo: 'POST',
        token,
        corpo: {
          linhas: grupo.linhas.map(({ produto, quantidade }) => ({
            produto: produto._id,
            quantidade
          })),
          entrega: {
            tipo: tipoEntrega,
            ...(tipoEntrega === 'entrega' ? { morada: morada.trim() } : {})
          }
        }
      })
    ));

    const produtosEncomendados = [];
    // Associa cada resultado ao grupo que ocupava a mesma posição no array.
    resultados.forEach((resultado, indice) => {
      if (resultado.status === 'fulfilled') {
        grupos[indice].linhas.forEach(({ produto }) => produtosEncomendados.push(produto._id));
      }
    });

    const criadas = resultados.filter((resultado) => resultado.status === 'fulfilled').length;
    const falhas = resultados.filter((resultado) => resultado.status === 'rejected');

    if (criadas === grupos.length) {
      // Todas foram criadas: já não é necessário manter qualquer artigo.
      esvaziar();
      setMensagem(`${criadas} encomenda${criadas === 1 ? '' : 's'} criada${criadas === 1 ? '' : 's'} com sucesso.`);
    } else {
      // Mantém no carrinho apenas os grupos que falharam, evitando encomendas repetidas.
      removerProdutos(produtosEncomendados);
      const motivo = falhas[0]?.reason?.message || 'Não foi possível criar todas as encomendas.';
      setErro(criadas > 0
        ? `${criadas} encomenda(s) criada(s). As restantes ficaram no carrinho. ${motivo}`
        : motivo);
    }

    setAEnviar(false);
  }

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

      {mensagem && <div className="alert alert-success" role="status">{mensagem}</div>}
      {erro && <div className="alert alert-danger" role="alert">{erro}</div>}

      {linhas.length > 0 && (
        <form className="card card-body mt-4" onSubmit={finalizarCompra}>
          <fieldset disabled={aEnviar}>
            <legend className="h5">Como pretende receber a encomenda?</legend>
            <div className="form-check">
              <input id="levantamento" name="tipoEntrega" type="radio" className="form-check-input"
                value="levantamento" checked={tipoEntrega === 'levantamento'}
                onChange={(e) => setTipoEntrega(e.target.value)} />
              <label className="form-check-label" htmlFor="levantamento">Levantamento no produtor</label>
            </div>
            <div className="form-check mb-3">
              <input id="entrega" name="tipoEntrega" type="radio" className="form-check-input"
                value="entrega" checked={tipoEntrega === 'entrega'}
                onChange={(e) => setTipoEntrega(e.target.value)} />
              <label className="form-check-label" htmlFor="entrega">Entrega ao domicílio</label>
            </div>

            {tipoEntrega === 'entrega' && (
              <div className="mb-3">
                <label className="form-label" htmlFor="morada">Morada de entrega</label>
                <input id="morada" className="form-control" value={morada}
                  onChange={(e) => setMorada(e.target.value)} required />
              </div>
            )}

            <p className="texto-secundario small">
              {/* Esta contagem ajuda o comprador a perceber porque receberá vários registos. */}
              Será criada uma encomenda por produtor ({gruposPorProdutor.length} no total).
            </p>
            <button type="submit" className="btn btn-success">
              {aEnviar ? 'A criar encomendas…' : 'Confirmar encomenda'}
            </button>
          </fieldset>
        </form>
      )}
    </>
  );
}
