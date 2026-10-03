// Hook reutilizável para pedidos GET à API.
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export function useApi(caminho) {
  const { token } = useAuth();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [aCarregar, setACarregar] = useState(true);

  // Mantém a mesma função enquanto o caminho e o token não mudarem.
  const recarregar = useCallback(async () => {
    if (!caminho) {
      setDados(null);
      setErro('');
      setACarregar(false);
      return;
    }

    setACarregar(true);

    try {
      setDados(await api(caminho, { token }));
      setErro('');
    } catch (err) {
      setErro(err.message);
    } finally {
      setACarregar(false);
    }
  }, [caminho, token]);

  // Faz o primeiro pedido e repete-o quando o caminho ou a sessão mudarem.
  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { dados, erro, aCarregar, recarregar, setDados };
}
