import { useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function PerfilProdutor() {
  const { utilizador, token, guardarSessao } = useAuth();
  const perfil = utilizador.produtor || {};
  const [dados, setDados] = useState({
    nomeExploracao: perfil.nomeExploracao || '',
    descricao: perfil.descricao || '',
    localidade: perfil.localidade || '',
    codigoPostal: perfil.codigoPostal || ''
  });
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  async function guardar(e) {
    e.preventDefault();
    setErro('');
    try {
      const atualizado = await api('/producers/me', {
        metodo: 'PATCH', token,
        corpo: {
          nomeExploracao: dados.nomeExploracao,
          descricao: dados.descricao,
          localidade: dados.localidade,
          codigoPostal: dados.codigoPostal
        }
      });
      guardarSessao({ token, utilizador: atualizado });
      setMensagem('Página pública atualizada.');
    } catch (err) {
      setErro(err.message);
    }
  }

  return (
    <form className="formulario-estreito" onSubmit={guardar}>
      <header className="destaque mb-4">
        <h1 className="mb-0">Perfil público</h1>
      </header>
      <label className="form-label" htmlFor="exploracao">Nome da exploração</label>
      <input id="exploracao" className="form-control mb-3" required value={dados.nomeExploracao}
        onChange={(e) => setDados({ ...dados, nomeExploracao: e.target.value })} />
      <label className="form-label" htmlFor="descricao">Descrição</label>
      <textarea id="descricao" className="form-control mb-3" rows="5" maxLength="1000"
        value={dados.descricao} onChange={(e) => setDados({ ...dados, descricao: e.target.value })} />
      <label className="form-label" htmlFor="localidade">Localidade</label>
      <input id="localidade" className="form-control mb-3" required value={dados.localidade}
        onChange={(e) => setDados({ ...dados, localidade: e.target.value })} />
      <label className="form-label" htmlFor="codigo-postal">Código postal</label>
      <input id="codigo-postal" className="form-control mb-3" required inputMode="numeric"
        pattern="[0-9]{4}-[0-9]{3}" placeholder="0000-000" maxLength="8"
        value={dados.codigoPostal} onChange={(e) => setDados({ ...dados, codigoPostal: e.target.value })} />
      {mensagem && <div className="alert alert-success">{mensagem}</div>}
      {erro && <div className="alert alert-danger">{erro}</div>}
      <button className="btn btn-success w-100">Guardar perfil</button>
    </form>
  );
}
