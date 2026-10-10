import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Registo() {
  const { registar } = useAuth();
  const navigate = useNavigate();
  const [dados, setDados] = useState({
    nome: '',
    email: '',
    password: '',
    papel: 'comprador',
    nomeExploracao: '',
    localidade: ''
  });
  const [erro, setErro] = useState('');
  const [aEnviar, setAEnviar] = useState(false);

  function alterar(campo, valor) {
    setDados((atuais) => ({ ...atuais, [campo]: valor }));
  }

  async function submeter(e) {
    e.preventDefault();
    setErro('');
    setAEnviar(true);

    try {
      const produtor = dados.papel === 'produtor';
      await registar({
        nome: dados.nome,
        email: dados.email,
        password: dados.password,
        papel: dados.papel,
        ...(produtor ? {
          produtor: {
            nomeExploracao: dados.nomeExploracao,
            localidade: dados.localidade
          }
        } : {})
      });

      navigate('/login', {
        replace: true,
        state: {
          mensagem: produtor
            ? 'Registo concluído. A conta de produtor aguarda validação do administrador.'
            : 'Registo concluído. Já pode iniciar sessão.'
        }
      });
    } catch (err) {
      setErro(err.message);
    } finally {
      setAEnviar(false);
    }
  }

  return (
    <form className="formulario-estreito" onSubmit={submeter}>
      <h1>Registar</h1>

      <label htmlFor="nome" className="form-label">Nome</label>
      <input id="nome" className="form-control mb-3" required maxLength="100"
        value={dados.nome} onChange={(e) => alterar('nome', e.target.value)} />

      <label htmlFor="email" className="form-label">Email</label>
      <input id="email" type="email" className="form-control mb-3" required
        value={dados.email} onChange={(e) => alterar('email', e.target.value)} />

      <label htmlFor="password" className="form-label">Password</label>
      <input id="password" type="password" className="form-control mb-3" required minLength="8"
        value={dados.password} onChange={(e) => alterar('password', e.target.value)} />
      <div className="form-text mb-3">Utilize pelo menos 8 caracteres.</div>

      <label htmlFor="papel" className="form-label">Tipo de conta</label>
      <select id="papel" className="form-select mb-3" value={dados.papel}
        onChange={(e) => alterar('papel', e.target.value)}>
        <option value="comprador">Comprador</option>
        <option value="produtor">Produtor</option>
      </select>

      {dados.papel === 'produtor' && (
        <>
          <label htmlFor="nomeExploracao" className="form-label">Nome da exploração</label>
          <input id="nomeExploracao" className="form-control mb-3" required maxLength="100"
            value={dados.nomeExploracao}
            onChange={(e) => alterar('nomeExploracao', e.target.value)} />

          <label htmlFor="localidade" className="form-label">Localidade</label>
          <input id="localidade" className="form-control mb-3" required maxLength="100"
            value={dados.localidade} onChange={(e) => alterar('localidade', e.target.value)} />
        </>
      )}

      {erro && <div className="alert alert-danger" role="alert">{erro}</div>}
      <button type="submit" className="btn btn-success w-100" disabled={aEnviar}>
        {aEnviar ? 'A registar…' : 'Criar conta'}
      </button>
    </form>
  );
}
