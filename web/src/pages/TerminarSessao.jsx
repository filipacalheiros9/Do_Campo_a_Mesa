import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function TerminarSessao() {
  const { sair } = useAuth();
  useEffect(() => {
    sair();
  }, [sair]);

  return null;
}
