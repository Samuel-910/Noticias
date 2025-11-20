// src/app/components/trending-panel/trending-panel.component.ts

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Noticia } from '../../models/noticia';

@Component({
  selector: 'app-trending-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="mostrar" class="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg shadow-lg p-6 mb-6 border-2 border-orange-200 animate-fade-in">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-bold text-gray-900 flex items-center">
          <svg class="w-7 h-7 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
          </svg>
          Noticias en Tendencia
        </h2>
        <button
          (click)="cerrar.emit()"
          class="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          *ngFor="let noticia of noticias; let i = index"
          class="bg-white rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer border-l-4"
          [class.border-red-500]="i < 3"
          [class.border-orange-400]="i >= 3 && i < 6"
          [class.border-yellow-400]="i >= 6"
        >
          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0">
              <span class="text-2xl font-bold" 
                    [class.text-red-500]="i < 3" 
                    [class.text-orange-500]="i >= 3 && i < 6" 
                    [class.text-yellow-500]="i >= 6">
                #{{i + 1}}
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">
                {{noticia.titulo}}
              </h3>
              <div class="flex items-center space-x-2 text-xs text-gray-500">
                <span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{{noticia.categoria}}</span>
                <span>•</span>
                <span>{{formatearFecha(noticia.fecha_publicacion)}}</span>
                <span *ngIf="noticia.vistas" class="ml-auto text-orange-600 font-medium">
                  👁️ {{noticia.vistas}}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
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
  `]
})
export class TrendingPanelComponent {
  @Input() mostrar: boolean = false;
  @Input() noticias: Noticia[] = [];
  @Output() cerrar = new EventEmitter<void>();

  formatearFecha(fecha: string): string {
    const fechaObj = new Date(fecha);
    const ahora = new Date();
    const diferencia = ahora.getTime() - fechaObj.getTime();
    const horas = Math.floor(diferencia / 3600000);
    const dias = Math.floor(diferencia / 86400000);

    if (horas < 24) {
      return `Hace ${horas}h`;
    } else if (dias < 7) {
      return `Hace ${dias}d`;
    } else {
      return fechaObj.toLocaleDateString('es-ES', {
        month: 'short',
        day: 'numeric'
      });
    }
  }
}