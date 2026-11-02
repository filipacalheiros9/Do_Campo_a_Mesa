import { useState } from 'react';

function apenasDigitos(valor) {
  return valor.replace(/\D/g, '');
}

export default function FormularioPagamento({
  aoConfirmar,
  aoVoltar,
  aProcessar = false,
  textoBotao = 'Pagar e confirmar'
}) {
  const [metodo, setMetodo] = useState('cartao');
  const [numeroCartao, setNumeroCartao] = useState('');
  const [validade, setValidade] = useState('');
  const [cvc, setCvc] = useState('');
  const [telefone, setTelefone] = useState('');
  const [erro, setErro] = useState('');

  function submeter(e) {
    e.preventDefault();
    setErro('');

    if (metodo === 'cartao'
        && (apenasDigitos(numeroCartao).length !== 16
          || !/^\d{2}\/\d{2}$/.test(validade)
          || !/^\d{3}$/.test(cvc))) {
      setErro('Preencha os dados do cartão no formato indicado.');
      return;
    }
    if (metodo === 'mbway' && !/^9\d{8}$/.test(apenasDigitos(telefone))) {
      setErro('Indique um número português com 9 algarismos.');
      return;
    }

    // Só o método segue para a API. Os restantes campos existem apenas para
    // tornar a demonstração realista e nunca são enviados nem guardados.
    aoConfirmar({ metodo });
  }

  return (
    <form className="card card-body mt-4" onSubmit={submeter}>
      <fieldset disabled={aProcessar}>
        <legend className="h5">Pagamento</legend>
        <div className="d-flex flex-wrap gap-3 mb-3">
          <div className="form-check">
            <input id="pagamento-cartao" name="metodoPagamento" type="radio"
              className="form-check-input" value="cartao" checked={metodo === 'cartao'}
              onChange={(e) => setMetodo(e.target.value)} />
            <label className="form-check-label" htmlFor="pagamento-cartao">Cartão</label>
          </div>
          <div className="form-check">
            <input id="pagamento-mbway" name="metodoPagamento" type="radio"
              className="form-check-input" value="mbway" checked={metodo === 'mbway'}
              onChange={(e) => setMetodo(e.target.value)} />
            <label className="form-check-label" htmlFor="pagamento-mbway">MB WAY</label>
          </div>
        </div>

        {metodo === 'cartao' ? (
          <div className="row g-3 mb-3">
            <div className="col-12">
              <label className="form-label" htmlFor="numero-cartao">Número do cartão</label>
              <input id="numero-cartao" className="form-control" inputMode="numeric"
                autoComplete="off" placeholder="4242 4242 4242 4242" value={numeroCartao}
                onChange={(e) => setNumeroCartao(e.target.value)} required />
            </div>
            <div className="col-sm-6">
              <label className="form-label" htmlFor="validade-cartao">Validade</label>
              <input id="validade-cartao" className="form-control" autoComplete="off"
                placeholder="12/30" value={validade} maxLength="5"
                onChange={(e) => setValidade(e.target.value)} required />
            </div>
            <div className="col-sm-6">
              <label className="form-label" htmlFor="cvc-cartao">CVC</label>
              <input id="cvc-cartao" className="form-control" inputMode="numeric"
                autoComplete="off" placeholder="123" value={cvc} maxLength="3"
                onChange={(e) => setCvc(e.target.value)} required />
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <label className="form-label" htmlFor="telefone-mbway">Número associado ao MB WAY</label>
            <input id="telefone-mbway" className="form-control" inputMode="tel"
              autoComplete="off" placeholder="910 000 000" value={telefone}
              onChange={(e) => setTelefone(e.target.value)} required />
          </div>
        )}

        {erro && <div className="alert alert-danger" role="alert">{erro}</div>}
        <div className="d-flex flex-wrap gap-2">
          {aoVoltar && (
            <button type="button" className="btn btn-outline-secondary" onClick={aoVoltar}>
              Voltar
            </button>
          )}
          <button type="submit" className="btn btn-success">
            {aProcessar ? 'A processar pagamento…' : textoBotao}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
