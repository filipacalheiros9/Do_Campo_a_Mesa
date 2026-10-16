import { useCallback, useEffect, useRef, useState } from 'react';
import { useEventoSocket } from '../context/SocketContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const euros = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });

export function useNotificacoes() {
  const [notificacoes, setNotificacoes] = useState([]);
  const temporizadores = useRef(new Map());
  const proximoId = useRef(0);
  const { token, utilizador, guardarSessao } = useAuth();

  const remover = useCallback((id) => {
    clearTimeout(temporizadores.current.get(id));
    temporizadores.current.delete(id);
    setNotificacoes((lista) => lista.filter((item) => item.id !== id));
  }, []);

  const adicionar = useCallback((titulo, mensagem, ligacao) => {
    proximoId.current += 1;
    const id = proximoId.current;
    setNotificacoes((lista) => [...lista, { id, titulo, mensagem, ligacao }]);
    temporizadores.current.set(id, setTimeout(() => remover(id), 7000));
  }, [remover]);

  useEffect(() => () => {
    temporizadores.current.forEach(clearTimeout);
    temporizadores.current.clear();
  }, []);

  useEventoSocket('encomenda-atualizada', (evento) => {
    const origem = evento.produtor ? `${evento.produtor} atualizou` : 'Foi atualizada';
    adicionar(
      'Encomenda atualizada',
      `${origem} a sua encomenda para o estado «${evento.estado}».`,
      '/encomendas'
    );
  });

  useEventoSocket('nova-encomenda', (evento) => {
    adicionar(
      'Nova encomenda',
      `Recebeu uma nova encomenda no valor de ${euros.format(evento.total)}.`,
      '/produtor'
    );
  });

  useEventoSocket('leilao-ganho', (evento) => {
    adicionar(
      'Leilão ganho',
      `Ganhou o leilão «${evento.lote}» por ${euros.format(evento.valor)}.`,
      '/encomendas'
    );
  });

  useEventoSocket('leilao-terminado', (evento) => {
    adicionar(
      'Leilão terminado',
      `O leilão «${evento.lote}» terminou em ${euros.format(evento.valor)}.`,
      '/produtor'
    );
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
      evento.aprovado
        ? 'A sua conta de produtor foi validada.'
        : 'A validação da sua conta de produtor foi retirada.',
      '/produtor'
    );
  });

  return { notificacoes, remover };
}
