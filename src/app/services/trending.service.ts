// src/app/services/trending.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Noticia } from '../models/noticia';


@Injectable({
  providedIn: 'root'
})
export class TrendingService {
  private mostrarTrendingSubject = new BehaviorSubject<boolean>(false);
  public mostrarTrending$ = this.mostrarTrendingSubject.asObservable();

  private noticiasTrendingSubject = new BehaviorSubject<Noticia[]>([]);
  public noticiasTrending$ = this.noticiasTrendingSubject.asObservable();

  constructor() {}

  calcularTrending(noticias: Noticia[]): void {
    // Simulamos vistas basadas en fecha (más reciente = más vistas)
    // En producción, esto vendría de una columna real de vistas en la BD
    const noticiasConVistas = noticias.map(noticia => {
      const fechaPublicacion = new Date(noticia.fecha_publicacion).getTime();
      const ahora = new Date().getTime();
      const antiguedadHoras = (ahora - fechaPublicacion) / (1000 * 60 * 60);
      
      // Fórmula simple: más reciente = más "vistas"
      const vistas = Math.max(0, Math.floor(1000 - antiguedadHoras * 10 + Math.random() * 500));
      
      return { ...noticia, vistas };
    });

    const trending = noticiasConVistas
      .sort((a, b) => (b.vistas || 0) - (a.vistas || 0))
      .slice(0, 10);

    this.noticiasTrendingSubject.next(trending);
  }

  toggleTrending(): void {
    this.mostrarTrendingSubject.next(!this.mostrarTrendingSubject.value);
  }

  cerrarTrending(): void {
    this.mostrarTrendingSubject.next(false);
  }

  getMostrarTrending(): boolean {
    return this.mostrarTrendingSubject.value;
  }

  getNoticiasTrending(): Noticia[] {
    return this.noticiasTrendingSubject.value;
  }
}