<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class BackofficeTest extends TestCase
{
    /**
     * A basic test example.
     */
    public function test_o_painel_exige_autenticacao(): void
    {
        $response = $this->get('/');

        $response->assertRedirect('/entrar');
    }

    public function test_o_formulario_de_login_esta_disponivel(): void
    {
        $this->get('/entrar')
            ->assertOk()
            ->assertSee('Entrar como administrador');
    }

    public function test_um_administrador_pode_iniciar_sessao_atraves_da_api(): void
    {
        Http::preventStrayRequests();
        Http::fake([
            '*/api/auth/login' => Http::response([
                'token' => 'jwt-de-teste',
                'utilizador' => ['nome' => 'Admin', 'papel' => 'admin'],
            ]),
        ]);

        $this->post('/entrar', ['email' => 'admin@exemplo.pt', 'password' => 'password123'])
            ->assertRedirect('/')
            ->assertSessionHas('token', 'jwt-de-teste');

        Http::assertSentCount(1);
    }

    public function test_uma_conta_sem_papel_de_administrador_e_recusada(): void
    {
        Http::preventStrayRequests();
        Http::fake([
            '*/api/auth/login' => Http::response([
                'token' => 'jwt-de-teste',
                'utilizador' => ['nome' => 'Comprador', 'papel' => 'comprador'],
            ]),
        ]);

        $this->post('/entrar', ['email' => 'comprador@exemplo.pt', 'password' => 'password123'])
            ->assertRedirect()
            ->assertSessionHasErrors('email')
            ->assertSessionMissing('token');
    }

    public function test_o_painel_escapa_conteudo_recebido_da_api(): void
    {
        Http::preventStrayRequests();
        Http::fake([
            '*/api/admin/estatisticas' => Http::response([
                'utilizadores' => 1, 'produtores' => 0, 'encomendasHoje' => 0, 'leiloesAtivos' => 0,
            ]),
            '*/api/admin/produtores/pendentes' => Http::response([]),
            '*/api/admin/reviews/moderacao' => Http::response([]),
            '*/api/admin/utilizadores' => Http::response([[
                '_id' => '1', 'nome' => '<script>alert(1)</script>', 'email' => 'teste@exemplo.pt',
                'papel' => 'comprador', 'createdAt' => '2026-01-01T12:00:00Z',
            ]]),
            '*/api/admin/encomendas' => Http::response([]),
            '*/api/admin/leiloes' => Http::response([]),
            '*/api/admin/servicos' => Http::response([]),
        ]);

        $resposta = $this->withSession([
            'token' => 'jwt-de-teste',
            'utilizador' => ['nome' => 'Admin', 'papel' => 'admin'],
        ])->get('/');

        $resposta->assertOk()
            ->assertSee('&lt;script&gt;alert(1)&lt;/script&gt;', false)
            ->assertDontSee('<script>alert(1)</script>', false);
    }
}
