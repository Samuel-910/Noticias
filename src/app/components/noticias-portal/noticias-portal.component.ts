import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, combineLatest } from 'rxjs';

import { Noticia, FiltrosNoticia, OrdenamientoNoticia } from '../../models/noticia';
import { NoticiasService } from '../../services/noticias.service';
import { TrendingService } from '../../services/trending.service';

import { FiltrosSidebarComponent } from '../filtros-sidebar/filtros-sidebar.component';
import { NoticiaCardComponent } from '../noticia-card/noticia-card.component';
import { TrendingPanelComponent } from '../trending-panel/trending-panel.component';
import { PaginacionComponent } from '../paginacion/paginacion.component';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { initFlowbite } from 'flowbite';
import { ChatbotComponent } from '../chatbot/chatbot.component';
import { PlanesModalComponent } from '../planes-modal/planes-modal.component';
import { ResumenIaService } from '../../services/resumen-ia.service';

@Component({
  selector: 'app-noticias-portal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FiltrosSidebarComponent,
    NoticiaCardComponent,
    TrendingPanelComponent,
    PaginacionComponent,
    RouterModule,
    ChatbotComponent,
    PlanesModalComponent
],
  templateUrl: './noticias-portal.component.html'
})
export class NoticiasPortalComponent implements OnInit, OnDestroy {
  Math = Math;
  private destroy$ = new Subject<void>();
@ViewChild('planesModal') planesModal!: PlanesModalComponent;

  noticias: Noticia[] = [];
  noticiasFiltradas: Noticia[] = [];
  noticiasPaginadas: Noticia[] = [];
  noticiasTrending: Noticia[] = [];

  // Estado
  filtros: FiltrosNoticia = {
    busqueda: '',
    categoria: '',
    pais: '',
    region: '',
    ciudad: '',
    tipoNoticia: '',
    idioma: '',
    fuente: '',
    fechaInicio: '',
    fechaFin: '',
    rangoTiempo: ''
  };
  ordenamiento: OrdenamientoNoticia = {
    campo: 'fecha_publicacion',
    direccion: 'desc'
  };

  mostrarTrending: boolean = false;


  private _isLoggedIn: boolean = false;

  // Opciones para filtros
  opcionesFiltros = {
    categorias: [] as string[],
    paises: [] as string[],
    regiones: [] as string[],
    ciudades: [] as string[],
    tiposNoticia: [] as string[],
    idiomas: [] as string[],
    fuentes: [] as string[]
  };

  // Paginación
  paginaActual = 1;
  itemsPorPagina = 25;
  totalPaginas = 0;

  constructor(
    private noticiasService: NoticiasService,
    private resumenIaService: ResumenIaService,
    private trendingService: TrendingService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.router.events.pipe(takeUntil(this.destroy$)).subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.checkAuthStatus();
      }
    });
  }

  async ngOnInit() {
    initFlowbite();
    await this.cargarNoticias();

    this.suscribirCambios();
    this.checkAuthStatus();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  private checkAuthStatus(): void {
    this._isLoggedIn = !!localStorage.getItem('sb-mjompchhwvbqpnjnqlma-auth-token');
    console.log('Estado de autenticación:', this._isLoggedIn);
    this.cdr.detectChanges();
  }
  isLoggedIn(): boolean {
    return !!localStorage.getItem('sb-mjompchhwvbqpnjnqlma-auth-token');
  }
  async cargarNoticias() {
    try {
      await this.noticiasService.cargarNoticias();
      this.noticias = this.noticiasService.getNoticias();
      console.log('Noticias recibidas de Supabase:', this.noticias);
      this.opcionesFiltros = this.noticiasService.extraerOpcionesFiltros(this.noticias);
      this.trendingService.calcularTrending(this.noticias);
      this.aplicarFiltrosYOrdenamiento();
    } catch (error) {
      console.error('Error cargando noticias:', error);
    }
  }

  suscribirCambios() {
    // Suscribirse a cambios de filtros y ordenamiento
    combineLatest([
      this.noticiasService.filtros$,
      this.noticiasService.ordenamiento$,
      this.trendingService.mostrarTrending$,
      this.trendingService.noticiasTrending$
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([filtros, ordenamiento, mostrarTrending, noticiasTrending]) => {
        this.filtros = filtros;
        this.ordenamiento = ordenamiento;
        this.mostrarTrending = mostrarTrending;
        this.noticiasTrending = noticiasTrending;
        this.aplicarFiltrosYOrdenamiento();
      });
  }

  aplicarFiltrosYOrdenamiento() {
    // Filtrar
    this.noticiasFiltradas = this.noticiasService.filtrarNoticias(
      this.noticias,
      this.filtros
    );

    // Ordenar
    this.noticiasFiltradas = this.noticiasService.ordenarNoticias(
      this.noticiasFiltradas,
      this.ordenamiento
    );

    // Paginar
    this.calcularPaginacion();
  }

  calcularPaginacion() {
    this.totalPaginas = Math.ceil(this.noticiasFiltradas.length / this.itemsPorPagina);
    this.paginaActual = Math.min(this.paginaActual, this.totalPaginas || 1);
    this.actualizarPaginacion();
  }

  actualizarPaginacion() {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    this.noticiasPaginadas = this.noticiasFiltradas.slice(inicio, fin);
  }

  // Eventos de filtros
  onFiltrosChange(filtros: Partial<FiltrosNoticia>) {
    this.noticiasService.actualizarFiltros(filtros);
  }

  onRangoTiempoChange(rangoTiempo: string) {
    this.noticiasService.aplicarRangoTiempo(rangoTiempo);
  }

  onLimpiarFiltros() {
    this.noticiasService.limpiarFiltros();
  }

  // Eventos de ordenamiento
  onOrdenamientoChange(campo: keyof Noticia) {
    this.noticiasService.actualizarOrdenamiento({ campo });
  }

  onToggleDireccion() {
    this.noticiasService.toggleDireccionOrdenamiento();
  }

  // Eventos de paginación
  onCambiarPagina(pagina: number) {
    this.paginaActual = pagina;
    this.actualizarPaginacion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onCambiarItemsPorPagina(items: number) {
    this.itemsPorPagina = items;
    this.paginaActual = 1;
    this.calcularPaginacion();
  }

  // Eventos de trending
  onToggleTrending() {
    this.trendingService.toggleTrending();
  }

  onCerrarTrending() {
    this.trendingService.cerrarTrending();
  }

  // Eventos de resúmenes IA
  async onGenerarResumen(noticia: Noticia) {
    await this.resumenIaService.generarResumen(noticia);
  }

  onCerrarResumen(noticia: Noticia) {
    this.resumenIaService.cerrarResumen(noticia);
  }

  // Utilidades
  formatearFecha(fecha: string): string {
    return this.noticiasService.formatearFecha(fecha);
  }

  logout(): void {
    localStorage.removeItem('sb-mjompchhwvbqpnjnqlma-auth-token');
    Swal.fire({
      icon: 'success',
      title: 'Sesión cerrada',
      text: 'Has cerrado sesión correctamente.',
      confirmButtonText: 'Aceptar'
    });
    this.router.navigate(['/']);
  }
}