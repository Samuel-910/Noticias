// src/app/components/noticia-card/noticia-card.component.ts

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { Noticia } from '../../models/noticia';
import { FavoritosService } from '../../services/favoritos.service';
import { HistorialService } from '../../services/historial.service';
import { PlanAccessService } from '../../services/plan-access.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-noticia-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './noticia-card.component.html',
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .line-clamp-3 {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .animate-fade-in {
      animation: fadeIn 0.3s ease-out;
    }
    @keyframes heartBeat {
      0%, 100% { transform: scale(1); }
      25% { transform: scale(1.2); }
      50% { transform: scale(1.1); }
    }
    .animate-heart-beat {
      animation: heartBeat 0.3s ease-in-out;
    }
    @keyframes shine {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    .animate-shine {
      animation: shine 2s infinite;
    }
    @keyframes pulse-gold {
      0%, 100% { 
        box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.7);
      }
      50% { 
        box-shadow: 0 0 0 8px rgba(251, 191, 36, 0);
      }
    }
    .animate-pulse-gold {
      animation: pulse-gold 2s infinite;
    }
  `]
})
export class NoticiaCardComponent implements OnInit, OnDestroy {
  @Input() noticia!: Noticia;
  @Input() fechaFormateada: string = '';
  
  @Output() generarResumen = new EventEmitter<Noticia>();
  @Output() cerrarResumen = new EventEmitter<Noticia>();
  @Output() abrirModalPlanes = new EventEmitter<void>();

  private destroy$ = new Subject<void>();
  
  esFavorito = false;
  estaEnHistorial = false;
  animandoFavorito = false;
  
  // Control de acceso
  isPremium = false;
  puedeGenerarResumen = true;
  resumenesRestantes = 0;

  constructor(
    private favoritosService: FavoritosService,
    private historialService: HistorialService,
    public planAccessService: PlanAccessService
  ) {}

  ngOnInit(): void {
    // Verificar estado inicial
    this.verificarEstados();
    this.verificarAcceso();

    // Suscribirse a cambios en favoritos
    this.favoritosService.favoritos$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.esFavorito = this.favoritosService.esFavorito(this.noticia.id_noticia);
      });

    // Suscribirse a cambios en historial
    this.historialService.historial$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.estaEnHistorial = this.historialService.estaEnHistorial(this.noticia.id_noticia);
      });

    // Suscribirse a cambios de plan
    this.planAccessService.planActual$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.verificarAcceso();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private verificarEstados(): void {
    this.esFavorito = this.favoritosService.esFavorito(this.noticia.id_noticia);
    this.estaEnHistorial = this.historialService.estaEnHistorial(this.noticia.id_noticia);
  }

  private verificarAcceso(): void {
    this.isPremium = this.planAccessService.isPremium();
    const acceso = this.planAccessService.puedeGenerarResumen();
    this.puedeGenerarResumen = acceso.permitido;
    this.resumenesRestantes = this.planAccessService.getResumenesRestantes();
  }

  async toggleFavorito(event: Event): Promise<void> {
    event.stopPropagation();
    
    // Verificar si puede agregar más favoritos
    const totalFavoritos = this.favoritosService.getTotalFavoritos();
    const acceso = this.planAccessService.puedeAgregarFavorito(totalFavoritos);
    
    if (!acceso.permitido && !this.esFavorito) {
      // Mostrar modal de upgrade
      this.mostrarModalUpgrade('favoritos', acceso.motivo!);
      return;
    }
    
    this.animandoFavorito = true;
    const resultado = await this.favoritosService.toggleFavorito(this.noticia);
    
    if (resultado) {
      setTimeout(() => {
        this.animandoFavorito = false;
      }, 300);
    } else {
      this.animandoFavorito = false;
    }
  }

  async verOriginal(event: Event): Promise<void> {
    event.preventDefault();
    
    // Agregar al historial cuando el usuario hace clic en "Ver original"
    await this.historialService.agregarAlHistorial(this.noticia);
    
    // Abrir el enlace en una nueva pestaña
    window.open(this.noticia.url_fuente, '_blank', 'noopener,noreferrer');
  }

  onGenerarResumen(): void {
    // Verificar acceso
    const acceso = this.planAccessService.puedeGenerarResumen();
    
    if (!acceso.permitido) {
      // Mostrar modal de upgrade
      this.mostrarModalUpgrade('resúmenes con IA ilimitados', acceso.motivo!);
      return;
    }

    // Si ya tiene un resumen, solo mostrarlo
    if (this.noticia.resumen) {
      this.generarResumen.emit(this.noticia);
      return;
    }

    // Incrementar contador y generar resumen
    this.planAccessService.incrementarResumenes();
    this.verificarAcceso(); // Actualizar estado
    this.generarResumen.emit(this.noticia);
  }

  onCerrarResumen(): void {
    this.cerrarResumen.emit(this.noticia);
  }

  /**
   * Muestra modal para upgrade a premium
   */
  private mostrarModalUpgrade(feature: string, mensaje: string): void {
    Swal.fire({
      title: '🔒 Función Premium',
      html: `
        <div class="text-center">
          <div class="mb-4">
            <svg class="w-16 h-16 mx-auto text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
          </div>
          <p class="text-gray-600 mb-4">${mensaje}</p>
          <div class="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 mb-4">
            <p class="text-sm font-semibold text-gray-800 mb-2">Con Premium obtienes:</p>
            <ul class="text-sm text-left text-gray-700 space-y-1">
              <li>✨ ${feature}</li>
              <li>📰 Noticias ilimitadas</li>
              <li>💾 Historial ilimitado</li>
              <li>🎯 Filtros avanzados</li>
              <li>📊 Exportación de datos</li>
            </ul>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '⭐ Ver Planes Premium',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#6366f1',
      cancelButtonColor: '#6b7280',
      customClass: {
        confirmButton: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        // Emitir evento para abrir modal de planes
        this.abrirModalPlanes.emit();
      }
    });
  }

  onImageError(event: any): void {
    event.target.style.display = 'none';
    const parent = event.target.parentElement;
    if (parent && !parent.querySelector('.placeholder-gradient')) {
      parent.innerHTML = `
        <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 placeholder-gradient">
          <svg class="w-16 h-16 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
          </svg>
        </div>
      `;
    }
  }

  getTextoBotonResumen(): string {
    if (this.noticia.cargandoResumen) {
      return 'Generando resumen...';
    }
    if (this.noticia.resumen) {
      return this.noticia.mostrarResumen ? 'Ocultar resumen' : 'Ver resumen';
    }
    
    // Mostrar resúmenes restantes si es gratis
    if (!this.isPremium && this.resumenesRestantes >= 0) {
      return `Resumir con IA (${this.resumenesRestantes} restantes)`;
    }
    
    return 'Resumir con IA';
  }

  /**
   * Verifica si debe mostrar el bloqueo en el botón
   */
  estaBotonBloqueado(): boolean {
    return !this.puedeGenerarResumen && !this.noticia.resumen;
  }
}