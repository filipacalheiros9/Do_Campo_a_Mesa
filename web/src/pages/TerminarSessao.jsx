import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function TerminarSessao() {
  const { sair } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    sair();
    navigate('/', { replace: true });
  }, [navigate, sair]);

  return null;
}
