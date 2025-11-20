import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Noticia } from '../models/noticia';
import { supabase } from './supabase.config';

export interface HistorialItem {
  id?: number;
  id_noticia: number;
  user_id: string;
  fecha_vista: string;
  noticia?: Noticia;
}

@Injectable({
  providedIn: 'root'
})
export class HistorialService {
  private historialSubject = new BehaviorSubject<HistorialItem[]>([]);
  public historial$ = this.historialSubject.asObservable();

  private readonly MAX_HISTORIAL_LOCAL = 100;
  private readonly STORAGE_KEY = 'historial_noticias';

  constructor() {
    this.cargarHistorial();
  }

  /**
   * Agregar una noticia al historial
   */
  async agregarAlHistorial(noticia: Noticia): Promise<void> {
    const userId = this.getUserId();
    
    // Agregar a localStorage
    this.agregarALocalStorage(noticia);

    // Si el usuario está autenticado, guardar en Supabase
    if (userId && userId !== 'guest') {
      try {
        const { error } = await supabase
          .from('historial')
          .upsert({
            id_noticia: noticia.id_noticia,
            user_id: userId,
            fecha_vista: new Date().toISOString()
          }, {
            onConflict: 'user_id,id_noticia'
          });

        if (error) {
          console.error('Error guardando en historial:', error);
        }
      } catch (error) {
        console.error('Error al guardar historial en Supabase:', error);
      }
    }

    // Actualizar el BehaviorSubject
    await this.cargarHistorial();
  }

  /**
   * Agregar a localStorage
   */
  private agregarALocalStorage(noticia: Noticia): void {
    try {
      const historial = this.getHistorialLocal();
      
      // Eliminar la noticia si ya existe
      const filtrado = historial.filter(item => item.id_noticia !== noticia.id_noticia);
      
      // Agregar al principio
      filtrado.unshift({
        id_noticia: noticia.id_noticia,
        user_id: this.getUserId(),
        fecha_vista: new Date().toISOString(),
        noticia: noticia
      });

      // Mantener solo las últimas MAX_HISTORIAL_LOCAL
      const limitado = filtrado.slice(0, this.MAX_HISTORIAL_LOCAL);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(limitado));
    } catch (error) {
      console.error('Error guardando en localStorage:', error);
    }
  }

  /**
   * Cargar historial (de Supabase si está autenticado, sino de localStorage)
   */
  async cargarHistorial(): Promise<void> {
    const userId = this.getUserId();

    if (userId && userId !== 'guest') {
      try {
        const { data, error } = await supabase
          .from('historial')
          .select(`
            *,
            noticiastodo:id_noticia (*)
          `)
          .eq('user_id', userId)
          .order('fecha_vista', { ascending: false })
          .limit(100);

        if (error) throw error;

        if (data) {
          const historial: HistorialItem[] = data.map((item: any) => ({
            id: item.id,
            id_noticia: item.id_noticia,
            user_id: item.user_id,
            fecha_vista: item.fecha_vista,
            noticia: item.noticiastodo
          }));
          
          this.historialSubject.next(historial);
          return;
        }
      } catch (error) {
        console.error('Error cargando historial de Supabase:', error);
      }
    }

    // Si no está autenticado o hubo error, cargar de localStorage
    const historialLocal = this.getHistorialLocal();
    this.historialSubject.next(historialLocal);
  }

  /**
   * Obtener historial de localStorage
   */
  private getHistorialLocal(): HistorialItem[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Obtener historial actual
   */
  getHistorial(): HistorialItem[] {
    return this.historialSubject.value;
  }

  /**
   * Limpiar todo el historial
   */
  async limpiarHistorial(): Promise<void> {
    const userId = this.getUserId();

    // Limpiar localStorage
    localStorage.removeItem(this.STORAGE_KEY);

    // Limpiar en Supabase si está autenticado
    if (userId && userId !== 'guest') {
      try {
        const { error } = await supabase
          .from('historial')
          .delete()
          .eq('user_id', userId);

        if (error) throw error;
      } catch (error) {
        console.error('Error limpiando historial en Supabase:', error);
      }
    }

    this.historialSubject.next([]);
  }

  /**
   * Eliminar una noticia específica del historial
   */
  async eliminarDelHistorial(idNoticia: number): Promise<void> {
    const userId = this.getUserId();

    // Eliminar de localStorage
    const historial = this.getHistorialLocal();
    const filtrado = historial.filter(item => item.id_noticia !== idNoticia);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtrado));

    // Eliminar de Supabase si está autenticado
    if (userId && userId !== 'guest') {
      try {
        const { error } = await supabase
          .from('historial')
          .delete()
          .eq('user_id', userId)
          .eq('id_noticia', idNoticia);

        if (error) throw error;
      } catch (error) {
        console.error('Error eliminando del historial en Supabase:', error);
      }
    }

    await this.cargarHistorial();
  }

  /**
   * Verificar si una noticia está en el historial
   */
  estaEnHistorial(idNoticia: number): boolean {
    return this.historialSubject.value.some(item => item.id_noticia === idNoticia);
  }

  /**
   * Obtener el ID del usuario
   */
  private getUserId(): string {
    try {
      const authToken = localStorage.getItem('sb-mjompchhwvbqpnjnqlma-auth-token');
      if (authToken) {
        const parsed = JSON.parse(authToken);
        return parsed.user?.id || 'guest';
      }
    } catch {
      // Silenciar error
    }
    return 'guest';
  }

  /**
   * Obtener total de items en historial
   */
  getTotalHistorial(): number {
    return this.historialSubject.value.length;
  }
}
