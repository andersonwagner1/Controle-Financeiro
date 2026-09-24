import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { LancamentoService, PaginaLancamentos } from '../../core/services/lancamento.service';
import { ContaService } from '../../core/services/conta.service';
import { BancoService } from '../../core/services/banco.service';

import { Conta, TIPOS_CONTA } from '../../core/models/conta.model';
import { Banco } from '../../core/models/banco.model';
import { CategoriaService } from '../../core/services/categoria.service';
import { Investimento } from '../../core/models/investimento.model';
import { InvestimentoService } from '../../core/services/investimento.service';
import { VinculoService } from '../../core/services/vinculo.service';
import { Vinculo } from '../../core/models/vinculo.model';
import { Categoria } from '../../core/models/categoria.model';
import { Lancamento } from '../../core/models/lancamento.model';

@Component({
  selector: 'app-lancamentos',
  templateUrl: './lancamentos.component.html',
  styleUrls: ['./lancamentos.component.scss']
})
export class LancamentosComponent implements OnInit {




  lancamentosFiltrados: Lancamento[] = [];
  contas: Conta[] = [];
  bancos: Banco[] = [];
  tiposConta = TIPOS_CONTA;
  categoriasCredito: string[] = [];
  categoriasDebito: string[] = [];
  investimentos: Investimento[] = [];

  filtroTipo = 'todos';
  filtroConta = 'todas';
  filtroCompetencia = new Date().toISOString().substring(0, 7); // YYYY-MM
  categoriasDisponiveis: string[] = [];
  paginaAtual = 0;
  totalPaginas = 0;
  totalLancamentos = 0;
  readonly tamanhoPagina = 50;

  showModal = false;
  tipoModal: 'RESGATE'| 'APLICACAO' |'CREDITO' | 'DEBITO' | 'TRANSFERENCIA' = 'CREDITO';
  isEditando = false;
  lancamentoIdEditando: number | null = null;
  form!: FormGroup;
  erroTransferencia = '';
  mensagemErro = '';
  mensagemSucesso = '';
  salvando = false;
  ngOnInit(): void {
    this.bancoService.getBancos().subscribe(b=>{
      this.bancos = b
    });

    this.categoriaService.getCategorias().subscribe(categorias =>{
      
      this.categoriasCredito = categorias
          .filter(t => t.tipo === 'CREDITO')
          .map(t => t.nome);
      this.categoriasDebito = categorias
          .filter(t => t.tipo === 'DEBITO')
          .map(t => t.nome);
          });

    this.contaService.getContas().subscribe(c => { this.contas = c; })
    
     this.form = this.fb.group({
      bancoContaId: ['', Validators.required],
      bancoContaDestinoId: [''], // Only used for transfers
      tipoTransferencia: ['TRANSFERENCIA'],
      investimento: [{ value: '', disabled: true }],
      
      categoria: [''], // Will be dynamically validated if not transfer
      valor: [null, [Validators.required, Validators.min(0.01)]],
     // data: [new Date().toISOString().split('T')[0], Validators.required],
     data: '2026/09/25',
     
      observacao: [''],
    });/*, { validators: this.validarContasDiferentes })*/
    
  }

  


   constructor(
    private lancamentoService: LancamentoService,
    private contaService: ContaService,
    private bancoService: BancoService,
    private categoriaService: CategoriaService,
    private investimentoService: InvestimentoService,
    private vinculoService: VinculoService,

    private fb: FormBuilder,
  ) {}



    get totalCreditos(): number {
    return this.lancamentosFiltrados.filter(l => l.tipo === 'CREDITO').reduce((acc, l) => acc + l.valor, 0);
  }

  get totalDebitos(): number {
    return this.lancamentosFiltrados.filter(l => l.tipo === 'DEBITO').reduce((acc, l) => acc + l.valor, 0);
  }


  abrirModal(tipo: 'DEBITO' | 'CREDITO' | 'TRANSFERENCIA' | 'APLICACAO' | 'RESGATE'): void {
    this.isEditando = false;
    this.lancamentoIdEditando = null;
    this.tipoModal = tipo;
    this.erroTransferencia = '';
    this.mensagemErro = '';
    this.mensagemSucesso = '';
    this.form.reset({
      data: new Date().toISOString().split('T')[0],
      competencia: this.filtroCompetencia,
      bancoContaDestinoId: '',
      tipoTransferencia: 'TRANSFERENCIA',
      investimento: ''
    });
    this.alterarAplicacao();

    if (tipo === 'TRANSFERENCIA') {
      this.form.get('categoria')?.clearValidators();
      this.form.get('bancoContaDestinoId')?.setValidators(Validators.required);
    } else {
      this.form.get('categoria')?.setValidators(Validators.required);
      this.form.get('bancoContaDestinoId')?.clearValidators();
    }
    this.form.get('categoria')?.updateValueAndValidity();
    this.form.get('bancoContaDestinoId')?.updateValueAndValidity();

    this.showModal = true;



  }


  fecharModal(): void {
      this.showModal = false;
  }

  aplicarFiltros(): void {
  }

   alterarConta(): void {    
    this.carregarPagina();
  }

   private carregarPagina(): void {
    
    const { dataInicio, dataFim } = this.periodoDaCompetencia();

    

    const bancoContaId = this.filtroConta === 'todas' ? undefined : Number(this.filtroConta);

    //Adicionar metodo para buscar os lancamentos

    this.lancamentoService.buscarPagina(dataInicio, dataFim, this.paginaAtual, this.tamanhoPagina, bancoContaId)
      .subscribe({
        next: (resultado: Lancamento[]) => {
          this.lancamentosFiltrados = resultado;
          this.totalLancamentos = resultado.length;
        },
        error: () => {
          //this.lancamentos = [];
          this.lancamentosFiltrados = [];
          this.totalPaginas = 0;
          this.totalLancamentos = 0;
        }
      });
  }

  private periodoDaCompetencia(): { dataInicio: string; dataFim: string } {
    const [ano, mes] = this.filtroCompetencia.split('-').map(Number);
    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 0);
    const formatar = (data: Date) => `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
    return { dataInicio: formatar(inicio), dataFim: formatar(fim) };
  }

    getContasDisponiveisPorBanco(bancoId: number): Conta[] {
    return this.contasDisponiveis.filter(conta => conta.bancoId === bancoId);
  }

    get contasDisponiveis(): Conta[] {
    if (!this.filtroCompetencia) return this.contas.filter(conta => conta.ativa);

    const [ano, mes] = this.filtroCompetencia.split('-').map(Number);
    const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
    const fim = new Date(ano, mes, 0).toISOString().split('T')[0];

    return this.contas.filter(conta => {
      const abertaNaCompetencia = conta.dataAbertura <= fim;
      const naoFechadaNaCompetencia = !conta.dataFechamento || conta.dataFechamento >= inicio;
      return conta.ativa && abertaNaCompetencia && naoFechadaNaCompetencia;
    });
  }




    selecionarTipoTransferencia(tipo: 'TRANSFERENCIA' | 'APLICACAO' | 'RESGATE'): void {
      this.form.get('tipoTransferencia')?.setValue(tipo);
      this.alterarAplicacao();
    }

    alterarAplicacao(): void {
    const investimento = this.form.get('investimento');
    if (this.form.get('tipoTransferencia')?.value !== 'TRANSFERENCIA') {
      investimento?.enable();
    } else {
      investimento?.reset('');
      investimento?.disable();
    }
  }

    alterarMesCompetencia(offset: number): void {
      
      const [ano, mes] = this.filtroCompetencia.split('-').map(Number);
      const novaCompetencia = new Date(ano, mes - 1 + offset, 1);
      this.filtroCompetencia = `${novaCompetencia.getFullYear()}-${String(novaCompetencia.getMonth() + 1).padStart(2, '0')}`;
      this.alterarCompetencia();
    }


    listarAplicacoesPorBancoConta(){
      let val = this.form.value;

       this.investimentoService.getInvestimentosAtivos(val.bancoContaDestinoId).subscribe(investimentos => {
          this.investimentos = investimentos;
             console.log(investimentos);
        });
    }


  alterarPagina(offset: number): void {
    const pagina = this.paginaAtual + offset;
    if (pagina < 0 || pagina >= this.totalPaginas) return;
    this.paginaAtual = pagina;
    this.carregarPagina();
  }

    alterarCompetencia(): void {
    if (this.filtroConta !== 'todas' && !this.contasDisponiveis.some(conta => conta.id+"" === this.filtroConta)) {
      this.filtroConta = 'todas';
    }
    this.paginaAtual = 0;
    this.carregarPagina();
  }

   get periodoConsulta(): { dataInicio: string; dataFim: string } {
    return this.periodoDaCompetencia();
  }

    getContaNome(contaId: number): string {
    const conta = this.contas.find(c => c.id === contaId);
    return conta ? conta.descricao : contaId + "-";
  }

  
  getBancoCor(contaId: number): string {
    const conta = this.contas.find(c => c.id === contaId);
    if (!conta) return '#888';
    return this.bancos.find(b => b.id === conta.bancoId)?.cor ?? '#888';
  }

    getBancoNome(contaId: number): string {
    const conta = this.contas.find(c => c.id === contaId);
    if (!conta) return '';
    const banco = this.bancos.find(b => b.id === conta.bancoId);
    return banco ? banco.nome : '';
  }


    getContaTipo(contaId: number): string {
    return this.contas.find(c => c.id === contaId)?.tipo ?? '';
  }


  salvarLancamento(): void {
    if (this.form.invalid || this.salvando) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando = true;
    this.mensagemErro = '';
    this.mensagemSucesso = '';
    const val = this.form.value;
    let requisicao: Observable<unknown>;

    if (this.tipoModal === 'TRANSFERENCIA') {
      

      requisicao = this.lancamentoService.realizarTransferencia({
        bancoContaId: val.bancoContaId,
        bancoContaDestinoId: val.bancoContaDestinoId,
        valor: +val.valor,
        data: val.data,
        observacao: val.observacao,
        investimento: val.investimento || undefined,
        tipoTransferencia: val.tipoTransferencia
      });
    } else {
      if (this.isEditando && this.lancamentoIdEditando) {
        requisicao = this.lancamentoService.atualizarLancamento({
          id: this.lancamentoIdEditando,
          bancoContaId: val.bancoContaId,
          tipo: this.tipoModal,          
          categoria: val.categoria,
          valor: +val.valor,
          data: val.data,
          
          observacao: val.observacao || undefined,
        });
      } else {
        requisicao = this.lancamentoService.adicionarLancamento({
          bancoContaId: val.bancoContaId,
          tipo: this.tipoModal,
          categoria: val.categoria,
          valor: +val.valor,
          data: val.data,
          
          observacao: val.observacao || undefined,
        });
      }
    }

    requisicao.subscribe({
      next: () => {
        this.salvando = false;
        this.mensagemSucesso = this.isEditando
          ? 'Lançamento atualizado com sucesso.'
          : 'Lançamento salvo com sucesso.';
        this.carregarPagina();
      },
      error: (erro: HttpErrorResponse) => {
        this.salvando = false;
        this.mensagemErro = this.obterMensagemErro(erro, 'Não foi possível salvar o lançamento.');
      }
    });
  }

  private obterMensagemErro(erro: HttpErrorResponse, mensagemPadrao: string): string {
    const mensagem = typeof erro.error === 'string'
      ? erro.error
      : erro.error?.message || erro.error?.mensagem;

    return mensagem || erro.message || mensagemPadrao;
  }

  get categoriasForm(): string[] {
    return this.tipoModal === 'CREDITO' ? this.categoriasCredito : this.categoriasDebito;
  }

  




}
