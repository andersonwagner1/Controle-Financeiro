import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Investimento } from '../../core/models/investimento.model';
import { InvestimentoService } from '../../core/services/investimento.service';

@Component({
  selector: 'app-investimentos',
  templateUrl: './investimentos.component.html',
  styleUrls: ['./investimentos.component.scss']
})
export class InvestimentosComponent implements OnInit, OnDestroy {
  private readonly subs = new Subscription();

  investimentos: Investimento[] = [];
  investimentoEditando: Investimento | null = null;
  form!: FormGroup;
  carregando = true;
  salvando = false;
  mensagemErro = '';
  mensagemSucesso = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly investimentoService: InvestimentoService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]]
    });

    this.subs.add(this.investimentoService.getInvestimentos().subscribe(investimentos => {
      this.investimentos = investimentos;
    }));
    this.carregarInvestimentos();
  }

  carregarInvestimentos(): void {
    this.carregando = true;
    this.mensagemErro = '';
    this.subs.add(this.investimentoService.listarInvestimentos().subscribe({
      next: () => this.carregando = false,
      error: () => {
        this.carregando = false;
        this.mensagemErro = 'Não foi possível carregar os investimentos.';
      }
    }));
  }

  salvar(): void {
    if (this.form.invalid || this.salvando) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando = true;
    this.mensagemErro = '';
    this.mensagemSucesso = '';
    const requisicao = this.investimentoEditando
      ? this.investimentoService.atualizarInvestimento({
          ...this.investimentoEditando,
          nome: this.form.value.nome.trim()
        })
      : this.investimentoService.adicionarInvestimento(this.form.value.nome);

    this.subs.add(requisicao.subscribe({
      next: () => {
        this.salvando = false;
        this.mensagemSucesso = this.investimentoEditando
          ? 'Investimento atualizado com sucesso.'
          : 'Investimento cadastrado com sucesso.';
        this.cancelarEdicao();
      },
      error: () => {
        this.salvando = false;
        this.mensagemErro = 'Não foi possível cadastrar o investimento.';
      }
    }));
  }

  editar(investimento: Investimento): void {
    this.investimentoEditando = investimento;
    this.form.reset({ nome: investimento.nome });
    this.mensagemErro = '';
    this.mensagemSucesso = '';
  }

  cancelarEdicao(): void {
    this.investimentoEditando = null;
    this.form.reset();
  }

  excluir(investimento: Investimento): void {
    if (!confirm(`Excluir o investimento "${investimento.nome}"?`)) return;

    this.mensagemErro = '';
    this.mensagemSucesso = '';
    this.subs.add(this.investimentoService.atualizarInvestimento({ ...investimento, ativo: false }).subscribe({
      next: () => {
        this.mensagemSucesso = 'Investimento excluído com sucesso.';
        if (this.investimentoEditando?.id === investimento.id) this.cancelarEdicao();
      },
      error: () => this.mensagemErro = 'Não foi possível excluir o investimento.'
    }));
  }

  get investimentosAtivos(): Investimento[] {
    return this.investimentos.filter(investimento => investimento.ativo !== false);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
