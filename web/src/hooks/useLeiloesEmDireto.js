import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

// Atualiza periodicamente os destaques públicos sem exigir uma ligação Socket.IO.
export function useLeiloesEmDireto(intervalo = 5000, incluirPrestes = false) {
  const [leiloes, setLeiloes] = useState([]);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const dados = await api(incluirPrestes ? '/auctions' : '/auctions?estado=ativo');
        const agora = Date.now();
        const emDireto = dados.filter((leilao) => leilao.estado === 'ativo'
          && new Date(leilao.terminaEm).getTime() > agora);
        const prestes = incluirPrestes ? dados.filter((leilao) => {
          const inicio = new Date(leilao.iniciaEm).getTime();
          return leilao.estado === 'agendado' && inicio > agora && inicio - agora <= 5 * 60 * 1000;
        }) : [];
        if (ativo) setLeiloes([...emDireto, ...prestes]);
      } catch {
        if (ativo) setLeiloes([]);
      }
    }

    carregar();
    const temporizador = setInterval(carregar, intervalo);
    return () => {
      ativo = false;
      clearInterval(temporizador);
    };
  }, [intervalo, incluirPrestes]);

  return leiloes;
}
