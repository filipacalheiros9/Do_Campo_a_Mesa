import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function FormularioAvaliacao({ encomendaId, produto, titulo, aoRegistar }) {
  const { token } = useAuth();
  const [dados, setDados] = useState({ classificacao: 5, comentario: '' });
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [aEnviar, setAEnviar] = useState(false);

  async function submeter(e) {
    e.preventDefault();
    setAEnviar(true);
    setErro('');
    try {
      await api('/reviews', {
        metodo: 'POST',
        token,
        corpo: {
          encomenda: encomendaId,
          ...(produto ? { produto } : {}),
          classificacao: Number(dados.classificacao),
          comentario: dados.comentario.trim()
        }
      });
      setMensagem('Avaliação registada. Obrigado!');
      aoRegistar?.();
    } catch (err) {
      setErro(err.message);
    } finally {
      setAEnviar(false);
    }
  }

  if (mensagem) return <div className="alert alert-success py-2 mb-2">{mensagem}</div>;

  return (
    <form className="border rounded p-3 mb-2" onSubmit={submeter}>
      <strong className="d-block mb-2">{titulo}</strong>
      <div className="row g-2 align-items-end">
        <div className="col-sm-3">
          <label className="form-label" htmlFor={`classificacao-${encomendaId}-${produto || 'produtor'}`}>Classificação</label>
          <select id={`classificacao-${encomendaId}-${produto || 'produtor'}`} className="form-select"
            value={dados.classificacao} onChange={(e) => setDados({ ...dados, classificacao: e.target.value })}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} estrela{n === 1 ? '' : 's'}</option>)}
          </select>
        </div>
        <div className="col-sm-7">
          <label className="form-label" htmlFor={`comentario-${encomendaId}-${produto || 'produtor'}`}>Comentário</label>
          <input id={`comentario-${encomendaId}-${produto || 'produtor'}`} className="form-control" maxLength="1000"
            value={dados.comentario} onChange={(e) => setDados({ ...dados, comentario: e.target.value })} />
        </div>
        <div className="col-sm-2">
          <button className="btn btn-outline-success w-100" disabled={aEnviar} type="submit">
            {aEnviar ? 'A enviar…' : 'Avaliar'}
          </button>
        </div>
      </div>
      {erro && <div className="text-danger small mt-2">{erro}</div>}
    </form>
  );
}
