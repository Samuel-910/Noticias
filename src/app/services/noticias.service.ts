// src/app/services/noticias.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { FiltrosNoticia, Noticia, OrdenamientoNoticia } from '../models/noticia';

@Injectable({
  providedIn: 'root'
})
export class NoticiasService {
  private noticiasSubject = new BehaviorSubject<Noticia[]>([]);
  public noticias$ = this.noticiasSubject.asObservable();

  private filtrosSubject = new BehaviorSubject<FiltrosNoticia>(this.getFiltrosIniciales());
  public filtros$ = this.filtrosSubject.asObservable();

  private ordenamientoSubject = new BehaviorSubject<OrdenamientoNoticia>({
    campo: 'fecha_publicacion',
    direccion: 'desc'
  });
  public ordenamiento$ = this.ordenamientoSubject.asObservable();

  constructor(private supabaseService: SupabaseService) { }

  private getFiltrosIniciales(): FiltrosNoticia {
    return {
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
  }

  async cargarNoticias(): Promise<void> {
    try {
      const resultado = await this.supabaseService.getNoticias();
      this.noticiasSubject.next(resultado.data);
    } catch (error) {
      console.error('Error cargando noticias:', error);
      throw error;
    }
  }

  getNoticias(): Noticia[] {
    return this.noticiasSubject.value;
  }

  getFiltros(): FiltrosNoticia {
    return this.filtrosSubject.value;
  }

  getOrdenamiento(): OrdenamientoNoticia {
    return this.ordenamientoSubject.value;
  }

  actualizarFiltros(filtros: Partial<FiltrosNoticia>): void {
    const filtrosActuales = this.filtrosSubject.value;
    this.filtrosSubject.next({ ...filtrosActuales, ...filtros });
  }

  limpiarFiltros(): void {
    this.filtrosSubject.next(this.getFiltrosIniciales());
  }

  actualizarOrdenamiento(ordenamiento: Partial<OrdenamientoNoticia>): void {
    const ordenamientoActual = this.ordenamientoSubject.value;
    this.ordenamientoSubject.next({ ...ordenamientoActual, ...ordenamiento });
  }

  toggleDireccionOrdenamiento(): void {
    const ordenamientoActual = this.ordenamientoSubject.value;
    this.actualizarOrdenamiento({
      direccion: ordenamientoActual.direccion === 'asc' ? 'desc' : 'asc'
    });
  }

  aplicarRangoTiempo(rangoTiempo: string): void {
    const ahora = new Date();
    let fechaInicio = '';
    let fechaFin = '';

    switch (rangoTiempo) {
      case 'ultima-hora':
        fechaInicio = new Date(ahora.getTime() - 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'ultimas-3-horas':
        fechaInicio = new Date(ahora.getTime() - 3 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'hoy':
        fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).toISOString().split('T')[0];
        break;
      case 'ayer':
        const ayer = new Date(ahora);
        ayer.setDate(ayer.getDate() - 1);
        fechaInicio = new Date(ayer.getFullYear(), ayer.getMonth(), ayer.getDate()).toISOString().split('T')[0];
        fechaFin = new Date(ayer.getFullYear(), ayer.getMonth(), ayer.getDate(), 23, 59, 59).toISOString().split('T')[0];
        break;
      case 'ultimos-7-dias':
        fechaInicio = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'este-mes':
        fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0];
        break;
    }

    this.actualizarFiltros({ rangoTiempo, fechaInicio, fechaFin });
  }

  filtrarNoticias(noticias: Noticia[], filtros: FiltrosNoticia): Noticia[] {
    return noticias.filter(noticia => {
      if (filtros.busqueda) {
        const busqueda = filtros.busqueda.toLowerCase();
        const coincide =
          noticia.titulo?.toLowerCase().includes(busqueda) ||
          noticia.contenido?.toLowerCase().includes(busqueda) ||
          noticia.entidades_mencionadas?.toLowerCase().includes(busqueda);
        if (!coincide) return false;
      }

      if (filtros.categoria && noticia.categoria !== filtros.categoria) return false;
      if (filtros.pais && noticia.pais !== filtros.pais) return false;
      if (filtros.region && noticia.region !== filtros.region) return false;
      if (filtros.ciudad && noticia.ciudad !== filtros.ciudad) return false;
      if (filtros.tipoNoticia && noticia.tipo_noticia !== filtros.tipoNoticia) return false;
      if (filtros.idioma && noticia.language !== filtros.idioma) return false;
      if (filtros.fuente && noticia.nombre_fuente !== filtros.fuente) return false;

      if (filtros.fechaInicio) {
        const fechaNoticia = new Date(noticia.fecha_publicacion);
        const fechaInicio = new Date(filtros.fechaInicio);
        if (fechaNoticia < fechaInicio) return false;
      }

      if (filtros.fechaFin) {
        const fechaNoticia = new Date(noticia.fecha_publicacion);
        const fechaFin = new Date(filtros.fechaFin);
        fechaFin.setHours(23, 59, 59, 999);
        if (fechaNoticia > fechaFin) return false;
      }

      return true;
    });
  }

  ordenarNoticias(noticias: Noticia[], ordenamiento: OrdenamientoNoticia): Noticia[] {
    return [...noticias].sort((a, b) => {
      // 1. Obtener valores (pueden ser 'undefined')
      const valorA = a[ordenamiento.campo];
      const valorB = b[ordenamiento.campo];

      if (valorA == null && valorB == null) return 0;
      if (valorA == null) return ordenamiento.direccion === 'asc' ? 1 : -1;
      if (valorB == null) return ordenamiento.direccion === 'asc' ? -1 : 1;

      let comparacion = 0;
      if (valorA < valorB) comparacion = -1;
      if (valorA > valorB) comparacion = 1;

      // 4. Aplicar dirección
      return ordenamiento.direccion === 'asc' ? comparacion : -comparacion;
    });
  }

  extraerOpcionesFiltros(noticias: Noticia[]): {
    categorias: string[];
    paises: string[];
    regiones: string[];
    ciudades: string[];
    tiposNoticia: string[];
    idiomas: string[];
    fuentes: string[];
  } {
    const obtenerUnicos = (campo: keyof Noticia) =>
      [...new Set(noticias.map(n => n[campo]).filter(v => v))].sort() as string[];

    return {
      categorias: obtenerUnicos('categoria'),
      paises: obtenerUnicos('pais'),
      regiones: obtenerUnicos('region'),
      ciudades: obtenerUnicos('ciudad'),
      tiposNoticia: obtenerUnicos('tipo_noticia'),
      idiomas: obtenerUnicos('language'),
      fuentes: obtenerUnicos('nombre_fuente')
    };
  }

  formatearFecha(fecha: string): string {
    const fechaObj = new Date(fecha);
    const ahora = new Date();
    const diferencia = ahora.getTime() - fechaObj.getTime();
    const minutos = Math.floor(diferencia / 60000);
    const horas = Math.floor(diferencia / 3600000);
    const dias = Math.floor(diferencia / 86400000);

    if (minutos < 1) {
      return 'Hace un momento';
    } else if (minutos < 60) {
      return `Hace ${minutos} minuto${minutos !== 1 ? 's' : ''}`;
    } else if (horas < 24) {
      return `Hace ${horas} hora${horas !== 1 ? 's' : ''}`;
    } else if (dias < 7) {
      return `Hace ${dias} día${dias !== 1 ? 's' : ''}`;
    } else {
      return fechaObj.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  }
}