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
        <div><h2 id="titulo-servicos">Estado dos serviços</h2>
            <span class="secundario">Estado técnico do ambiente atual.</span></div>
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
                <span>{{ $avaliacao['comentario'] ?? 'Sem comentário' }} · {{ $avaliacao['denuncias'] }} denúncia(s)</span></div>
            <div class="acoes">
                <form method="post" action="{{ route('avaliacoes.moderar', $avaliacao['_id']) }}">@csrf @method('patch')
                    <input type="hidden" name="visivel" value="0"><button class="perigo">Ocultar</button></form>
                @if(!($avaliacao['visivel'] ?? true))
                <form method="post" action="{{ route('avaliacoes.moderar', $avaliacao['_id']) }}">@csrf @method('patch')
                    <input type="hidden" name="visivel" value="1"><button>Repor</button></form>
                @endif
            </div>
        </article>
    @empty <p class="secundario">Não existem avaliações denunciadas.</p> @endforelse
</section>

<details open><summary>Utilizadores ({{ count($utilizadores) }})</summary>
<div class="tabela"><table><thead><tr><th>Nome</th><th>Email</th><th>Papel</th><th>Registo</th><th>Ações</th></tr></thead><tbody>
@foreach($utilizadores as $item)<tr><td>{{ $item['nome'] }}</td><td>{{ $item['email'] }}</td><td>{{ $item['papel'] }}</td><td>{{ \Carbon\Carbon::parse($item['createdAt'])->format('d/m/Y H:i') }}</td><td>
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

<details><summary>Encomendas ({{ count($encomendas) }})</summary>
<div class="tabela"><table><thead><tr><th>Referência</th><th>Comprador</th><th>Produtor</th><th>Estado</th><th>Origem</th></tr></thead><tbody>
@foreach($encomendas as $item)<tr><td>#{{ strtoupper(substr($item['_id'], -6)) }}</td><td>{{ $item['comprador']['nome'] ?? '—' }}</td><td>{{ $item['produtor']['produtor']['nomeExploracao'] ?? ($item['produtor']['nome'] ?? '—') }}</td><td>{{ $item['estado'] }}</td><td>{{ $item['origem'] }}</td></tr>@endforeach
</tbody></table></div></details>

<details><summary>Leilões ({{ count($leiloes) }})</summary>
<div class="tabela"><table><thead><tr><th>Lote</th><th>Produtor</th><th>Estado</th><th>Licitações</th><th>Termina</th></tr></thead><tbody>
@foreach($leiloes as $item)<tr><td>{{ $item['lote'] }}</td><td>{{ $item['produtor']['produtor']['nomeExploracao'] ?? ($item['produtor']['nome'] ?? '—') }}</td><td>{{ $item['estado'] }}</td><td>{{ $item['numLicitacoes'] }}</td><td>{{ \Carbon\Carbon::parse($item['terminaEm'])->format('d/m/Y H:i') }}</td></tr>@endforeach
</tbody></table></div></details>
@endsection

@push('scripts')
<script>
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
