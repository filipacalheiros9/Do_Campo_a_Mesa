import { useEffect, useState } from 'react';

export function useContagem(ate, offset = 0) {
  const calcular = () => {
    if (!ate) return 0;
    const fim = new Date(ate).getTime();
    if (Number.isNaN(fim)) return 0;
    return Math.max(0, fim - (Date.now() + offset));
  };

  const [restante, setRestante] = useState(calcular);

  useEffect(() => {
    setRestante(calcular());
    const temporizador = setInterval(() => setRestante(calcular()), 1000);
    return () => clearInterval(temporizador);
    // O cálculo só precisa de ser recriado quando muda o fim ou o desvio do relógio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ate, offset]);

  return restante;
}

export function formatarTempo(ms) {
  const totalSegundos = Math.max(0, Math.floor(ms / 1000));
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;
  const doisDigitos = (valor) => String(valor).padStart(2, '0');

  return horas
    ? `${horas}:${doisDigitos(minutos)}:${doisDigitos(segundos)}`
    : `${doisDigitos(minutos)}:${doisDigitos(segundos)}`;
}
