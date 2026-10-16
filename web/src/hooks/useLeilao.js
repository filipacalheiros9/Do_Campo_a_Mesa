// Passo 7: ligação em tempo real a uma sala de leilão
import { useEffect, useState } from 'react';
import { useEventoSocket, useSocket } from '../context/SocketContext.jsx';

export function useLeilao(id) {
  const socket = useSocket();
  const [leilao, setLeilao] = useState(null);
  const [atual, setAtual] = useState(null);
  const [licitacoes, setLicitacoes] = useState([]);
  const [participantes, setParticipantes] = useState(0);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState(null);
  const [offset, setOffset] = useState(0);

  useEventoSocket('estado', ({ agora, leilao: l, licitacoes: lista }) => {
    setOffset(new Date(agora).getTime() - Date.now());
    setLeilao(l);
    setAtual(l.licitacaoAtual);
    setLicitacoes(lista || []);
    setResultado(l.estado === 'terminado' ? {
      vencedor: l.licitacaoAtual?.comprador || null,
      valor: l.licitacaoAtual?.valor
    } : null);
    setErro('');
  });
  useEventoSocket('nova-licitacao', (licitacao) => {
    setAtual(licitacao);
    setLicitacoes((lista) => [
      licitacao,
      ...lista.filter((item) => item._id !== licitacao._id)
    ].slice(0, 20));
    setLeilao((anterior) => anterior ? {
      ...anterior,
      licitacaoAtual: licitacao,
      numLicitacoes: licitacao.numLicitacoes
    } : anterior);
  });
  useEventoSocket('presenca', setParticipantes);
  useEventoSocket('recusada', setErro);
  useEventoSocket('connect_error', (e) => setErro(e.message));
  useEventoSocket('aberto', (evento) => {
    if (String(evento.id) !== String(id)) return;
    setLeilao((anterior) => anterior ? { ...anterior, estado: 'ativo' } : anterior);
    setErro('');
  });
  useEventoSocket('terminado', (evento) => {
    if (String(evento.id) !== String(id)) return;
    setResultado(evento);
    setLeilao((anterior) => anterior ? { ...anterior, estado: 'terminado' } : anterior);
  });

  useEffect(() => {
    if (!socket || !id) return undefined;

    const entrar = () => socket.emit('entrar', id);
    socket.on('connect', entrar);
    if (socket.connected) entrar();

    return () => {
      socket.off('connect', entrar);
      if (socket.connected) socket.emit('sair', id);
    };
  }, [id, socket]);

  const licitar = (valor) => {
    setErro('');
    socket?.emit('licitar', { leilaoId: id, valor }, (resposta) => {
      if (!resposta?.ok) setErro(resposta?.erro || 'Não foi possível licitar');
    });
  };

  return { leilao, atual, licitacoes, participantes, erro, resultado, offset, licitar };
}
