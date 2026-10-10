import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const INICIO = {
  comprador: '/',
  produtor: '/produtor',
  admin: '/admin'
};

export default function Login() {
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dados, setDados] = useState({ email: '', password: '' });
  const [erro, setErro] = useState('');
  const [aEnviar, setAEnviar] = useState(false);

  async function submeter(e) {
    e.preventDefault();
    if (aEnviar) return;
    setErro('');
    setAEnviar(true);

    try {
      const utilizador = await entrar(dados.email, dados.password);
      // O comprador pode regressar ao carrinho; os outros papéis entram no respetivo painel.
      const destino = utilizador.papel === 'comprador'
        ? (location.state?.de || INICIO.comprador)
        : (INICIO[utilizador.papel] || '/');
      navigate(destino, { replace: true });
    } catch (err) {
      setErro(err.message);
    } finally {
      setAEnviar(false);
    }
  }

  return (
    <form className="formulario-estreito" onSubmit={submeter}>
      <h1>Entrar</h1>
      {location.state?.mensagem && (
        <div className="alert alert-success" role="status">{location.state.mensagem}</div>
      )}
      <label htmlFor="email" className="form-label">Email</label>
      <input id="email" type="email" className="form-control mb-3" required
        value={dados.email} onChange={(e) => setDados({ ...dados, email: e.target.value })} />
      <label htmlFor="password" className="form-label">Password</label>
      <input id="password" type="password" className="form-control mb-3" required
        value={dados.password} onChange={(e) => setDados({ ...dados, password: e.target.value })} />
      {erro && <div className="alert alert-danger" role="alert">{erro}</div>}
      <button type="submit" className="btn btn-success w-100" disabled={aEnviar}>
        {aEnviar ? 'A entrar…' : 'Entrar'}
      </button>
    </form>
  );
}
