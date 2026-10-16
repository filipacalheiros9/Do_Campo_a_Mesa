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
        <a href="{{ route('painel') }}" class="marca">Do Campo à Mesa · Administração</a>
        @if(session('token'))
            <div class="sessao"><span>{{ session('utilizador.nome') }}</span>
                <form method="post" action="{{ route('sair') }}">@csrf<button>Sair</button></form>
            </div>
        @endif
    </header>
    <main class="conteudo">
        @if(session('sucesso'))<div class="alerta sucesso">{{ session('sucesso') }}</div>@endif
        @if($errors->any())<div class="alerta erro">{{ $errors->first() }}</div>@endif
        @yield('conteudo')
    </main>
</body>
</html>
