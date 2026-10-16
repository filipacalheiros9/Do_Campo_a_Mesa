@extends('layouts.app')
@section('titulo', 'Entrar')
@section('conteudo')
<form class="cartao formulario" method="post" action="{{ route('login.submeter') }}">
    @csrf
    <p class="secundario">Backoffice Laravel</p>
    <h1>Entrar como administrador</h1>
    <label for="email">Email</label>
    <input id="email" name="email" type="email" value="{{ old('email') }}" required autofocus>
    <label for="password">Password</label>
    <input id="password" name="password" type="password" required>
    <button class="primario">Entrar</button>
</form>
@endsection
