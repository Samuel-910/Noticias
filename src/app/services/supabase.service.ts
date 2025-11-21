import { Injectable } from '@angular/core';
import { supabase } from './supabase.config';
import { Noticia } from '../models/noticia';
import { from, Observable } from 'rxjs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';


@Injectable({ providedIn: 'root' })


export class SupabaseService {
  private supabase: SupabaseClient;
  private readonly PAGE_SIZE = 1000;
  constructor() {
    // Reemplazar con tus credenciales de Supabase
    const supabaseUrl = 'https://mjompchhwvbqpnjnqlma.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qb21wY2hod3ZicXBuam5xbG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNjQwMzUsImV4cCI6MjA2Nzc0MDAzNX0.NxlJDoQQK2gJhs5nDF0cIRHaes3rH4wnhehin5y3ck4';

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }
  async getData(table: string) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw error;
    return data;
  }
  async signOut() {
    return supabase.auth.signOut();
  }
  async signInWithPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }
  async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:4200/verificacioncodigo'
    });

    if (error) throw error;
    return data;
  }

async updateUserPlan(userId: string, planId: string) {
  const { data, error } = await this.supabase
    .from('usuarios')
    .update({ plan_id: planId })
    .eq('id', userId);

  return { data, error };
}

  // async getNoticias(): Promise<{ data: Noticia[]; total: number }> {
  //   const allData: Noticia[] = [];
  //   let offset = 0;
  //   console.log('🚀 Iniciando proceso de recuperación de noticias...');
  //   // Obtener el conteo total
  //   const { count: totalCount, error: countError } = await supabase
  //     .from('noticiastodo')
  //     .select('*', { count: 'exact', head: true });

  //   if (countError) throw countError;

  //   const total = totalCount ?? 0;
  //   console.log(`📢 Iniciando recuperación de ${total} noticias...`);

  //   // Recuperar todas las páginas
  //   while (offset < total) {
  //     const startTime = performance.now();

  //     const { data, error } = await supabase
  //       .from('noticiastodo')
  //       .select('*')
  //       .range(offset, offset + this.PAGE_SIZE - 1);

  //     if (error) throw error;

  //     const fetchedCount = data?.length ?? 0;
  //     allData.push(...(data || []));
  //     offset += fetchedCount;

  //     const endTime = performance.now();
  //     const duration = (endTime - startTime).toFixed(0);
  //     const progress = ((offset / total) * 100).toFixed(1);

  //     console.log(
  //       `📦 Página cargada: ${fetchedCount} noticias | ` +
  //       `Progreso: ${offset}/${total} (${progress}%) | ` +
  //       `Tiempo: ${duration}ms`
  //     );

  //     // Si no hay más datos, salir
  //     if (fetchedCount < this.PAGE_SIZE) break;
  //   }

  //   console.log(`✅ Recuperación completa: ${allData.length} noticias cargadas`);

  //   return {
  //     data: allData,
  //     total
  //   };
  // }

async getNoticias(): Promise<{ data: Noticia[]; total: number }> {
  // 1. Prepara la consulta
  const query = supabase
    .from('noticiastodo')
    .select('*', { count: 'exact' })
    // 2. FILTRO: Solo incluye registros donde 'imagen_url' NO es NULL (es decir, tienen imagen)
    .not('imagen_url', 'is', null) 
    // 3. ORDENA por la columna 'fecha_registro' de forma descendente 
    .order('fecha_registro', { ascending: false }) 
    // 4. LIMITA la respuesta a 1000 resultados.
    .limit(1000); 

  // 5. Ejecuta la consulta
  const { data, count, error } = await query;

  if (error) {
      console.error('❌ Error cargando noticias:', error);
      throw error;
  }

  console.log('📊 Total noticias en la tabla:', count); 
  console.log('✅ Número de noticias devueltas (limitadas a 1000 con imagen):', data.length); 

  return {
    data: data as Noticia[],
    total: count ?? 0
  };
}
  getAllNoticias(): Observable<Noticia[]> {
    return from(
      this.supabase
        .from('noticiastodo')
        .select('*')
        .order('fecha_publicacion', { ascending: false })
        .then(({ data, error }) => {
          if (error) throw error;
          return data as Noticia[];
        })
    );
  }

  // Buscar noticias por texto
  searchNoticias(searchTerm: string): Observable<Noticia[]> {
    return from(
      this.supabase
        .from('noticiastodo')
        .select('*')
        .or(`titulo.ilike.%${searchTerm}%,contenido.ilike.%${searchTerm}%`)
        .order('fecha_publicacion', { ascending: false })
        .limit(10)
        .then(({ data, error }) => {
          if (error) throw error;
          return data as Noticia[];
        })
    );
  }

  // Filtrar noticias por categoría
  getNoticiasByCategoria(categoria: string): Observable<Noticia[]> {
    return from(
      this.supabase
        .from('noticiastodo')
        .select('*')
        .eq('categoria', categoria)
        .order('fecha_publicacion', { ascending: false })
        .limit(10)
        .then(({ data, error }) => {
          if (error) throw error;
          return data as Noticia[];
        })
    );
  }

  // Filtrar noticias por país
  getNoticiasByPais(pais: string): Observable<Noticia[]> {
    return from(
      this.supabase
        .from('noticiastodo')
        .select('*')
        .eq('pais', pais)
        .order('fecha_publicacion', { ascending: false })
        .limit(10)
        .then(({ data, error }) => {
          if (error) throw error;
          return data as Noticia[];
        })
    );
  }

  // Obtener noticia por ID
  getNoticiaById(id: number): Observable<Noticia> {
    return from(
      this.supabase
        .from('noticiastodo')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data, error }) => {
          if (error) throw error;
          return data as Noticia;
        })
    );
  }
async getCurrentUser() {
  const { data, error } = await this.supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}
  async getPlanUsuario(userId: string) {
    const { data, error } = await this.supabase
      .from('usuarios')
      .select('plan_id')
      .eq('id', userId)
      .single();

    if (error) throw error;
    console.log('🔍 Plan ID obtenido para usuario', userId, ':', data?.plan_id);
    return data?.plan_id;
  }
}
