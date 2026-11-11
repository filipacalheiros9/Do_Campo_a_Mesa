<!doctype html>
<html lang="pt">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('titulo', 'Administração') · Do Campo à Mesa</title>
    <link rel="stylesheet" href="{{ asset('css/admin.css') }}">
</head>
<body>
    <header class="topo">
        <a href="{{ route('painel') }}" class="marca">
            <svg class="marca-folha" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 13C7 6 13 4 20 4c-1 8-5 14-12 14-3 0-5-2-4-5Z" />
                <path d="M6 17c3-4 7-7 12-11" />
            </svg>
            <span>Do Campo à Mesa · Administração</span>
        </a>
        @if(session('token'))
            @php
                $nomeAdministrador = session('utilizador.nome', 'Administrador');
                $iniciais = collect(preg_split('/\s+/', trim($nomeAdministrador)))
                    ->filter()->take(2)
                    ->map(fn ($parte) => mb_strtoupper(mb_substr($parte, 0, 1)))
                    ->implode('');
            @endphp
            <div class="sessao">
                <div class="identidade-admin">
                    <span class="identidade-admin__avatar">{{ $iniciais ?: 'A' }}</span>
                    <span class="identidade-admin__texto">
                        <strong>{{ $nomeAdministrador }}</strong>
                        <small>Administrador</small>
                    </span>
                </div>
                <form method="post" action="{{ route('sair') }}">@csrf<button type="submit" class="perigo">Sair</button></form>
            </div>
        @endif
    </header>
    <main class="conteudo">
        @if(session('sucesso'))<div class="alerta sucesso">{{ session('sucesso') }}</div>@endif
        @if($errors->any())<div class="alerta erro">{{ $errors->first() }}</div>@endif
        @yield('conteudo')
    </main>
    @stack('scripts')
</body>
</html>
