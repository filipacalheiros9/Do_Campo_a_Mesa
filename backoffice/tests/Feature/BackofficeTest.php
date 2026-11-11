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

    public function test_o_login_tecnico_encaminha_para_o_login_unico_da_spa(): void
    {
        $this->get('/entrar')
            ->assertRedirect('http://localhost:5173/login');
    }

    public function test_o_login_da_spa_abre_diretamente_a_sessao_do_backoffice(): void
    {
        Http::preventStrayRequests();
        Http::fake([
            '*/api/auth/eu' => Http::response([
                'nome' => 'Admin',
                'email' => 'admin@exemplo.pt',
                'papel' => 'admin',
            ]),
        ]);

        $this->withHeader('Origin', 'http://localhost:5173')
            ->post('/sessao', ['token' => 'jwt-da-spa'])
            ->assertRedirect('/')
            ->assertSessionHas('token', 'jwt-da-spa')
            ->assertSessionHas('utilizador.papel', 'admin');

        Http::assertSentCount(1);
    }

    public function test_a_transferencia_de_sessao_recusa_outras_origens(): void
    {
        Http::preventStrayRequests();

        $this->withHeader('Origin', 'https://origem-invalida.test')
            ->post('/sessao', ['token' => 'jwt-da-spa'])
            ->assertForbidden()
            ->assertSessionMissing('token');

        Http::assertNothingSent();
    }

    public function test_a_transferencia_remove_uma_sessao_sem_papel_de_admin(): void
    {
        Http::preventStrayRequests();
        Http::fake([
            '*/api/auth/eu' => Http::response([
                'nome' => 'Comprador',
                'email' => 'comprador@exemplo.pt',
                'papel' => 'comprador',
            ]),
        ]);

        $this->withSession([
            'token' => 'jwt-anterior',
            'utilizador' => ['nome' => 'Admin', 'papel' => 'admin'],
        ])->withHeader('Origin', 'http://localhost:5173')
            ->post('/sessao', ['token' => 'jwt-comprador'])
            ->assertRedirect('http://localhost:5173/sair')
            ->assertSessionMissing('token');

        Http::assertSentCount(1);
    }

    public function test_sair_termina_a_sessao_e_encaminha_para_a_spa(): void
    {
        $this->withSession([
            'token' => 'jwt-de-teste',
            'utilizador' => ['nome' => 'Admin', 'papel' => 'admin'],
        ])->post('/sair')
            ->assertRedirect('http://localhost:5173/sair')
            ->assertSessionMissing('token');
    }

    public function test_um_token_expirado_no_painel_encaminha_para_o_fim_de_sessao_da_spa(): void
    {
        Http::preventStrayRequests();
        Http::fake(['*/api/admin/estatisticas' => Http::response(['erro' => 'Token expirado'], 401)]);

        $this->withSession([
            'token' => 'jwt-expirado',
            'utilizador' => ['nome' => 'Admin', 'papel' => 'admin'],
        ])->get('/')
            ->assertRedirect('http://localhost:5173/sair')
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
