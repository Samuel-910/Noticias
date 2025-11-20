import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-paginacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './paginacion.component.html',
  styleUrls: ['./paginacion.component.css']
})
export class PaginacionComponent implements OnChanges {
  @Input() paginaActual: number = 1;
  @Input() totalResultados: number = 0;
  @Input() itemsPorPagina: number = 25;
  @Output() cambiarPagina = new EventEmitter<number>();
  @Output() cambiarItemsPorPagina = new EventEmitter<number>();
@Input() totalPaginas!: number;

  paginas: number[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['totalResultados'] || changes['itemsPorPagina']) {
      this.calcularPaginacion();
    }
  }

  calcularPaginacion(): void {
    if (this.totalResultados > 0 && this.itemsPorPagina > 0) {
      this.totalPaginas = Math.ceil(this.totalResultados / this.itemsPorPagina);
      this.paginas = Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
    } else {
      this.totalPaginas = 0;
      this.paginas = [];
    }
  }

  onPaginaAnterior(): void {
    if (this.paginaActual > 1) {
      this.cambiarPagina.emit(this.paginaActual - 1);
    }
  }

  onPaginaSiguiente(): void {
    if (this.paginaActual < this.totalPaginas) {
      this.cambiarPagina.emit(this.paginaActual + 1);
    }
  }

  onIrAPagina(pagina: number): void {
    this.cambiarPagina.emit(pagina);
  }

  onItemsPorPaginaChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const items = Number(target.value);
    this.cambiarItemsPorPagina.emit(items);
  }
}
