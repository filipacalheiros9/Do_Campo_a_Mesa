import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function PerfilComprador() {
  const { utilizador, token, guardarSessao } = useAuth();
  const [dados, setDados] = useState({ nome: utilizador.nome, email: utilizador.email });
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [aGuardar, setAGuardar] = useState(false);
  const [passwords, setPasswords] = useState({ atual: '', nova: '', confirmacao: '' });
  const [mensagemPassword, setMensagemPassword] = useState('');
  const [erroPassword, setErroPassword] = useState('');
  const [aAlterarPassword, setAAlterarPassword] = useState(false);

  async function guardar(evento) {
    evento.preventDefault();
    setMensagem('');
    setErro('');
    setAGuardar(true);
    try {
      const sessao = await api('/auth/eu', {
        metodo: 'PATCH', token,
        corpo: { nome: dados.nome.trim(), email: dados.email.trim() }
      });
      guardarSessao(sessao);
      setMensagem('Perfil atualizado.');
    } catch (err) {
      setErro(err.message);
    } finally {
      setAGuardar(false);
    }
  }

  async function alterarPassword(evento) {
    evento.preventDefault();
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
        <h1 className="mb-1">O meu perfil</h1>
        <p className="texto-secundario mb-0">Atualize os dados associados à sua conta.</p>
      </header>

      <form onSubmit={guardar} className="card card-body mb-4">
        <h2 className="h5 mb-3">Dados pessoais</h2>

        <label className="form-label" htmlFor="perfil-nome">Nome</label>
        <input id="perfil-nome" className="form-control mb-3" required maxLength="100"
          value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} />

        <label className="form-label" htmlFor="perfil-email">Email</label>
        <input id="perfil-email" type="email" className="form-control mb-3" required
          value={dados.email} onChange={(e) => setDados({ ...dados, email: e.target.value })} />

        {mensagem && <div className="alert alert-success">{mensagem}</div>}
        {erro && <div className="alert alert-danger">{erro}</div>}
        <button className="btn btn-success w-100" disabled={aGuardar}>
          {aGuardar ? 'A guardar…' : 'Guardar perfil'}
        </button>
      </form>

      <form onSubmit={alterarPassword} className="card card-body">
        <h2 className="h5 mb-3">Alterar palavra-passe</h2>
        <label className="form-label" htmlFor="password-atual">Palavra-passe atual</label>
        <input id="password-atual" type="password" autoComplete="current-password"
          className="form-control mb-3" required value={passwords.atual}
          onChange={(e) => setPasswords({ ...passwords, atual: e.target.value })} />

        <label className="form-label" htmlFor="password-nova">Nova palavra-passe</label>
        <input id="password-nova" type="password" autoComplete="new-password"
          className="form-control mb-3" required minLength="8" value={passwords.nova}
          onChange={(e) => setPasswords({ ...passwords, nova: e.target.value })} />

        <label className="form-label" htmlFor="password-confirmacao">Confirmar nova palavra-passe</label>
        <input id="password-confirmacao" type="password" autoComplete="new-password"
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
