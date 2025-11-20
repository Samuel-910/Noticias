import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { HistorialService, HistorialItem } from '../../services/historial.service';
import { NoticiaCardComponent } from '../noticia-card/noticia-card.component';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, NoticiaCardComponent],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-4">
              <button
                (click)="volver()"
                class="p-2 hover:bg-white rounded-lg transition-colors"
              >
                <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
              </button>
              <div>
                <h1 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Historial de Noticias
                </h1>
                <p class="text-gray-600 mt-1">
                  {{ totalHistorial }} {{ totalHistorial === 1 ? 'noticia vista' : 'noticias vistas' }}
                </p>
              </div>
            </div>

            <button
              *ngIf="totalHistorial > 0"
              (click)="limpiarHistorial()"
              class="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              Limpiar historial
            </button>
          </div>
        </div>

        <!-- Lista de noticias -->
        <div *ngIf="totalHistorial > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div *ngFor="let item of historial; trackBy: trackByItem" class="relative">
            <app-noticia-card
              [noticia]="item.noticia!"
              [fechaFormateada]="formatearFecha(item.fecha_vista)"
              (generarResumen)="onGenerarResumen($event)"
              (cerrarResumen)="onCerrarResumen($event)"
            ></app-noticia-card>
            
            <!-- Botón para eliminar del historial -->
            <button
              (click)="eliminarItem(item.id_noticia)"
              class="absolute top-2 left-2 z-20 w-8 h-8 bg-red-500/90 hover:bg-red-600 text-white rounded-full shadow-lg transition-all flex items-center justify-center group"
              title="Eliminar del historial"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Estado vacío -->
        <div *ngIf="totalHistorial === 0" class="text-center py-20">
          <div class="inline-flex items-center justify-center w-24 h-24 bg-blue-100 rounded-full mb-6">
            <svg class="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2">No hay historial</h2>
          <p class="text-gray-600 mb-8">
            Las noticias que veas aparecerán aquí automáticamente
          </p>
          <button
            (click)="volver()"
            class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  `
})
export class HistorialComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  historial: HistorialItem[] = [];
  totalHistorial = 0;

  constructor(
    private historialService: HistorialService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.historialService.historial$
      .pipe(takeUntil(this.destroy$))
      .subscribe(historial => {
        this.historial = historial;
        this.totalHistorial = historial.length;
      });

    this.historialService.cargarHistorial();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async limpiarHistorial(): Promise<void> {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Se eliminará todo tu historial de noticias',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, limpiar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      await this.historialService.limpiarHistorial();
      Swal.fire({
        title: '¡Listo!',
        text: 'Tu historial ha sido eliminado',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    }
  }

  async eliminarItem(idNoticia: number): Promise<void> {
    await this.historialService.eliminarDelHistorial(idNoticia);
  }

  formatearFecha(fecha: string): string {
    try {
      const date = new Date(fecha);
      const ahora = new Date();
      const diffMs = ahora.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHoras = Math.floor(diffMs / 3600000);
      const diffDias = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Hace un momento';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHoras < 24) return `Hace ${diffHoras}h`;
      if (diffDias < 7) return `Hace ${diffDias} días`;
      
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return fecha;
    }
  }

  volver(): void {
    this.router.navigate(['/']);
  }

  onGenerarResumen(noticia: any): void {
    // Implementar si tienes servicio de resúmenes
    console.log('Generar resumen:', noticia);
  }

  onCerrarResumen(noticia: any): void {
    // Implementar si tienes servicio de resúmenes
    console.log('Cerrar resumen:', noticia);
  }

  trackByItem(index: number, item: HistorialItem): number {
    return item.id_noticia;
  }
}
