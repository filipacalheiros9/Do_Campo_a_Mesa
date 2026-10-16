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
    lat: perfil.localizacao?.lat ?? '',
    lng: perfil.localizacao?.lng ?? ''
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
          ...(dados.lat !== '' && dados.lng !== '' ? {
            localizacao: { lat: Number(dados.lat), lng: Number(dados.lng) }
          } : {})
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
      <h1>Perfil público</h1>
      <label className="form-label" htmlFor="exploracao">Nome da exploração</label>
      <input id="exploracao" className="form-control mb-3" required value={dados.nomeExploracao}
        onChange={(e) => setDados({ ...dados, nomeExploracao: e.target.value })} />
      <label className="form-label" htmlFor="descricao">Descrição</label>
      <textarea id="descricao" className="form-control mb-3" rows="5" maxLength="1000"
        value={dados.descricao} onChange={(e) => setDados({ ...dados, descricao: e.target.value })} />
      <label className="form-label" htmlFor="localidade">Localidade</label>
      <input id="localidade" className="form-control mb-3" required value={dados.localidade}
        onChange={(e) => setDados({ ...dados, localidade: e.target.value })} />
      <div className="row g-3 mb-3">
        <div className="col-6"><label className="form-label" htmlFor="latitude">Latitude</label>
          <input id="latitude" type="number" step="any" min="-90" max="90" className="form-control"
            value={dados.lat} onChange={(e) => setDados({ ...dados, lat: e.target.value })} /></div>
        <div className="col-6"><label className="form-label" htmlFor="longitude">Longitude</label>
          <input id="longitude" type="number" step="any" min="-180" max="180" className="form-control"
            value={dados.lng} onChange={(e) => setDados({ ...dados, lng: e.target.value })} /></div>
      </div>
      {mensagem && <div className="alert alert-success">{mensagem}</div>}
      {erro && <div className="alert alert-danger">{erro}</div>}
      <button className="btn btn-success w-100">Guardar perfil</button>
    </form>
  );
}
