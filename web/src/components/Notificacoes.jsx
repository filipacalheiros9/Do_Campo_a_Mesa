import { Link } from 'react-router-dom';
import { useNotificacoes } from '../hooks/useNotificacoes.js';

export default function Notificacoes() {
  const { notificacoes, fecharToast } = useNotificacoes();

  return (
    <div className="toast-container notificacoes-tempo-real p-3" aria-live="polite" aria-atomic="true">
      {notificacoes.filter((notificacao) => notificacao.mostrarToast).map((notificacao) => (
        <div key={notificacao.id} className="toast show" role="status">
          <div className="toast-header">
            <strong className="me-auto">{notificacao.titulo}</strong>
            <button type="button" className="btn-close" aria-label="Fechar"
              onClick={() => fecharToast(notificacao.id)} />
          </div>
          <div className="toast-body">
            <p className="mb-2">{notificacao.mensagem}</p>
            {notificacao.ligacao && (
              <Link to={notificacao.ligacao} onClick={() => fecharToast(notificacao.id)}>
                Ver detalhes
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
