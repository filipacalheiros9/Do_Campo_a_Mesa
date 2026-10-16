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
        <article class="cartao indicador"><span>{{ $rotulo }}</span><strong>{{ $valor }}</strong></article>
    @endforeach
</div>

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
<div class="tabela"><table><thead><tr><th>Nome</th><th>Email</th><th>Papel</th><th>Registo</th></tr></thead><tbody>
@foreach($utilizadores as $item)<tr><td>{{ $item['nome'] }}</td><td>{{ $item['email'] }}</td><td>{{ $item['papel'] }}</td><td>{{ \Carbon\Carbon::parse($item['createdAt'])->format('d/m/Y H:i') }}</td></tr>@endforeach
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
