// Estado global do carrinho
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CarrinhoContext = createContext(null);

function lerCarrinho() {
  try {
    const linhas = JSON.parse(localStorage.getItem('carrinho'));
    return Array.isArray(linhas) ? linhas : [];
  } catch {
    return [];
  }
}

export function CarrinhoProvider({ children }) {
  const [linhas, setLinhas] = useState(lerCarrinho); // [{ produto, quantidade }]

  useEffect(() => {
    try { localStorage.setItem('carrinho', JSON.stringify(linhas)); } catch { /* armazenamento indisponível */ }
  }, [linhas]);

  function adicionar(produto, quantidade = 1) {
    const quantidadeValida = Math.max(1, Math.floor(Number(quantidade) || 1));
    setLinhas((atual) => {
      const existe = atual.find((l) => l.produto._id === produto._id);
      if (existe) {
        return atual.map((l) => l.produto._id === produto._id
          ? { ...l, quantidade: l.quantidade + quantidadeValida } : l);
      }
      return [...atual, { produto, quantidade: quantidadeValida }];
    });
  }

  function alterarQuantidade(produtoId, quantidade) {
    const novaQuantidade = Math.floor(Number(quantidade));
    setLinhas((atual) => (!Number.isFinite(novaQuantidade) || novaQuantidade < 1
      ? atual.filter((l) => l.produto._id !== produtoId)
      : atual.map((l) => (l.produto._id === produtoId
        ? { ...l, quantidade: novaQuantidade }
        : l))));
  }

  const remover = (produtoId) => alterarQuantidade(produtoId, 0);
  const esvaziar = () => setLinhas([]);

  const total = useMemo(
    () => linhas.reduce((s, l) => s + l.produto.preco * l.quantidade, 0), [linhas]);
  const totalArtigos = useMemo(
    () => linhas.reduce((s, l) => s + l.quantidade, 0), [linhas]);

  const gruposPorProdutor = useMemo(() => {
    const grupos = new Map();
    linhas.forEach((linha) => {
      const produtor = linha.produto.produtor;
      const chave = produtor?._id || produtor?.nome || 'sem-produtor';
      if (!grupos.has(chave)) grupos.set(chave, { produtor, linhas: [], total: 0 });
      const grupo = grupos.get(chave);
      grupo.linhas.push(linha);
      grupo.total += linha.produto.preco * linha.quantidade;
    });
    return [...grupos.values()];
  }, [linhas]);

  return (
    <CarrinhoContext.Provider value={{
      linhas,
      gruposPorProdutor,
      adicionar,
      alterarQuantidade,
      remover,
      esvaziar,
      total,
      totalArtigos
    }}>
      {children}
    </CarrinhoContext.Provider>
  );
}

export const useCarrinho = () => useContext(CarrinhoContext);
