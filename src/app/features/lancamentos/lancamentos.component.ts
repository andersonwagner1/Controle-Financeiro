import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { LancamentoService } from '../../core/services/lancamento.service';
import { ContaService } from '../../core/services/conta.service';
import { BancoService } from '../../core/services/banco.service';
import { Lancamento, CATEGORIAS_CREDITO, CATEGORIAS_DEBITO } from '../../core/models/lancamento.model';
import { Conta, TIPOS_CONTA } from '../../core/models/conta.model';
import { Banco } from '../../core/models/banco.model';
import { CategoriaService } from '../../core/services/categoria.service';

@Component({
  selector: 'app-lancamentos',
  templateUrl: './lancamentos.component.html',
  styleUrls: ['./lancamentos.component.scss']
})
export class LancamentosComponent implements OnInit, OnDestroy {
  private subs = new Subscription();

  lancamentos: Lancamento[] = [];
  lancamentosFiltrados: Lancamento[] = [];
  contas: Conta[] = [];
  bancos: Banco[] = [];
  tiposConta = TIPOS_CONTA;
  categoriasCredito: string[] = CATEGORIAS_CREDITO.slice();
  categoriasDebito: string[] = CATEGORIAS_DEBITO.slice();

  filtroTipo = 'todos';
  filtroConta = 'todas';
  filtroCompetencia = new Date().toISOString().substring(0, 7); // YYYY-MM
  categoriasDisponiveis: string[] = [];

  showModal = false;
  tipoModal: 'credito' | 'debito' | 'transferencia' = 'credito';
  isEditando = false;
  lancamentoIdEditando: string | null = null;
  form!: FormGroup;
  erroTransferencia = '';

  constructor(
    private lancamentoService: LancamentoService,
    private contaService: ContaService,
    private bancoService: BancoService,
    private categoriaService: CategoriaService,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.subs.add(
      this.bancoService.getBancos().subscribe(b => { this.bancos = b; })
    );
    this.initForm();

    this.subs.add(this.categoriaService.getCategorias().subscribe(categorias => {
      this.categoriasCredito = categorias.filter(c => c.tipo === 'C' && c.ativo === 'A').map(c => c.nome);
      this.categoriasDebito = categorias.filter(c => c.tipo === 'D' && c.ativo === 'A').map(c => c.nome);
    }));

    this.subs.add(
      this.contaService.getContas().subscribe(c => { this.contas = c; })
    );
    this.subs.add(
      this.lancamentoService.getLancamentos().subscribe(l => {
        this.lancamentos = l;
        this.aplicarFiltros();
      })
    );
  }

  initForm(): void {
    this.form = this.fb.group({
      contaId: ['', Validators.required],
      contaDestinoId: [''], // Only used for transfers
      descricao: ['', [Validators.required, Validators.minLength(2)]],
      categoria: [''], // Will be dynamically validated if not transfer
      valor: [null, [Validators.required, Validators.min(0.01)]],
      data: [new Date().toISOString().split('T')[0], Validators.required],
      competencia: [new Date().toISOString().substring(0, 7), Validators.required],
      observacao: [''],
    }, { validators: this.validarContasDiferentes });
  }

  validarContasDiferentes(group: FormGroup): { [key: string]: boolean } | null {
    const origem = group.get('contaId')?.value;
    const destino = group.get('contaDestinoId')?.value;
    return origem && destino && origem === destino ? { mesmaConta: true } : null;
  }

  aplicarFiltros(): void {
    let resultado = [...this.lancamentos];

    if (this.filtroTipo !== 'todos') {
      resultado = resultado.filter(l => l.tipo === this.filtroTipo);
    }

    if (this.filtroConta !== 'todas') {
      resultado = resultado.filter(l => l.contaId === this.filtroConta);
    }

    if (this.filtroCompetencia) {
      resultado = resultado.filter(l => (l.competencia || l.data.substring(0, 7)) === this.filtroCompetencia);
    }

    this.lancamentosFiltrados = resultado.sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    );
  }

  get totalCreditos(): number {
    return this.lancamentosFiltrados
      .filter(l => l.tipo === 'credito').reduce((acc, l) => acc + l.valor, 0);
  }

  get totalDebitos(): number {
    return this.lancamentosFiltrados
      .filter(l => l.tipo === 'debito').reduce((acc, l) => acc + l.valor, 0);
  }

  abrirModal(tipo: 'credito' | 'debito' | 'transferencia'): void {
    this.isEditando = false;
    this.lancamentoIdEditando = null;
    this.tipoModal = tipo;
    this.erroTransferencia = '';
    this.form.reset({
      data: new Date().toISOString().split('T')[0],
      competencia: this.filtroCompetencia,
      contaDestinoId: ''
    });

    if (tipo === 'transferencia') {
      this.form.get('categoria')?.clearValidators();
      this.form.get('contaDestinoId')?.setValidators(Validators.required);
    } else {
      this.form.get('categoria')?.setValidators(Validators.required);
      this.form.get('contaDestinoId')?.clearValidators();
    }
    this.form.get('categoria')?.updateValueAndValidity();
    this.form.get('contaDestinoId')?.updateValueAndValidity();

    this.showModal = true;
  }

  editarLancamento(lancamento: Lancamento): void {
    this.isEditando = true;
    this.lancamentoIdEditando = lancamento.id;
    this.tipoModal = lancamento.tipo; // For edits, we only support credito/debito for now
    this.form.get('categoria')?.setValidators(Validators.required);
    this.form.get('contaDestinoId')?.clearValidators();
    this.form.get('categoria')?.updateValueAndValidity();
    this.form.get('contaDestinoId')?.updateValueAndValidity();

    this.form.patchValue({
      contaId: lancamento.contaId,
      descricao: lancamento.descricao,
      categoria: lancamento.categoria,
      valor: lancamento.valor,
      data: lancamento.data,
      competencia: lancamento.competencia || lancamento.data.substring(0, 7),
      observacao: lancamento.observacao
    });
    this.showModal = true;
  }

  excluirLancamento(lancamento: Lancamento): void {
    if (confirm(`Tem certeza que deseja excluir o lançamento "${lancamento.descricao}"?`)) {
      this.lancamentoService.removerLancamento(lancamento.id);
    }
  }

  fecharModal(): void {
    this.showModal = false;
  }

  get categoriasForm(): string[] {
    return this.tipoModal === 'credito' ? this.categoriasCredito : this.categoriasDebito;
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

  getContasDisponiveisPorBanco(bancoId: string): Conta[] {
    return this.contasDisponiveis.filter(conta => conta.bancoId === bancoId);
  }

  alterarCompetencia(): void {
    if (this.filtroConta !== 'todas' && !this.contasDisponiveis.some(conta => conta.id === this.filtroConta)) {
      this.filtroConta = 'todas';
    }
    this.aplicarFiltros();
  }

  alterarMesCompetencia(offset: number): void {
    const [ano, mes] = this.filtroCompetencia.split('-').map(Number);
    const novaCompetencia = new Date(ano, mes - 1 + offset, 1);
    this.filtroCompetencia = `${novaCompetencia.getFullYear()}-${String(novaCompetencia.getMonth() + 1).padStart(2, '0')}`;
    this.alterarCompetencia();
  }

  salvarLancamento(): void {
    if (this.form.invalid) return;
    const val = this.form.value;
    
    if (this.tipoModal === 'transferencia') {
      const sucesso = this.lancamentoService.realizarTransferencia({
        contaOrigemId: val.contaId,
        contaDestinoId: val.contaDestinoId,
        valor: +val.valor,
        data: val.data,
        competencia: val.competencia,
        descricao: val.descricao,
      });
      if (!sucesso) {
        this.erroTransferencia = 'Saldo insuficiente ou contas inválidas.';
        return;
      }
    } else {
      if (this.isEditando && this.lancamentoIdEditando) {
        this.lancamentoService.atualizarLancamento({
          id: this.lancamentoIdEditando,
          contaId: val.contaId,
          tipo: this.tipoModal,
          descricao: val.descricao,
          categoria: val.categoria,
          valor: +val.valor,
          data: val.data,
          competencia: val.competencia,
          observacao: val.observacao || undefined,
        });
      } else {
        this.lancamentoService.adicionarLancamento({
          contaId: val.contaId,
          tipo: this.tipoModal,
          descricao: val.descricao,
          categoria: val.categoria,
          valor: +val.valor,
          data: val.data,
          competencia: val.competencia,
          observacao: val.observacao || undefined,
        });
      }
    }
    
    this.fecharModal();
  }

  getContaNome(contaId: string): string {
    const conta = this.contas.find(c => c.id === contaId);
    return conta ? conta.descricao : contaId;
  }

  getBancoNome(contaId: string): string {
    const conta = this.contas.find(c => c.id === contaId);
    if (!conta) return '';
    const banco = this.bancos.find(b => b.id === conta.bancoId);
    return banco ? banco.nome : '';
  }

  getContaTipo(contaId: string): string {
    return this.contas.find(c => c.id === contaId)?.tipo ?? '';
  }

  getBancoCor(contaId: string): string {
    const conta = this.contas.find(c => c.id === contaId);
    if (!conta) return '#888';
    return this.bancos.find(b => b.id === conta.bancoId)?.cor ?? '#888';
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
