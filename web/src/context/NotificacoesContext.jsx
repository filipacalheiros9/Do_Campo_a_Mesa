import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useEventoSocket } from './SocketContext.jsx';
import { useAuth } from './AuthContext.jsx';

const NotificacoesContext = createContext(null);
const euros = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });

export function NotificacoesProvider({ children }) {
  const [notificacoes, setNotificacoes] = useState([]);
  const temporizadores = useRef(new Map());
  const proximoId = useRef(0);
  const { token, utilizador, guardarSessao } = useAuth();

  const fecharToast = useCallback((id) => {
    clearTimeout(temporizadores.current.get(id));
    temporizadores.current.delete(id);
    setNotificacoes((lista) => lista.map((item) => (
      item.id === id ? { ...item, mostrarToast: false } : item
    )));
  }, []);

  const remover = useCallback((id) => {
    clearTimeout(temporizadores.current.get(id));
    temporizadores.current.delete(id);
    setNotificacoes((lista) => lista.filter((item) => item.id !== id));
  }, []);

  const adicionar = useCallback((titulo, mensagem, ligacao) => {
    proximoId.current += 1;
    const id = `${Date.now()}-${proximoId.current}`;
    setNotificacoes((lista) => [{
      id, titulo, mensagem, ligacao, criadaEm: new Date().toISOString(), lida: false, mostrarToast: true
    }, ...lista].slice(0, 50));
    temporizadores.current.set(id, setTimeout(() => fecharToast(id), 7000));
  }, [fecharToast]);

  const marcarTodasComoLidas = useCallback(() => {
    setNotificacoes((lista) => lista.map((item) => ({ ...item, lida: true })));
  }, []);

  const limpar = useCallback(() => {
    temporizadores.current.forEach(clearTimeout);
    temporizadores.current.clear();
    setNotificacoes([]);
  }, []);

  useEffect(() => () => {
    temporizadores.current.forEach(clearTimeout);
    temporizadores.current.clear();
  }, []);

  useEffect(() => {
    if (!utilizador) limpar();
  }, [utilizador, limpar]);

  useEventoSocket('encomenda-atualizada', (evento) => {
    const origem = evento.produtor ? `${evento.produtor} atualizou` : 'Foi atualizada';
    adicionar('Encomenda atualizada', `${origem} a sua encomenda para o estado «${evento.estado}».`, '/encomendas');
  });

  useEventoSocket('nova-encomenda', (evento) => {
    adicionar('Nova encomenda', `Recebeu uma nova encomenda no valor de ${euros.format(evento.total)}.`, '/produtor');
  });

  useEventoSocket('leilao-ganho', (evento) => {
    adicionar('Leilão ganho', `Ganhou o leilão «${evento.lote}» por ${euros.format(evento.valor)}.`, '/encomendas');
  });

  useEventoSocket('leilao-terminado', (evento) => {
    adicionar('Leilão terminado', `O leilão «${evento.lote}» terminou em ${euros.format(evento.valor)}.`, '/produtor');
  });

  useEventoSocket('nova-avaliacao', (evento) => {
    adicionar('Nova avaliação', `Recebeu uma avaliação de ${evento.classificacao} em 5.`, '/produtor');
  });

  useEventoSocket('conta-validada', (evento) => {
    if (token && utilizador?.papel === 'produtor') {
      guardarSessao({
        token,
        utilizador: {
          ...utilizador,
          produtor: { ...utilizador.produtor, validado: evento.aprovado }
        }
      });
    }
    adicionar(
      'Validação da conta',
      evento.aprovado ? 'A sua conta de produtor foi validada.' : 'A validação da sua conta de produtor foi retirada.',
      '/produtor'
    );
  });

  const naoLidas = notificacoes.filter((item) => !item.lida).length;

  return (
    <NotificacoesContext.Provider value={{
      notificacoes, naoLidas, fecharToast, remover, marcarTodasComoLidas, limpar
    }}>
      {children}
    </NotificacoesContext.Provider>
  );
}

export const useNotificacoes = () => useContext(NotificacoesContext);
