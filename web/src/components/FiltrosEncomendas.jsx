export const FILTROS_ENCOMENDAS_INICIAIS = { pagamento: '', data: '', estado: '' };

export function filtrarEncomendas(encomendas, { pagamento, data, estado }) {
  const diaSelecionado = data && new Date(`${data}T00:00:00`).toDateString();

  return encomendas.filter((encomenda) => {
    const paga = encomenda.pagamento?.estado === 'pago';
    const correspondeAoPagamento = !pagamento || (paga
      ? pagamento === 'pago' || encomenda.pagamento.metodo === pagamento
      : pagamento === 'por_pagar');

    return correspondeAoPagamento
      && (!diaSelecionado || new Date(encomenda.createdAt).toDateString() === diaSelecionado)
      && (!estado || encomenda.estado === estado);
  });
}

export default function FiltrosEncomendas({ filtros, aoAlterar, rotuloEstado = 'Estado da encomenda' }) {
  const { pagamento, data, estado } = filtros;
  const alterar = (campo) => (e) => aoAlterar({ ...filtros, [campo]: e.target.value });

  return (
    <section className="card card-body mb-4" aria-label="Filtros das encomendas">
      <div className="row g-3 align-items-end">
        <div className="col-sm">
          <label className="form-label" htmlFor="filtro-pagamento">Pagamento</label>
          <select id="filtro-pagamento" className="form-select" value={pagamento} onChange={alterar('pagamento')}>
            <option value="">Todos</option>
            <option value="por_pagar">Por pagar</option>
            <option value="pago">Pagas</option>
            <option value="cartao">Pagas por cartão</option>
            <option value="mbway">Pagas por MB WAY</option>
          </select>
        </div>
        <div className="col-sm">
          <label className="form-label" htmlFor="filtro-data">Data da encomenda</label>
          <input id="filtro-data" type="date" className="form-control" value={data} onChange={alterar('data')} />
        </div>
        <div className="col-sm">
          <label className="form-label" htmlFor="filtro-estado">{rotuloEstado}</label>
          <select id="filtro-estado" className="form-select" value={estado} onChange={alterar('estado')}>
            <option value="">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="confirmada">Confirmada</option>
            <option value="pronta">Pronta</option>
            <option value="entregue">Entregue</option>
          </select>
        </div>
        <div className="col-lg-auto">
          <button type="button" className="btn btn-sm btn-danger" disabled={!(pagamento || data || estado)}
            onClick={() => aoAlterar(FILTROS_ENCOMENDAS_INICIAIS)}>
            Limpar filtros
          </button>
        </div>
      </div>
    </section>
  );
}
