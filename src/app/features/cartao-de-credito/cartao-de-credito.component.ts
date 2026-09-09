import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';
import { Banco } from '../../core/models/banco.model';
import { Conta } from '../../core/models/conta.model';
import { Cartao } from '../../core/models/cartao.model';
import { CATEGORIAS_DEBITO } from '../../core/models/lancamento.model';
import { LancamentoCartao } from '../../core/models/lancamento-cartao.model';
import { BancoService } from '../../core/services/banco.service';
import { ContaService } from '../../core/services/conta.service';
import { CartaoService } from '../../core/services/cartao.service';
import { LancamentoCartaoService } from '../../core/services/lancamento-cartao.service';
import { CategoriaService } from '../../core/services/categoria.service';

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
  private todosLancamentos: LancamentoCartao[] = [];
  private todasContas: Conta[] = [];
  private cartoesApi: Cartao[] = [];
  bancos: Banco[] = [];

  cartoes: CartaoResumo[] = [];
  movimentacoes: LancamentoCartao[] = [];
  filtroBanco = 'todos';
  dataInicial = '';
  dataFinal = '';
  fechamentoAnterior = '';
  fechamentoAtual = '';
  proximoFechamento = '';
  categorias: string[] = CATEGORIAS_DEBITO.slice();
  showModal = false;
  showCadastroCartao = false;
  isEditandoCartao = false;
  cartaoIdEditando: string | null = null;
  erroCadastroCartao = '';
  cadastroCartaoForm!: FormGroup;
  form!: FormGroup;

  ngOnInit(): void {
    const hoje = new Date();
    const inicioCiclo = this.inicioCicloAtual(hoje);
    this.dataInicial = this.formatarData(inicioCiclo);
    this.dataFinal = this.formatarData(hoje);
    this.fechamentoAnterior = this.formatarData(new Date(inicioCiclo.getFullYear(), inicioCiclo.getMonth() - 1, 9));
    this.fechamentoAtual = this.formatarData(inicioCiclo);
    this.proximoFechamento = this.formatarData(new Date(inicioCiclo.getFullYear(), inicioCiclo.getMonth() + 1, 8));
    this.form = this.formBuilder.group({
      contaId: ['', Validators.required],
      dataCompra: [this.formatarData(hoje), Validators.required],
      valor: [null, [Validators.required, Validators.min(0.01)]],
      observacao: [''],
      categoria: ['Alimentação', Validators.required],
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

    this.subs.add(this.bancoService.getBancos().subscribe(bancos => {
      this.bancos = bancos;
      this.atualizarCartoes();
    }));
    this.subs.add(this.contaService.getContas().subscribe(contas => {
      this.todasContas = contas;
      this.aplicarFiltros();
    }));
    this.subs.add(this.cartaoService.listarCartoes().subscribe({
      next: cartoes => {
        
        this.cartoesApi = cartoes;
        console.log("lista cartoes:", this.cartoesApi);
        this.atualizarCartoes();
      },
      error: () => { this.erroCadastroCartao = 'Não foi possível carregar os cartões.'; }
    }));
    this.subs.add(this.lancamentoCartaoService.getLancamentos().subscribe(lancamentos => {
      this.todosLancamentos = lancamentos;
      this.aplicarFiltros();
      this.atualizarCartoes();
    }));
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
      : this.cartoes.filter(cartao => cartao.vinculoId === this.filtroBanco);
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
    if (this.cadastroCartaoForm.invalid) return;

    const valor = this.cadastroCartaoForm.value;
    if (valor.dataFechamento && valor.dataFechamento < valor.dataAbertura) {
      this.erroCadastroCartao = 'A data final deve ser igual ou posterior à data inicial.';
      return;
    }


    const cartao: Cartao = {
      id: this.cartaoIdEditando || `${valor.bancoId}-cc-${Date.now()}`,
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

    const valorTotal = Number(this.form.value.valor);
    const quantidadeParcelas = Number(this.form.value.parcelas);
    const valorParcela = Math.floor((valorTotal / quantidadeParcelas) * 100) / 100;
    const diferenca = Math.round((valorTotal - valorParcela * quantidadeParcelas) * 100) / 100;
    const dataCompra = this.form.value.dataCompra as string;
    const observacao = this.form.value.observacao?.trim();
    const parcelas: Omit<LancamentoCartao, 'id'>[] = [];

    for (let indice = 0; indice < quantidadeParcelas; indice++) {
      const numeroParcela = indice + 1;
      const valor = numeroParcela === quantidadeParcelas
        ? Math.round((valorParcela + diferenca) * 100) / 100
        : valorParcela;
      const complemento = quantidadeParcelas > 1 ? `Parcela ${numeroParcela}/${quantidadeParcelas}` : 'Compra à vista';
      const observacaoParcela = [
        `Compra em ${this.formatarDataVisual(dataCompra)}`,
        complemento,
        observacao
      ].filter(Boolean).join(' | ');

      parcelas.push({
        vinculoId: this.form.value.contaId,
        tipo: 'debito' as const,
        descricao: `Compra no cartão - ${complemento}`,
        categoria: this.form.value.categoria,
        valor,
        data: this.adicionarMeses(dataCompra, indice),
        observacao: observacaoParcela
      });
    }

    forkJoin(parcelas.map(parcela => this.lancamentoCartaoService.adicionarLancamento(parcela))).subscribe({
      next: () => this.fecharModal()
    });
  }

  getBancoNome(cartaoId: string): string {
    const cartao = this.cartoesApi.find(item => item.id === cartaoId);
    return this.bancos.find(b => b.id === cartao?.vinculoId)?.nome || 'Banco não informado';
  }

  aplicarFiltros(): void {
    const contasCartao = this.cartoesApi.filter(cartao => cartao.ativa && this.cartaoEstaAtivo(cartao));


    console.log("todosLancamentos:", this.todosLancamentos);

    this.movimentacoes = this.todosLancamentos
      .filter(lancamento => contasCartao.some(cartao => cartao.id === lancamento.vinculoId))
      .filter(lancamento => this.filtroBanco === 'todos' || contasCartao.find(cartao => cartao.id === lancamento.vinculoId)?.vinculoId === this.filtroBanco)
      .filter(lancamento => !this.dataInicial || lancamento.data >= this.dataInicial)
      .filter(lancamento => !this.dataFinal || lancamento.data <= this.dataFinal)
      .sort((a, b) => b.data.localeCompare(a.data));
  }

  private atualizarCartoes(): void {
    const contasCartao = this.cartoesApi.filter(cartao => this.cartaoEstaAtivo(cartao));
    
    this.cartoes = contasCartao.map((cartao, index) => {
      const banco = this.bancos.find(item => item.id === cartao.vinculoId) || {
        id: '', nome: 'Banco não informado', logo: '', cor: '#6366f1', corSecundaria: '#8b5cf6'
      };
      const utilizado = this.todosLancamentos
        .filter(l => l.vinculoId === cartao.id && l.tipo === 'debito' && l.data >= this.dataInicial)
        .reduce((total, l) => total + l.valor, 0);
      return { ...cartao, banco, limite: cartao.limite || 5000 + index * 2500, utilizado };
    });
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
    return this.todosLancamentos.filter(lancamento => {
      const cartao = this.cartoesApi.find(item => item.id === lancamento.vinculoId);
      return !!cartao && cartao.ativa && this.cartaoEstaAtivo(cartao) && (this.filtroBanco === 'todos' || cartao.vinculoId === this.filtroBanco);
    });
  }

  private formatarData(data: Date): string {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
  }

  private adicionarMeses(data: string, meses: number): string {
    const original = new Date(`${data}T12:00:00`);
    const resultado = new Date(original.getFullYear(), original.getMonth() + meses, 1);
    const ultimoDia = new Date(resultado.getFullYear(), resultado.getMonth() + 1, 0).getDate();
    resultado.setDate(Math.min(original.getDate(), ultimoDia));
    return this.formatarData(resultado);
  }

  private formatarDataVisual(data: string): string {
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

}
