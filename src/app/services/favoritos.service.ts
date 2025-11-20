import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Noticia } from '../models/noticia';
import { supabase } from './supabase.config';

export interface FavoritoItem {
  id?: number;
  id_noticia: number;
  user_id: string;
  fecha_agregado: string;
  noticia?: Noticia;
}

@Injectable({
  providedIn: 'root'
})
export class FavoritosService {
  private favoritosSubject = new BehaviorSubject<FavoritoItem[]>([]);
  public favoritos$ = this.favoritosSubject.asObservable();

  private readonly STORAGE_KEY = 'favoritos_noticias';

  constructor() {
    this.cargarFavoritos();
  }

  /**
   * Agregar una noticia a favoritos
   */
  async agregarAFavoritos(noticia: Noticia): Promise<boolean> {
    const userId = this.getUserId();
    
    // Verificar si ya está en favoritos
    if (this.esFavorito(noticia.id_noticia)) {
      console.log('La noticia ya está en favoritos');
      return false;
    }

    // Agregar a localStorage
    this.agregarALocalStorage(noticia);

    // Si el usuario está autenticado, guardar en Supabase
    if (userId && userId !== 'guest') {
      try {
        const { error } = await supabase
          .from('favoritos')
          .insert({
            id_noticia: noticia.id_noticia,
            user_id: userId,
            fecha_agregado: new Date().toISOString()
          });

        if (error) {
          console.error('Error guardando en favoritos:', error);
          return false;
        }
      } catch (error) {
        console.error('Error al guardar favorito en Supabase:', error);
        return false;
      }
    }

    // Actualizar el BehaviorSubject
    await this.cargarFavoritos();
    return true;
  }

  /**
   * Agregar a localStorage
   */
  private agregarALocalStorage(noticia: Noticia): void {
    try {
      const favoritos = this.getFavoritosLocal();
      
      // Verificar que no exista
      if (favoritos.some(item => item.id_noticia === noticia.id_noticia)) {
        return;
      }
      
      // Agregar al principio
      favoritos.unshift({
        id_noticia: noticia.id_noticia,
        user_id: this.getUserId(),
        fecha_agregado: new Date().toISOString(),
        noticia: noticia
      });
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(favoritos));
    } catch (error) {
      console.error('Error guardando en localStorage:', error);
    }
  }

  /**
   * Eliminar de localStorage
   */
  private eliminarDeLocalStorage(idNoticia: number): void {
    try {
      const favoritos = this.getFavoritosLocal();
      const filtrado = favoritos.filter(item => item.id_noticia !== idNoticia);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtrado));
    } catch (error) {
      console.error('Error eliminando de localStorage:', error);
    }
  }

  /**
   * Cargar favoritos (de Supabase si está autenticado, sino de localStorage)
   */
  async cargarFavoritos(): Promise<void> {
    const userId = this.getUserId();

    if (userId && userId !== 'guest') {
      try {
        const { data, error } = await supabase
          .from('favoritos')
          .select(`
            *,
            noticiastodo:id_noticia (*)
          `)
          .eq('user_id', userId)
          .order('fecha_agregado', { ascending: false });

        if (error) throw error;

        if (data) {
          const favoritos: FavoritoItem[] = data.map((item: any) => ({
            id: item.id,
            id_noticia: item.id_noticia,
            user_id: item.user_id,
            fecha_agregado: item.fecha_agregado,
            noticia: item.noticiastodo
          }));
          
          this.favoritosSubject.next(favoritos);
          return;
        }
      } catch (error) {
        console.error('Error cargando favoritos de Supabase:', error);
      }
    }

    // Si no está autenticado o hubo error, cargar de localStorage
    const favoritosLocal = this.getFavoritosLocal();
    this.favoritosSubject.next(favoritosLocal);
  }

  /**
   * Obtener favoritos de localStorage
   */
  private getFavoritosLocal(): FavoritoItem[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Obtener favoritos actuales
   */
  getFavoritos(): FavoritoItem[] {
    return this.favoritosSubject.value;
  }

  /**
   * Eliminar una noticia de favoritos
   */
  async eliminarDeFavoritos(idNoticia: number): Promise<boolean> {
    const userId = this.getUserId();

    // Eliminar de localStorage
    this.eliminarDeLocalStorage(idNoticia);

    // Eliminar de Supabase si está autenticado
    if (userId && userId !== 'guest') {
      try {
        const { error } = await supabase
          .from('favoritos')
          .delete()
          .eq('user_id', userId)
          .eq('id_noticia', idNoticia);

        if (error) {
          console.error('Error eliminando de favoritos en Supabase:', error);
          return false;
        }
      } catch (error) {
        console.error('Error al eliminar favorito:', error);
        return false;
      }
    }

    await this.cargarFavoritos();
    return true;
  }

  /**
   * Toggle favorito (agregar o eliminar)
   */
  async toggleFavorito(noticia: Noticia): Promise<boolean> {
    if (this.esFavorito(noticia.id_noticia)) {
      return await this.eliminarDeFavoritos(noticia.id_noticia);
    } else {
      return await this.agregarAFavoritos(noticia);
    }
  }

  /**
   * Verificar si una noticia es favorita
   */
  esFavorito(idNoticia: number): boolean {
    return this.favoritosSubject.value.some(item => item.id_noticia === idNoticia);
  }

  /**
   * Limpiar todos los favoritos
   */
  async limpiarFavoritos(): Promise<void> {
    const userId = this.getUserId();

    // Limpiar localStorage
    localStorage.removeItem(this.STORAGE_KEY);

    // Limpiar en Supabase si está autenticado
    if (userId && userId !== 'guest') {
      try {
        const { error } = await supabase
          .from('favoritos')
          .delete()
          .eq('user_id', userId);

        if (error) throw error;
      } catch (error) {
        console.error('Error limpiando favoritos en Supabase:', error);
      }
    }

    this.favoritosSubject.next([]);
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
   * Obtener total de favoritos
   */
  getTotalFavoritos(): number {
    return this.favoritosSubject.value.length;
  }

  /**
   * Obtener noticias favoritas
   */
  getNoticiasFavoritas(): Noticia[] {
    return this.favoritosSubject.value
      .filter(item => item.noticia)
      .map(item => item.noticia!);
  }
}
