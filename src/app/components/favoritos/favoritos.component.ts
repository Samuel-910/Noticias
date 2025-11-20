import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { NoticiaCardComponent } from '../noticia-card/noticia-card.component';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { FavoritoItem, FavoritosService } from '../../services/favoritos.service';

@Component({
  selector: 'app-favoritos',
  standalone: true,
  imports: [CommonModule, NoticiaCardComponent],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 py-8">
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
                  <svg class="w-8 h-8 text-red-500 fill-current" viewBox="0 0 24 24">
                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                  </svg>
                  Noticias Favoritas
                </h1>
                <p class="text-gray-600 mt-1">
                  {{ totalFavoritos }} {{ totalFavoritos === 1 ? 'noticia guardada' : 'noticias guardadas' }}
                </p>
              </div>
            </div>

            <button
              *ngIf="totalFavoritos > 0"
              (click)="limpiarFavoritos()"
              class="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              Limpiar favoritos
            </button>
          </div>

          <!-- Filtros rápidos -->
          <div *ngIf="totalFavoritos > 0" class="flex flex-wrap gap-2 mt-4">
            <button
              *ngFor="let cat of categorias"
              (click)="filtrarPorCategoria(cat)"
              [class.bg-red-500]="categoriaSeleccionada === cat"
              [class.text-white]="categoriaSeleccionada === cat"
              [class.bg-white]="categoriaSeleccionada !== cat"
              [class.text-gray-700]="categoriaSeleccionada !== cat"
              class="px-4 py-2 rounded-lg font-medium transition-colors shadow hover:shadow-md"
            >
              {{ cat }}
            </button>
            <button
              *ngIf="categoriaSeleccionada"
              (click)="limpiarFiltro()"
              class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
            >
              ✕ Limpiar filtro
            </button>
          </div>
        </div>

        <!-- Lista de favoritos -->
        <div *ngIf="favoritosFiltrados.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <app-noticia-card
            *ngFor="let item of favoritosFiltrados; trackBy: trackByItem"
            [noticia]="item.noticia!"
            [fechaFormateada]="formatearFecha(item.fecha_agregado)"
            (generarResumen)="onGenerarResumen($event)"
            (cerrarResumen)="onCerrarResumen($event)"
          ></app-noticia-card>
        </div>

        <!-- No hay resultados con filtro -->
        <div *ngIf="totalFavoritos > 0 && favoritosFiltrados.length === 0" class="text-center py-20">
          <div class="inline-flex items-center justify-center w-24 h-24 bg-red-100 rounded-full mb-6">
            <svg class="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2">No hay favoritos en esta categoría</h2>
          <p class="text-gray-600 mb-8">
            Intenta con otra categoría o limpia el filtro
          </p>
          <button
            (click)="limpiarFiltro()"
            class="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Limpiar filtro
          </button>
        </div>

        <!-- Estado vacío -->
        <div *ngIf="totalFavoritos === 0" class="text-center py-20">
          <div class="inline-flex items-center justify-center w-24 h-24 bg-red-100 rounded-full mb-6">
            <svg class="w-12 h-12 text-red-600 fill-current" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2">No tienes favoritos aún</h2>
          <p class="text-gray-600 mb-8">
            Guarda tus noticias favoritas haciendo clic en el corazón ❤️
          </p>
          <button
            (click)="volver()"
            class="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            Explorar noticias
          </button>
        </div>
      </div>
    </div>
  `
})
export class FavoritosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  favoritos: FavoritoItem[] = [];
  favoritosFiltrados: FavoritoItem[] = [];
  totalFavoritos = 0;
  categorias: string[] = [];
  categoriaSeleccionada: string | null = null;

  constructor(
    private favoritosService: FavoritosService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.favoritosService.favoritos$
      .pipe(takeUntil(this.destroy$))
      .subscribe(favoritos => {
        this.favoritos = favoritos;
        this.favoritosFiltrados = favoritos;
        this.totalFavoritos = favoritos.length;
        this.extraerCategorias();
      });

    this.favoritosService.cargarFavoritos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  extraerCategorias(): void {
    const categoriasSet = new Set<string>();
    this.favoritos.forEach(item => {
      if (item.noticia?.categoria) {
        categoriasSet.add(item.noticia.categoria);
      }
    });
    this.categorias = Array.from(categoriasSet).sort();
  }

  filtrarPorCategoria(categoria: string): void {
    this.categoriaSeleccionada = categoria;
    this.favoritosFiltrados = this.favoritos.filter(
      item => item.noticia?.categoria === categoria
    );
  }

  limpiarFiltro(): void {
    this.categoriaSeleccionada = null;
    this.favoritosFiltrados = this.favoritos;
  }

  async limpiarFavoritos(): Promise<void> {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Se eliminarán todas tus noticias favoritas',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, limpiar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      await this.favoritosService.limpiarFavoritos();
      Swal.fire({
        title: '¡Listo!',
        text: 'Tus favoritos han sido eliminados',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    }
  }

  formatearFecha(fecha: string): string {
    try {
      const date = new Date(fecha);
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

  trackByItem(index: number, item: FavoritoItem): number {
    return item.id_noticia;
  }
}
