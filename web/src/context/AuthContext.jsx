// Estado global da sessão (utilizador + token)
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [sessao, setSessao] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sessao')) || null; } catch { return null; }
  });
  const tokenAtivo = useRef(sessao?.token || null);

  // A API confirma as credenciais e devolve o JWT e os dados públicos do utilizador.
  async function entrar(email, password) {
    const dados = await api('/auth/login', {
      metodo: 'POST',
      corpo: { email, password }
    });

    // Guardar a sessão permite manter o login depois de atualizar a página.
    guardarSessao(dados);
    return dados;
  }

  async function registar(corpo) {
    return api('/auth/registo', {
      metodo: 'POST',
      corpo
    });
  }

  const sair = useCallback(() => {
    tokenAtivo.current = null;
    localStorage.removeItem('sessao');
    setSessao(null);
    navigate('/', { replace: true });
  }, [navigate]);

  function guardarSessao(nova) {
    tokenAtivo.current = nova?.token || null;
    localStorage.setItem('sessao', JSON.stringify(nova));
    setSessao(nova);
  }

  useEffect(() => {
    const tokenGuardado = sessao?.token;
    if (!tokenGuardado) return undefined;

    let ativo = true;

    // Confirma a sessão ao abrir a SPA e atualiza os dados públicos do utilizador.
    async function atualizar() {
      if (tokenAtivo.current !== tokenGuardado) return;

      try {
        const utilizador = await api('/auth/eu', { token: tokenGuardado });
        // O utilizador pode ter terminado a sessão enquanto este pedido decorria.
        if (ativo && tokenAtivo.current === tokenGuardado) {
          guardarSessao({ token: tokenGuardado, utilizador });
        }
      } catch (err) {
        // Uma falha de rede pode ser temporária; um 401 confirma que o token já não serve.
        if (ativo && tokenAtivo.current === tokenGuardado && err.codigo === 401) sair();
      }
    }

    atualizar();
    return () => { ativo = false; };
    // Esta verificação deve acontecer apenas quando o AuthProvider arranca.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{
      utilizador: sessao?.utilizador || null,
      token: sessao?.token || null,
      entrar, registar, sair, guardarSessao
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
