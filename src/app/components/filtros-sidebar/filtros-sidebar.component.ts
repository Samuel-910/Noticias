// src/app/components/filtros-sidebar/filtros-sidebar.component.ts

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FiltrosNoticia, RANGOS_TIEMPO } from '../../models/noticia';

@Component({
  selector: 'app-filtros-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filtros-sidebar.component.html'
})
export class FiltrosSidebarComponent {
  @Input() filtros!: FiltrosNoticia;
  @Input() categorias: string[] = [];
  @Input() paises: string[] = [];
  @Input() regiones: string[] = [];
  @Input() ciudades: string[] = [];
  @Input() tiposNoticia: string[] = [];
  @Input() idiomas: string[] = [];
  @Input() fuentes: string[] = [];

  @Output() filtrosChange = new EventEmitter<Partial<FiltrosNoticia>>();
  @Output() rangoTiempoChange = new EventEmitter<string>();
  @Output() limpiarFiltros = new EventEmitter<void>();

  rangosTiempo = RANGOS_TIEMPO;

  onFiltroChange(campo: keyof FiltrosNoticia, valor: any): void {
    this.filtrosChange.emit({ [campo]: valor });
  }

  onRangoTiempoChange(rangoTiempo: string): void {
    this.rangoTiempoChange.emit(rangoTiempo);
  }

  onLimpiarFiltros(): void {
    this.limpiarFiltros.emit();
  }
}