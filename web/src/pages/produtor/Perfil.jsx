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
  const [passwords, setPasswords] = useState({ atual: '', nova: '', confirmacao: '' });
  const [mensagemPassword, setMensagemPassword] = useState('');
  const [erroPassword, setErroPassword] = useState('');
  const [aAlterarPassword, setAAlterarPassword] = useState(false);

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

  async function alterarPassword(e) {
    e.preventDefault();
    setMensagemPassword('');
    setErroPassword('');

    if (passwords.nova !== passwords.confirmacao) {
      setErroPassword('A confirmação não coincide com a nova palavra-passe.');
      return;
    }

    setAAlterarPassword(true);
    try {
      await api('/auth/password', {
        metodo: 'PATCH', token,
        corpo: { passwordAtual: passwords.atual, novaPassword: passwords.nova }
      });
      setPasswords({ atual: '', nova: '', confirmacao: '' });
      setMensagemPassword('Palavra-passe alterada.');
    } catch (err) {
      setErroPassword(err.message);
    } finally {
      setAAlterarPassword(false);
    }
  }

  return (
    <div className="formulario-estreito">
      <header className="destaque mb-4">
        <h1 className="mb-0">Perfil público</h1>
      </header>

      <form className="card card-body mb-4" onSubmit={guardar}>
        <h2 className="h5 mb-3">Dados da página pública</h2>
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

      <form className="card card-body" onSubmit={alterarPassword}>
        <h2 className="h5 mb-3">Alterar palavra-passe</h2>
        <label className="form-label" htmlFor="produtor-password-atual">Palavra-passe atual</label>
        <input id="produtor-password-atual" type="password" autoComplete="current-password"
          className="form-control mb-3" required value={passwords.atual}
          onChange={(e) => setPasswords({ ...passwords, atual: e.target.value })} />

        <label className="form-label" htmlFor="produtor-password-nova">Nova palavra-passe</label>
        <input id="produtor-password-nova" type="password" autoComplete="new-password"
          className="form-control mb-3" required minLength="8" value={passwords.nova}
          onChange={(e) => setPasswords({ ...passwords, nova: e.target.value })} />

        <label className="form-label" htmlFor="produtor-password-confirmacao">Confirmar nova palavra-passe</label>
        <input id="produtor-password-confirmacao" type="password" autoComplete="new-password"
          className="form-control mb-3" required minLength="8" value={passwords.confirmacao}
          onChange={(e) => setPasswords({ ...passwords, confirmacao: e.target.value })} />

        {mensagemPassword && <div className="alert alert-success">{mensagemPassword}</div>}
        {erroPassword && <div className="alert alert-danger">{erroPassword}</div>}
        <button className="btn btn-outline-success w-100" disabled={aAlterarPassword}>
          {aAlterarPassword ? 'A alterar…' : 'Alterar palavra-passe'}
        </button>
      </form>
    </div>
  );
}
