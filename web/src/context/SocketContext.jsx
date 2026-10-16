// Uma única ligação Socket.IO partilhada por toda a sessão autenticada.
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      return undefined;
    }

    const ligacao = io(API_URL, { auth: { token } });
    setSocket(ligacao);

    return () => ligacao.disconnect();
  }, [token]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);

// Mantém um único listener e usa sempre a versão mais recente do handler.
export function useEventoSocket(evento, handler) {
  const socket = useSocket();
  const handlerAtual = useRef(handler);

  useEffect(() => {
    handlerAtual.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!socket) return undefined;

    const ouvir = (...args) => handlerAtual.current(...args);
    socket.on(evento, ouvir);
    return () => socket.off(evento, ouvir);
  }, [socket, evento]);
}
