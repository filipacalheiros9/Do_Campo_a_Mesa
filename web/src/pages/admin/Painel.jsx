import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { abrirBackoffice } from '../../utils/backoffice.js';

export default function PainelAdmin() {
  const { token } = useAuth();

  useEffect(() => {
    if (token) abrirBackoffice(token);
  }, [token]);

  return (
    <div className="formulario-estreito text-center">
      <h1>A abrir a administração…</h1>
      <p>A sessão está a ser encaminhada de forma segura para o backoffice Laravel.</p>
      <button className="btn btn-success" type="button" onClick={() => abrirBackoffice(token)}>
        Continuar para a administração
      </button>
    </div>
  );
}
