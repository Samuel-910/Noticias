// src/app/services/resumen.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ResumenIaService } from './resumen-ia.service';
import { Noticia } from '../models/noticia';

interface ResumenCache {
    [noticiaId: string]: string;
}

@Injectable({
    providedIn: 'root'
})
export class ResumenService {
    private cache: ResumenCache = {};
    private readonly LIMITE_DIARIO = 3;

    constructor(
        private supabaseService: SupabaseService,
        private resumenIaService: ResumenIaService
    ) {
    }
    async obtenerConteoResumenes(): Promise<number> {
        try {
            const usuario = await this.supabaseService.getCurrentUser();
            if (!usuario) {
                return 0;
            }

            // Obtener plan del usuario
            const planId = await this.supabaseService.getPlanUsuario(usuario.id);

            // Si tiene plan premium (plan_id = 2 o 3), retornar 0 (sin límites)
            if (planId === 2 || planId === 3) {
                console.log('👑 Usuario premium - sin límite de resúmenes');
                return 0;
            }

            const fechaHoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

            // 🔥 CLAVE: Buscar el registro GLOBAL del día (sin filtrar por noticia)
            const { data, error } = await this.supabaseService['supabase']
                .from('contadores_resumenes')
                .select('cantidad')
                .eq('usuario_id', usuario.id)
                .eq('fecha', fechaHoy)
                .single();

            if (error) {
                // Si no existe el registro, retornar 0
                if (error.code === 'PGRST116') {
                    console.log('📊 No hay resúmenes generados hoy - Restantes: 3');
                    return 0;
                }
                console.error('Error al obtener contador:', error);
                return 0;
            }

            const cantidad = data?.cantidad || 0;
            console.log(`📊 Resúmenes usados HOY (global): ${cantidad}/3`);
            return cantidad;
        } catch (error) {
            console.error('Error al obtener conteo de resúmenes:', error);
            return 0;
        }
    }

    /**
     * 🔥 CORREGIDO: Incrementa el contador GLOBAL del usuario
     * Se incrementa cada vez que genera un resumen de CUALQUIER noticia
     */
    private async incrementarContador(): Promise<void> {
        try {
            const usuario = await this.supabaseService.getCurrentUser();
            if (!usuario) {
                return;
            }

            // Obtener plan del usuario
            const planId = await this.supabaseService.getPlanUsuario(usuario.id);

            // No incrementar para usuarios premium
            if (planId === 2 || planId === 3) {
                console.log('👑 Usuario premium - contador no se incrementa');
                return;
            }

            const fechaHoy = new Date().toISOString().split('T')[0];

            // Primero intentar obtener el registro existente del día
            const { data: registroExistente } = await this.supabaseService['supabase']
                .from('contadores_resumenes')
                .select('*')
                .eq('usuario_id', usuario.id)
                .eq('fecha', fechaHoy)
                .single();

            if (registroExistente) {
                // Si existe, incrementar la cantidad GLOBAL
                const nuevaCantidad = registroExistente.cantidad + 1;
                console.log(`📈 Incrementando contador GLOBAL: ${registroExistente.cantidad} → ${nuevaCantidad}`);

                const { error } = await this.supabaseService['supabase']
                    .from('contadores_resumenes')
                    .update({
                        cantidad: nuevaCantidad,
                        updated_at: new Date().toISOString()
                    })
                    .eq('usuario_id', usuario.id)
                    .eq('fecha', fechaHoy);

                if (error) {
                    console.error('❌ Error al incrementar contador:', error);
                } else {
                    console.log(`✅ Contador GLOBAL actualizado: ${nuevaCantidad}/3 resúmenes usados hoy`);
                }
            } else {
                // Si no existe, crear nuevo registro con cantidad = 1
                console.log('📝 Creando contador GLOBAL para hoy (primer resumen del día)');

                const { error } = await this.supabaseService['supabase']
                    .from('contadores_resumenes')
                    .insert({
                        usuario_id: usuario.id,
                        fecha: fechaHoy,
                        cantidad: 1
                    });

                if (error) {
                    console.error('❌ Error al crear contador:', error);
                } else {
                    console.log('✅ Contador GLOBAL creado: 1/3 resúmenes usados hoy');
                }
            }
        } catch (error) {
            console.error('❌ Error al incrementar contador de resúmenes:', error);
        }
    }

    /**
     * Verifica si el usuario es premium
     */
    async esUsuarioPremium(): Promise<boolean> {
        try {
            const usuario = await this.supabaseService.getCurrentUser();
            if (!usuario) {
                return false;
            }

            const planId = await this.supabaseService.getPlanUsuario(usuario.id);
            return planId === 2 || planId === 3;
        } catch (error) {
            console.error('Error al verificar plan premium:', error);
            return false;
        }
    }

    /**
     * 🔥 CORREGIDO: Genera un resumen y verifica el límite GLOBAL
     */
    async generarResumen(noticia: Noticia): Promise<void> {
        try {
            // Verificar usuario
            const usuario = await this.supabaseService.getCurrentUser();
            if (!usuario) {
                throw new Error('Debes iniciar sesión para generar resúmenes');
            }

            // Verificar si es premium
            const esPremium = await this.esUsuarioPremium();

            // 🔥 CLAVE: Verificar límite GLOBAL para usuarios no premium
            if (!esPremium) {
                const conteoGlobal = await this.obtenerConteoResumenes();
                console.log(`🔍 Verificando límite: ${conteoGlobal}/${this.LIMITE_DIARIO} resúmenes usados hoy`);

                if (conteoGlobal >= this.LIMITE_DIARIO) {
                    throw new Error('Has alcanzado el límite de 3 resúmenes diarios. Actualiza a Premium para resúmenes ilimitados.');
                }
            }

            // Verificar si ya existe en cache
            if (this.cache[noticia.id_noticia]) {
                console.log('💾 Resumen encontrado en cache (no consume del límite)');
                noticia.resumen = this.cache[noticia.id_noticia];
                noticia.mostrarResumen = !noticia.mostrarResumen;
                return; // ✅ No incrementa contador si ya existe
            }

            // Verificar si existe en la base de datos
            const resumenGuardado = await this.obtenerResumenDeDB(noticia.id_noticia);
            if (resumenGuardado) {
                console.log('🗄️ Resumen encontrado en BD (no consume del límite)');
                this.cache[noticia.id_noticia] = resumenGuardado;
                noticia.resumen = resumenGuardado;
                noticia.mostrarResumen = true;
                this.guardarCacheLocal();
                return; // ✅ No incrementa contador si ya existe
            }

            // 🔥 IMPORTANTE: Solo incrementa contador si es un resumen NUEVO
            console.log('🤖 Generando NUEVO resumen con IA (consumirá 1 del límite)...');

            // Generar nuevo resumen con el servicio de IA
            await this.resumenIaService.generarResumen(noticia);

            // Si se generó exitosamente, guardar y actualizar contador GLOBAL
            if (noticia.resumen && !noticia.resumen.includes('❌')) {
                // Guardar en base de datos
                await this.guardarResumenEnDB(noticia.id_noticia, noticia.resumen, usuario.id);

                // Guardar en cache
                this.cache[noticia.id_noticia] = noticia.resumen;
                this.guardarCacheLocal();

                // 🔥 INCREMENTAR CONTADOR GLOBAL (sin importar la noticia)
                await this.incrementarContador();

                console.log('✅ Resumen generado y guardado exitosamente');
            }
        } catch (error: any) {
            console.error('❌ Error al generar resumen:', error);
            throw error;
        }
    }

    /**
     * Obtiene un resumen desde la base de datos
     */
    private async obtenerResumenDeDB(noticiaId: number): Promise<string | null> {
        try {
            const { data, error } = await this.supabaseService['supabase']
                .from('resumenes')
                .select('contenido')
                .eq('noticia_id', noticiaId)
                .single();

            if (error) {
                return null;
            }

            return data?.contenido || null;
        } catch {
            return null;
        }
    }

    /**
     * Guarda un resumen en la base de datos
     */
    private async guardarResumenEnDB(noticiaId: number, resumen: string, usuarioId: string): Promise<void> {
        try {
            const { error } = await this.supabaseService['supabase']
                .from('resumenes')
                .insert({
                    noticia_id: noticiaId,
                    contenido: resumen,
                    usuario_id: usuarioId,
                    fecha_generacion: new Date().toISOString()
                });

            if (error) {
                console.error('Error al guardar resumen:', error);
            }
        } catch (error) {
            console.error('Error al guardar resumen en DB:', error);
        }
    }

    /**
     * Obtiene un resumen (desde cache o DB)
     */
    async obtenerResumen(noticiaId: number): Promise<string | null> {
        // Verificar cache local
        if (this.cache[noticiaId]) {
            return this.cache[noticiaId];
        }

        // Verificar base de datos
        const resumenDB = await this.obtenerResumenDeDB(noticiaId);
        if (resumenDB) {
            this.cache[noticiaId] = resumenDB;
            this.guardarCacheLocal();
            return resumenDB;
        }

        return null;
    }

    /**
     * Guarda el cache en localStorage
     */
    private guardarCacheLocal(): void {
        try {
            localStorage.setItem('resumenes_cache', JSON.stringify(this.cache));
        } catch (error) {
            console.error('Error al guardar cache:', error);
        }
    }

    /**
     * Carga el cache desde localStorage
     */
    private carcarCacheLocal(): void {
        try {
            const cacheGuardado = localStorage.getItem('resumenes_cache');
            if (cacheGuardado) {
                this.cache = JSON.parse(cacheGuardado);
            }
        } catch (error) {
            console.error('Error al cargar cache:', error);
            this.cache = {};
        }
    }

    /**
     * Limpia el cache
     */
    limpiarCache(): void {
        this.cache = {};
        localStorage.removeItem('resumenes_cache');
    }

    /**
     * Verifica si el usuario puede generar más resúmenes
     */
    async puedeGenerarResumen(): Promise<{ puede: boolean; mensaje: string; restantes: number }> {
        const usuario = await this.supabaseService.getCurrentUser();

        if (!usuario) {
            return {
                puede: false,
                mensaje: 'Debes iniciar sesión',
                restantes: 0
            };
        }

        const esPremium = await this.esUsuarioPremium();

        if (esPremium) {
            return {
                puede: true,
                mensaje: 'Resúmenes ilimitados',
                restantes: -1 // -1 indica ilimitado
            };
        }

        const conteo = await this.obtenerConteoResumenes();
        const restantes = this.LIMITE_DIARIO - conteo;

        if (restantes <= 0) {
            return {
                puede: false,
                mensaje: 'Límite diario alcanzado',
                restantes: 0
            };
        }

        return {
            puede: true,
            mensaje: `${restantes} resúmenes restantes`,
            restantes
        };
    }

    /**
     * Obtiene el límite diario
     */
    getLimiteDiario(): number {
        return this.LIMITE_DIARIO;
    }
}