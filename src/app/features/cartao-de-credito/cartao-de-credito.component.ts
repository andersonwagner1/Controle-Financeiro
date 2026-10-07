import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';
import { Banco } from '../../core/models/banco.model';
import { Conta } from '../../core/models/conta.model';
import { Cartao } from '../../core/models/cartao.model';

import { LancamentoCartao } from '../../core/models/lancamento-cartao.model';
import { BancoService } from '../../core/services/banco.service';
import { ContaService } from '../../core/services/conta.service';
import { CartaoService } from '../../core/services/cartao.service';
import { LancamentoCartaoService } from '../../core/services/lancamento-cartao.service';
import { CategoriaService } from '../../core/services/categoria.service';
import { Categoria } from '../../core/models/categoria.model';

interface CartaoResumo extends Cartao {
  banco: Banco;
  utilizado: number;
}

@Component({
  selector: 'app-cartao-de-credito',
  templateUrl: './cartao-de-credito.component.html',
  styleUrls: ['./cartao-de-credito.component.scss']
})
export class CartaoDeCreditoComponent implements OnInit, OnDestroy {
  private subs = new Subscription();
  private todasContas: Conta[] = [];


  private cartoesApi: Cartao[] = [];

  tipoMovimentacoes: Categoria[] = [];
  bancos: Banco[] = [];


  cartoesCredito: Cartao[] = [];

  cartoes: CartaoResumo[] = [];
  movimentacoes: LancamentoCartao[] = [];
  filtroBanco = 'todos';
  dataInicial = '';
  dataFinal = '';
  fechamentoAnterior = '';
  fechamentoAtual = '';
  proximoFechamento = '';
  categorias: string[] = [];
  showModal = false;
  showCadastroCartao = false;
  isEditandoCartao = false;
  cartaoIdEditando: number | null = null;
  erroCadastroCartao = '';
  cadastroCartaoForm!: FormGroup;
  form!: FormGroup;

  ngOnInit(): void {
    const hoje = new Date();
    const inicioCiclo = this.inicioCicloAtual(hoje);
    this.dataInicial = this.formatarData(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
    this.dataFinal = this.formatarData(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0));
    this.fechamentoAnterior = this.formatarData(new Date(inicioCiclo.getFullYear(), inicioCiclo.getMonth() - 1, 9));
    this.fechamentoAtual = this.formatarData(inicioCiclo);
    this.proximoFechamento = this.formatarData(new Date(inicioCiclo.getFullYear(), inicioCiclo.getMonth() + 1, 8));
    this.form = this.formBuilder.group({
      cartaoCreditoId: ['', Validators.required],
      data: [this.formatarData(hoje), Validators.required],
      valor: [null, [Validators.required, Validators.min(0.01)]],
      descricao: [''],
      tipoMovimentacaoId: ['Alimentação', Validators.required],
      parcelas: [1, [Validators.required, Validators.min(1), Validators.max(60)]]
    });
   
    this.cadastroCartaoForm = this.formBuilder.group({
      bancoId: ['', Validators.required],
      descricao: ['', [Validators.required, Validators.minLength(3)]],
      limite: [null, [Validators.required, Validators.min(0.01)]],
      diaFechamento: [8, [Validators.required, Validators.min(1), Validators.max(31)]],
      diaVencimento: [15, [Validators.required, Validators.min(1), Validators.max(31)]],
      dataAbertura: [this.formatarData(hoje), Validators.required],
      dataFechamento: ['']
    });

    this.categoriaService.getCategorias().subscribe(categorias => {      
      this.tipoMovimentacoes = categorias
    });

     this.bancoService.getBancos().subscribe(bancos => {
      this.bancos = bancos;
      this.atualizarCartoes();
    });

     this.contaService.getContas().subscribe(contas => {
      this.todasContas = contas;
      this.carregarLancamentosPorPeriodo();
    });

     this.cartaoService.listarCartoes().subscribe({
      next: cartoes => {
        this.cartoesCredito = cartoes;
        this.atualizarCartoes();
      },
      error: () => { this.erroCadastroCartao = 'Não foi possível carregar os cartões.'; }
    });

    this.carregarLancamentosPorPeriodo();

  }

  constructor(
    private bancoService: BancoService,
    private contaService: ContaService,
    private cartaoService: CartaoService,
    private lancamentoCartaoService: LancamentoCartaoService,
    private categoriaService: CategoriaService,
    private formBuilder: FormBuilder,
  ) {}

  get cartoesFiltrados(): CartaoResumo[] {
    
    return this.filtroBanco === 'todos'
      ? this.cartoes
      : this.cartoes.filter(cartao => cartao.id === Number(this.filtroBanco));
  }

  get bancosDosCartoes(): Banco[] {
    const ids = new Set(this.cartoes.map(cartao => cartao.vinculoId));
    
    return this.bancos.filter(banco => ids.has(banco.id));
  }

  get pagamentosAnteriores(): LancamentoCartao[] {
    return this.movimentacoesPorPeriodo(this.fechamentoAnterior, this.fechamentoAtual);
  }

  get faturaAtual(): LancamentoCartao[] {
    return this.movimentacoesPorPeriodo(this.fechamentoAtual, this.proximoFechamento);
  }

  get pagamentosFuturos(): LancamentoCartao[] {
    return this.movimentacoesDoFiltroBanco().filter(l => l.data >= this.proximoFechamento);
  }

  get valorFaturaAtual(): number {
    return this.faturaAtual.filter(l => l.tipo === 'debito').reduce((total, l) => total + l.valor, 0);
  }

  get valorPagamentoAnterior(): number {
    return this.pagamentosAnteriores.filter(l => l.tipo === 'debito').reduce((total, l) => total + l.valor, 0);
  }

  get valorPagamentosFuturos(): number {
    return this.pagamentosFuturos.filter(l => l.tipo === 'debito').reduce((total, l) => total + l.valor, 0);
  }

  get limiteTotal(): number {
    
    return this.cartoesFiltrados.reduce((total, cartao) => total + cartao.limite, 0);
  }

  get utilizadoTotal(): number {
    return this.cartoesFiltrados.reduce((total, cartao) => total + cartao.utilizado, 0);
  }

  get disponivelTotal(): number {
    
    return this.limiteTotal - this.utilizadoTotal;
  }

  getPercentualUtilizado(cartao: CartaoResumo): number {
    return Math.min(100, Math.round((cartao.utilizado / cartao.limite) * 100));
  }

  abrirModalLancamento(): void {
    this.form.reset({
      contaId: this.cartoesFiltrados[0]?.id || '',
      dataCompra: this.formatarData(new Date()),
      valor: null,
      observacao: '',
      categoria: 'Alimentação',
      parcelas: 1
    });
    this.showModal = true;
  }

  abrirCadastroCartao(): void {
    this.isEditandoCartao = false;
    this.cartaoIdEditando = null;
    this.erroCadastroCartao = '';
    this.cadastroCartaoForm.reset({
      bancoId: '', descricao: '', limite: null, diaFechamento: 8, diaVencimento: 15,
      dataAbertura: this.formatarData(new Date()), dataFechamento: ''
    });
    this.showCadastroCartao = true;
  }

  editarCartao(cartao: CartaoResumo): void {
    this.isEditandoCartao = true;
    this.cartaoIdEditando = cartao.id;
    this.erroCadastroCartao = '';
    this.cartaoService.consultarCartao(cartao.id).subscribe({
      next: cartaoApi => {
        this.cadastroCartaoForm.patchValue({
          bancoId: cartaoApi.vinculoId,
          descricao: cartaoApi.nome,
          limite: cartaoApi.limite,
          diaFechamento: cartaoApi.diaFechamento,
          diaVencimento: cartaoApi.diaVencimento,
          dataAbertura: cartaoApi.dataAbertura,
          dataFechamento: cartaoApi.dataFechamento || ''
        });
        this.showCadastroCartao = true;
      },
      error: () => { this.erroCadastroCartao = 'Não foi possível consultar o cartão.'; }
    });
  }

  fecharCadastroCartao(): void {
    this.showCadastroCartao = false;
  }

  salvarCartao(): void {
    console.log('Salvando cartão:', this.cadastroCartaoForm.value);

    if (this.cadastroCartaoForm.invalid) return;

    const valor = this.cadastroCartaoForm.value;
    if (valor.dataFechamento && valor.dataFechamento < valor.dataAbertura) {
      this.erroCadastroCartao = 'A data final deve ser igual ou posterior à data inicial.';
      return;
    }


    const cartao: Cartao = {
      id: this.cartaoIdEditando!,
      vinculoId: valor.bancoId,
      nome: valor.descricao.trim(),
      ativa: true,
      limite: Number(valor.limite),
      diaFechamento: Number(valor.diaFechamento),
      diaVencimento: Number(valor.diaVencimento),
      dataAbertura: valor.dataAbertura,
      dataFechamento: valor.dataFechamento || undefined
    };
   
    if (this.isEditandoCartao) {
      this.cartaoService.atualizarCartao(cartao.id, cartao).subscribe({
        next: () => {
          this.cartoesApi = this.cartaoService.getCartoesSnapshot();
          this.atualizarCartoes();
          this.fecharCadastroCartao();
        },
        error: () => { this.erroCadastroCartao = 'Não foi possível atualizar o cartão.'; }
      });
    } else {
      
      this.cartaoService.salvarCartao(cartao).subscribe({
        next: () => {
          this.cartoesApi = this.cartaoService.getCartoesSnapshot();
          this.atualizarCartoes();
          this.fecharCadastroCartao();
        },
        error: () => { this.erroCadastroCartao = 'Não foi possível salvar o cartão.'; }
      });
    }
  }

  fecharModal(): void {
    this.showModal = false;
  }

  salvarLancamentoCartao(): void {
    if (this.form.invalid) return;

    this.lancamentoCartaoService.adicionarLancamento(this.form.value).subscribe({
      next: () => this.fecharModal(),
      error: () => { this.erroCadastroCartao = 'Não foi possível salvar o lançamento.'; }
    });
  }




  carregarLancamentosPorPeriodo(): void {
      let cartaoCreditoId: number | undefined;
      if(this.filtroBanco === 'todos'){
        cartaoCreditoId = 0;
      } else {
        cartaoCreditoId = Number(this.filtroBanco);
      }

     

    this.lancamentoCartaoService.buscarMovimentacaoPorPeriodo(Number(cartaoCreditoId), this.dataInicial, this.dataFinal).subscribe({
      next: lancamentos => {
        console.log("lancamentos carregados: ", lancamentos);
        this.movimentacoes = lancamentos;
      },
      error: () => { this.erroCadastroCartao = 'Não foi possível carregar os lançamentos do período.'; } 
    });     
  }

  private atualizarCartoes(): void {
    const contasCartao = this.cartoesApi.filter(cartao => this.cartaoEstaAtivo(cartao));

    
    /*this.cartoes = contasCartao.map((cartao, index) => {
      const banco = this.bancos.find(item => item.id === Number(cartao.vinculoId)) || {
        id: '', nome: 'Banco não informado', logo: '', cor: '#6366f1', corSecundaria: '#8b5cf6'
      };
      const utilizado = this.todosLancamentos
        .filter(l => l.vinculoId === cartao.id && l.tipo === 'debito' && l.data >= this.dataInicial)
        .reduce((total, l) => total + l.valor, 0);
      return { ...cartao, banco, limite: cartao.limite || 5000 + index * 2500, utilizado };
    });*/
  }

  private cartaoEstaAtivo(conta: Pick<Cartao, 'dataAbertura' | 'dataFechamento'>): boolean {
    const hoje = this.formatarData(new Date());
    return conta.dataAbertura <= hoje && (!conta.dataFechamento || hoje <= conta.dataFechamento);
  }

  private inicioCicloAtual(data: Date): Date {
    const inicio = new Date(data.getFullYear(), data.getMonth(), 9);
    if (data.getDate() < 9) inicio.setMonth(inicio.getMonth() - 1);
    return inicio;
  }

  private movimentacoesPorPeriodo(inicio: string, fim: Date | string): LancamentoCartao[] {
    const fimFormatado = typeof fim === 'string' ? fim : this.formatarData(fim);
    return this.movimentacoesDoFiltroBanco().filter(l => l.data >= inicio && l.data < fimFormatado);
  }

  private movimentacoesDoFiltroBanco(): LancamentoCartao[] {
    return this.movimentacoes.filter(lancamento => {      
      return lancamento.cartaoCreditoId === Number(this.filtroBanco) || this.filtroBanco === 'todos';
    });

  }

  private formatarData(data: Date): string {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
  }



  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

}
