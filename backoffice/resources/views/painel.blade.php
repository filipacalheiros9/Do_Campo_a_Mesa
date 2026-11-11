@extends('layouts.app')
@section('titulo', 'Painel')
@section('conteudo')
<h1>Painel global</h1>
<div class="indicadores">
    @foreach([
        'Utilizadores' => $estatisticas['utilizadores'],
        'Produtores' => $estatisticas['produtores'],
        'Encomendas hoje' => $estatisticas['encomendasHoje'],
        'Leilões ativos' => $estatisticas['leiloesAtivos']
    ] as $rotulo => $valor)
        <article class="cartao indicador"><span>{{ $rotulo }}</span><strong data-indicador="{{ $rotulo }}">{{ $valor }}</strong></article>
    @endforeach
</div>

<section class="cartao painel-tempo-real" data-url="{{ route('painel.tempo-real') }}">
    <div class="cabecalho-secao">
        <div><h2>Leilões ativos</h2><span class="secundario">Atualização automática a cada 5 segundos.</span></div>
        <span class="estado-ligacao"><i></i><span id="estado-atualizacao">Em direto</span></span>
    </div>
    <div class="leiloes-ativos" id="leiloes-ativos">
        @forelse(collect($leiloes)->where('estado', 'ativo') as $leilao)
            <article class="leilao-ativo">
                <strong>{{ $leilao['lote'] }}</strong>
                <span>{{ $leilao['produtor']['produtor']['nomeExploracao'] ?? ($leilao['produtor']['nome'] ?? 'Produtor') }}</span>
                <span>{{ number_format($leilao['licitacaoAtual']['valor'] ?? $leilao['precoBase'], 2, ',', '.') }} € · {{ $leilao['numLicitacoes'] }} licitações</span>
            </article>
        @empty
            <p class="secundario">Não existem leilões ativos.</p>
        @endforelse
    </div>
</section>

<section class="cartao estado-servicos" aria-labelledby="titulo-servicos">
    <div class="cabecalho-secao">
        <div><h2 id="titulo-servicos">Estado da cloud e dos serviços</h2>
            <span class="secundario">Monitorização do ambiente, API, tempo real, dados e imagens.</span></div>
    </div>
    <div id="lista-servicos">
        @foreach($servicos as $servico)
            <div class="servico">
                <i class="{{ $servico['operacional'] ? 'operacional' : 'indisponivel' }}"></i>
                <div><strong>{{ $servico['nome'] }}</strong><span>{{ $servico['detalhe'] }}</span></div>
                <b class="{{ $servico['operacional'] ? 'texto-operacional' : 'texto-indisponivel' }}">
                    {{ $servico['operacional'] ? 'Operacional' : 'Indisponível' }}
                </b>
            </div>
        @endforeach
    </div>
</section>

<section>
    <h2>Produtores por validar</h2>
    @forelse($pendentes as $produtor)
        <article class="cartao linha">
            <div><strong>{{ $produtor['produtor']['nomeExploracao'] ?? $produtor['nome'] }}</strong>
                <span>{{ $produtor['email'] }} · {{ $produtor['produtor']['localidade'] ?? '' }}</span></div>
            <div class="acoes">
                <form method="post" action="{{ route('produtores.validar', $produtor['_id']) }}">@csrf @method('patch')
                    <input type="hidden" name="aprovado" value="1"><button class="primario">Aprovar</button></form>
                <form method="post" action="{{ route('produtores.validar', $produtor['_id']) }}">@csrf @method('patch')
                    <input type="hidden" name="aprovado" value="0"><button class="perigo">Recusar</button></form>
            </div>
        </article>
    @empty <p class="secundario">Não existem produtores pendentes.</p> @endforelse
</section>

<section>
    <h2>Avaliações denunciadas</h2>
    @forelse($avaliacoes as $avaliacao)
        <article class="cartao linha">
            <div><strong>{{ $avaliacao['autor']['nome'] ?? 'Utilizador' }} · {{ $avaliacao['classificacao'] }}/5</strong>
                <span>{{ $avaliacao['comentario'] ?? 'Sem comentário' }}</span>
                <span>{{ $avaliacao['denuncias'] ?? 0 }} denúncia(s)</span></div>
            <div class="acoes">
                <form method="post" action="{{ route('avaliacoes.moderar', $avaliacao['_id']) }}">@csrf @method('patch')
                    <input type="hidden" name="estado" value="recusada"><button class="perigo">Manter denúncia</button></form>
                <form method="post" action="{{ route('avaliacoes.moderar', $avaliacao['_id']) }}">@csrf @method('patch')
                    <input type="hidden" name="estado" value="aprovada"><button>Recusar denúncia</button></form>
            </div>
        </article>
    @empty <p class="secundario">Não existem avaliações denunciadas.</p> @endforelse
</section>

<section class="listagens-administracao" aria-labelledby="titulo-listagens">
<div class="cabecalho-listagens">
    <h2 id="titulo-listagens">Gestão da plataforma</h2>
    <span class="secundario">Consulte os utilizadores, as encomendas e os leilões registados.</span>
</div>

@php
    $limiteRecentes = 5;
@endphp
<details open data-listagem="{{ $limiteRecentes }}"><summary>Utilizadores ({{ count($utilizadores) }})</summary>
<div class="filtros-listagem">
    <label>Tipo de utilizador
        <select data-filtro="papel">
            <option value="">Todos</option>
            <option value="comprador">Comprador</option>
            <option value="produtor">Produtor</option>
            <option value="admin">Administrador</option>
        </select>
    </label>
    <label>Nome <input type="search" data-filtro="nome"></label>
    <button type="button" class="perigo" data-limpar disabled>Limpar filtros</button>
</div>
<p class="secundario sem-resultados" data-sem-resultados role="status" @if(count($utilizadores)) hidden @endif>Nenhum utilizador encontrado.</p>
<div class="tabela"><table><thead><tr><th>Nome</th><th>Email</th><th>Papel</th><th>Registo</th><th>Ações</th></tr></thead><tbody>
@foreach($utilizadores as $item)
<tr data-papel="{{ $item['papel'] }}" data-nome="{{ $item['nome'] }}" @if($loop->index >= $limiteRecentes) hidden @endif>
<td>{{ $item['nome'] }}</td><td>{{ $item['email'] }}</td><td>{{ $item['papel'] }}</td><td>{{ \Carbon\Carbon::parse($item['createdAt'])->format('d/m/Y H:i') }}</td><td>
    @if(($item['_id'] ?? null) !== session('utilizador._id'))
        <form method="post" action="{{ route('utilizadores.eliminar', $item['_id']) }}"
              onsubmit="return confirm('Tem a certeza de que pretende eliminar o perfil de {{ addslashes($item['nome']) }}?');">
            @csrf @method('delete')
            <button class="perigo" type="submit">Eliminar</button>
        </form>
    @else
        <span class="secundario">Sessão atual</span>
    @endif
</td></tr>@endforeach
</tbody></table></div></details>

<details data-listagem="{{ $limiteRecentes }}"><summary>Encomendas ({{ count($encomendas) }})</summary>
<div class="filtros-listagem">
    <label>Nome do produtor <input type="search" data-filtro="produtor"></label>
    <label>Nome do comprador <input type="search" data-filtro="comprador"></label>
    <button type="button" class="perigo" data-limpar disabled>Limpar filtros</button>
</div>
<p class="secundario sem-resultados" data-sem-resultados role="status" @if(count($encomendas)) hidden @endif>Nenhuma encomenda encontrada.</p>
<div class="tabela"><table><thead><tr><th>Referência</th><th>Comprador</th><th>Produtor</th><th>Estado</th><th>Pagamento</th><th>Origem</th></tr></thead><tbody>
@foreach($encomendas as $item)
@php
    $nomeComprador = $item['comprador']['nome'] ?? '';
    $nomeProdutor = $item['produtor']['nome'] ?? '';
    $nomeExploracao = $item['produtor']['produtor']['nomeExploracao'] ?? '';
@endphp
<tr data-comprador="{{ $nomeComprador }}" data-produtor="{{ trim($nomeExploracao.' '.$nomeProdutor) }}" @if($loop->index >= $limiteRecentes) hidden @endif>
    <td>#{{ strtoupper(substr($item['_id'], -6)) }}</td><td>{{ $nomeComprador ?: '—' }}</td><td>{{ $nomeExploracao ?: ($nomeProdutor ?: '—') }}</td><td>{{ $item['estado'] }}</td><td>{{ ($item['pagamento']['estado'] ?? 'por_pagar') === 'pago' ? ('Pago · '.strtoupper($item['pagamento']['metodo'] ?? '')) : 'Por pagar' }}</td><td>{{ $item['origem'] }}</td>
</tr>
@endforeach
</tbody></table></div></details>

<details data-listagem="{{ $limiteRecentes }}"><summary>Leilões ({{ count($leiloes) }})</summary>
<div class="filtros-listagem">
    <label>Data de início <input type="date" data-filtro="data"></label>
    <button type="button" class="perigo" data-limpar disabled>Limpar filtros</button>
</div>
<p class="secundario sem-resultados" data-sem-resultados role="status" @if(count($leiloes)) hidden @endif>Nenhum leilão encontrado.</p>
<div class="tabela"><table><thead><tr><th>Lote</th><th>Produtor</th><th>Estado</th><th>Licitações</th><th>Começa</th><th>Termina</th></tr></thead><tbody>
@foreach($leiloes as $item)
@php
    $inicio = isset($item['iniciaEm']) ? \Carbon\Carbon::parse($item['iniciaEm'])->setTimezone('Europe/Lisbon') : null;
@endphp
<tr data-data="{{ $inicio?->format('Y-m-d') }}" @if($loop->index >= $limiteRecentes) hidden @endif>
    <td>{{ $item['lote'] }}</td><td>{{ $item['produtor']['produtor']['nomeExploracao'] ?? ($item['produtor']['nome'] ?? '—') }}</td><td>{{ $item['estado'] }}</td><td>{{ $item['numLicitacoes'] }}</td><td>{{ $inicio?->format('d/m/Y H:i') ?? '—' }}</td><td>{{ \Carbon\Carbon::parse($item['terminaEm'])->setTimezone('Europe/Lisbon')->format('d/m/Y H:i') }}</td>
</tr>
@endforeach
</tbody></table></div></details>
</section>
@endsection

@push('scripts')
<script>
document.querySelectorAll('[data-listagem]').forEach((listagem) => {
    const campos = [...listagem.querySelectorAll('[data-filtro]')];
    const linhas = [...listagem.querySelectorAll('tbody tr')];
    const limpar = listagem.querySelector('[data-limpar]');
    const semResultados = listagem.querySelector('[data-sem-resultados]');
    const limite = Number(listagem.dataset.listagem);
    const normalizar = (valor) => valor.trim().normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

    function atualizarLista() {
        const ativos = campos.map((campo) => ({
            chave: campo.dataset.filtro,
            valor: normalizar(campo.value),
            pesquisa: campo.type === 'search'
        })).filter(({ valor }) => valor);

        let visiveis = 0;
        linhas.forEach((linha, indice) => {
            const corresponde = ativos.length ? ativos.every(({ chave, valor, pesquisa }) => {
                const conteudo = normalizar(linha.dataset[chave] ?? '');
                return pesquisa ? conteudo.includes(valor) : conteudo === valor;
            }) : indice < limite;
            linha.hidden = !corresponde;
            if (corresponde) visiveis++;
        });

        limpar.disabled = !campos.some((campo) => campo.value);
        semResultados.hidden = visiveis > 0;
    }

    campos.forEach((campo) => campo.addEventListener('input', atualizarLista));
    limpar.addEventListener('click', () => {
        campos.forEach((campo) => { campo.value = ''; });
        atualizarLista();
    });
    atualizarLista();
});

(() => {
    const painel = document.querySelector('.painel-tempo-real');
    if (!painel) return;
    const lista = document.getElementById('leiloes-ativos');
    const estado = document.getElementById('estado-atualizacao');
    const escapar = (valor) => String(valor ?? '').replace(/[&<>'"]/g, (carater) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[carater]));
    const dinheiro = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });

    async function atualizar() {
        try {
            const resposta = await fetch(painel.dataset.url, { headers: { Accept: 'application/json' } });
            if (!resposta.ok) throw new Error('Falha ao atualizar');
            const dados = await resposta.json();
            const indicadores = {
                Utilizadores: dados.estatisticas.utilizadores,
                Produtores: dados.estatisticas.produtores,
                'Encomendas hoje': dados.estatisticas.encomendasHoje,
                'Leilões ativos': dados.estatisticas.leiloesAtivos
            };
            Object.entries(indicadores).forEach(([rotulo, valor]) => {
                const elemento = document.querySelector(`[data-indicador="${rotulo}"]`);
                if (elemento) elemento.textContent = valor;
            });

            lista.innerHTML = dados.leiloesAtivos.length
                ? dados.leiloesAtivos.map((leilao) => {
                    const produtor = leilao.produtor?.produtor?.nomeExploracao || leilao.produtor?.nome || 'Produtor';
                    const valor = leilao.licitacaoAtual?.valor ?? leilao.precoBase;
                    return `<article class="leilao-ativo"><strong>${escapar(leilao.lote)}</strong>`
                        + `<span>${escapar(produtor)}</span><span>${dinheiro.format(valor)} · ${leilao.numLicitacoes} licitações</span></article>`;
                }).join('')
                : '<p class="secundario">Não existem leilões ativos.</p>';
            document.getElementById('lista-servicos').innerHTML = dados.servicos.map((servico) => {
                const classe = servico.operacional ? 'operacional' : 'indisponivel';
                const classeTexto = servico.operacional ? 'texto-operacional' : 'texto-indisponivel';
                const rotulo = servico.operacional ? 'Operacional' : 'Indisponível';
                return `<div class="servico"><i class="${classe}"></i><div><strong>${escapar(servico.nome)}</strong>`
                    + `<span>${escapar(servico.detalhe)}</span></div><b class="${classeTexto}">${rotulo}</b></div>`;
            }).join('');
            estado.textContent = `Atualizado às ${new Date(dados.atualizadoEm).toLocaleTimeString('pt-PT')}`;
        } catch {
            estado.textContent = 'Sem atualização';
        }
    }

    const intervalo = window.setInterval(atualizar, 5000);
    window.addEventListener('pagehide', () => window.clearInterval(intervalo), { once: true });
})();
</script>
@endpush
