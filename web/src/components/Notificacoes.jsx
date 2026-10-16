import { Link } from 'react-router-dom';
import { useNotificacoes } from '../hooks/useNotificacoes.js';

export default function Notificacoes() {
  const { notificacoes, remover } = useNotificacoes();

  return (
    <div className="toast-container notificacoes-tempo-real p-3" aria-live="polite" aria-atomic="true">
      {notificacoes.map((notificacao) => (
        <div key={notificacao.id} className="toast show" role="status">
          <div className="toast-header">
            <strong className="me-auto">{notificacao.titulo}</strong>
            <button type="button" className="btn-close" aria-label="Fechar"
              onClick={() => remover(notificacao.id)} />
          </div>
          <div className="toast-body">
            <p className="mb-2">{notificacao.mensagem}</p>
            {notificacao.ligacao && (
              <Link to={notificacao.ligacao} onClick={() => remover(notificacao.id)}>
                Ver detalhes
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
