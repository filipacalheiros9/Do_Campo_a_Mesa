<?php

use App\Http\Controllers\AutenticacaoController;
use App\Http\Controllers\PainelController;
use Illuminate\Support\Facades\Route;

Route::get('/entrar', [AutenticacaoController::class, 'formulario'])->name('login');
Route::post('/sessao', [AutenticacaoController::class, 'iniciarComToken'])
    ->middleware('throttle:10,1')
    ->name('sessao.spa');

Route::middleware('admin')->group(function (): void {
    Route::get('/', [PainelController::class, 'index'])->name('painel');
    Route::get('/dados-tempo-real', [PainelController::class, 'dadosTempoReal'])->name('painel.tempo-real');
    Route::post('/sair', [AutenticacaoController::class, 'sair'])->name('sair');
    Route::patch('/produtores/{id}', [PainelController::class, 'validarProdutor'])->name('produtores.validar');
    Route::patch('/avaliacoes/{id}', [PainelController::class, 'moderarAvaliacao'])->name('avaliacoes.moderar');
    Route::delete('/utilizadores/{id}', [PainelController::class, 'eliminarUtilizador'])->name('utilizadores.eliminar');
});
