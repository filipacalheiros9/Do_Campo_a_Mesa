// Comprador: sala de leilão em tempo real
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLeilao } from '../hooks/useLeilao.js';
import { formatarTempo, useContagem } from '../hooks/useContagem.js';

const euros = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
const cent = (valor) => Math.round(valor * 100) / 100;

export default function SalaLeilao() {
  const { id } = useParams();
  const { utilizador } = useAuth();
  const {
    leilao, atual, licitacoes, participantes, erro, resultado, offset, licitar
  } = useLeilao(id);
  const restante = useContagem(leilao?.terminaEm, offset);
  const [valor, setValor] = useState('');
  const valorAtual = Number(atual?.valor ?? leilao?.precoBase ?? 0);
  const incremento = Number(leilao?.incremento ?? 0);
  const minimo = cent(valorAtual + incremento);
  const souComprador = utilizador?.papel === 'comprador';
  const estouAGanhar = souComprador
    && String(atual?.comprador || '') === String(utilizador?._id || '');
  const ativo = leilao?.estado === 'ativo' && restante > 0;
  const produtor = leilao?.produtor;
  const nomeProdutor = produtor?.produtor?.nomeExploracao || produtor?.nome || '—';
  const nomeVencedor = atual?.nome || (estouAGanhar ? utilizador?.nome : null) || 'Comprador';

  useEffect(() => {
    if (minimo > 0) setValor(minimo.toFixed(2));
  }, [minimo]);

  const escolherAtalho = (multiplicador) => {
    setValor(cent(valorAtual + multiplicador * incremento).toFixed(2));
  };

  const enviarLicitacao = (evento) => {
    evento.preventDefault();
    licitar(Number(valor));
  };

  if (!leilao) {
    return <div className="alert alert-light border">A carregar o leilão…</div>;
  }

  return (
    <div className="sala-leilao">
      <section className="card overflow-hidden">
        {leilao.produto?.imagemUrl && (
          <img className="sala-leilao__foto" src={leilao.produto.imagemUrl} alt={leilao.lote} />
        )}

        <div className="card-body p-4">
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <span className={`badge estado-leilao estado-leilao--${leilao.estado}`}>
              {leilao.estado}
            </span>
            <span className="texto-secundario">{participantes} a assistir</span>
          </div>

          <h1 className="mb-2">{leilao.lote}</h1>
          <p className="texto-secundario mb-1">
            Produtor: <strong className="text-body">{nomeProdutor}</strong>
            {produtor?.produtor?.localidade && ` · ${produtor.produtor.localidade}`}
          </p>
          {leilao.quantidade && <p className="mb-2">Quantidade: {leilao.quantidade}</p>}
          {leilao.descricao && <p>{leilao.descricao}</p>}

          <hr />
          <h2 className="h4 mb-3">Histórico de licitações</h2>
          {licitacoes.length ? (
            <div className="table-responsive">
              <table className="table table-sm align-middle historico-licitacoes">
                <thead>
                  <tr><th>Comprador</th><th>Hora</th><th className="text-end">Valor</th></tr>
                </thead>
                <tbody>
                  {licitacoes.map((licitacao) => (
                    <tr key={licitacao._id}>
                      <td>{licitacao.nome}</td>
                      <td>{new Date(licitacao.createdAt || licitacao.em).toLocaleTimeString('pt-PT')}</td>
                      <td className="text-end fw-semibold">{euros.format(licitacao.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="texto-secundario mb-0">Ainda não existem licitações.</p>}
        </div>
      </section>

      <aside className="card p-4 sala-leilao__painel">
        <p className="texto-secundario small mb-0">Tempo restante</p>
        <p className="contagem-leilao mb-3" aria-live="off">
          {leilao.estado === 'terminado' ? 'Terminado' : formatarTempo(restante)}
        </p>
        <p className="texto-secundario small mb-0">Licitação atual</p>
        <p className="valor-atual mb-1">{euros.format(valorAtual)}</p>
        {leilao.estado !== 'terminado' && (
          <p className="texto-secundario small">Próxima licitação mínima: {euros.format(minimo)}</p>
        )}

        {souComprador && ativo && (
          <form onSubmit={enviarLicitacao}>
            <div className="d-flex gap-2 mb-2">
              {[1, 2, 5].map((multiplicador) => (
                <button key={multiplicador} type="button" className="btn btn-outline-secondary flex-fill"
                  onClick={() => escolherAtalho(multiplicador)}>
                  +{multiplicador}×
                </button>
              ))}
            </div>
            <label htmlFor="valor" className="form-label">O seu valor (€)</label>
            <input id="valor" type="number" step="0.01" min={minimo} className="form-control mb-2"
              value={valor} onChange={(e) => setValor(e.target.value)} required />
            <button type="submit" className="btn btn-success w-100">Licitar</button>
          </form>
        )}

        {souComprador && ativo && atual?.comprador && (
          <div className={`alert ${estouAGanhar ? 'alert-success' : 'alert-light border'} mt-3 mb-0`}>
            {estouAGanhar
              ? 'A sua licitação é a mais alta.'
              : `${atual.nome} tem a licitação mais alta.`}
          </div>
        )}

        {leilao.estado === 'agendado' && (
          <div className="alert alert-light border mb-0">O leilão ainda não começou.</div>
        )}

        {leilao.estado === 'terminado' && (
          <div className={`alert ${estouAGanhar ? 'alert-success' : 'alert-light border'} mb-0`}>
            {resultado?.vencedor || atual?.comprador ? (
              <>
                <strong>Vencedor:</strong> {nomeVencedor}<br />
                <strong>Valor:</strong> {euros.format(resultado?.valor ?? valorAtual)}
              </>
            ) : 'O leilão terminou sem licitações.'}
          </div>
        )}

        {!souComprador && ativo && (
          <p className="texto-secundario small mb-0">Apenas compradores podem licitar.</p>
        )}
        {erro && <div className="alert alert-warning mt-2 mb-0">{erro}</div>}
      </aside>
    </div>
  );
}
