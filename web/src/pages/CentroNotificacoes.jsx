import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotificacoes } from '../hooks/useNotificacoes.js';

export default function CentroNotificacoes() {
  const { notificacoes, remover, marcarTodasComoLidas, limpar } = useNotificacoes();

  useEffect(() => {
    marcarTodasComoLidas();
  }, [marcarTodasComoLidas]);

  return (
    <>
      <header className="destaque d-flex justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="mb-1">Notificações</h1>
          <p className="texto-secundario mb-0">Atualizações da sua conta, encomendas e leilões.</p>
        </div>
        {notificacoes.length > 0 && (
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={limpar}>Limpar</button>
        )}
      </header>

      {!notificacoes.length && (
        <div className="alert alert-light border">Ainda não recebeu notificações nesta sessão.</div>
      )}

      <div className="list-group">
        {notificacoes.map((notificacao) => (
          <article className="list-group-item" key={notificacao.id}>
            <div className="d-flex justify-content-between align-items-start gap-3">
              <div>
                <strong>{notificacao.titulo}</strong>
                <p className="mb-1">{notificacao.mensagem}</p>
                <time className="small texto-secundario" dateTime={notificacao.criadaEm}>
                  {new Date(notificacao.criadaEm).toLocaleString('pt-PT')}
                </time>
              </div>
              <button type="button" className="btn-close" aria-label="Eliminar notificação"
                onClick={() => remover(notificacao.id)} />
            </div>
            {notificacao.ligacao && <Link to={notificacao.ligacao}>Ver detalhes</Link>}
          </article>
        ))}
      </div>
    </>
  );
}
