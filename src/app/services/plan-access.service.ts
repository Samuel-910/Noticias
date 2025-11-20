import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';

export type PlanId = 'gratis' | 'premium-mensual' | 'premium-anual';

export interface PlanLimites {
    fuentes: number;
    noticiasPorDia: number;
    historialDias: number;
    resumenesIA: number;
    favoritosMax: number;
    exportacion: boolean;
    filtrosAvanzados: boolean;
    soportePrioritario: boolean;
    sinAnuncios: boolean;
    accesoAnticipado: boolean;
}

export interface FeatureAccess {
    permitido: boolean;
    motivo?: string;
    planRequerido?: PlanId[];
}

@Injectable({
    providedIn: 'root'
})
export class PlanAccessService {
    private planActualSubject = new BehaviorSubject<PlanId>('gratis');
    public planActual$ = this.planActualSubject.asObservable();

    // Contador de usos diarios (se puede mover a Supabase)
    private usosHoy: Map<string, number> = new Map();

    // Definición de límites por plan
    private readonly LIMITES_POR_PLAN: Record<PlanId, PlanLimites> = {
        'gratis': {
            fuentes: 2,
            noticiasPorDia: 30,
            historialDias: 7,
            resumenesIA: 3, // Solo 3 resúmenes diarios
            favoritosMax: 10,
            exportacion: false,
            filtrosAvanzados: false,
            soportePrioritario: false,
            sinAnuncios: false,
            accesoAnticipado: false
        },
        'premium-mensual': {
            fuentes: 20,
            noticiasPorDia: 500,
            historialDias: 90,
            resumenesIA: -1, // Ilimitado
            favoritosMax: -1, // Ilimitado
            exportacion: true,
            filtrosAvanzados: true,
            soportePrioritario: true,
            sinAnuncios: true,
            accesoAnticipado: false
        },
        'premium-anual': {
            fuentes: -1, // ilimitado
            noticiasPorDia: -1, // ilimitado
            historialDias: -1, // ilimitado
            resumenesIA: -1, // ilimitado
            favoritosMax: -1, // ilimitado
            exportacion: true,
            filtrosAvanzados: true,
            soportePrioritario: true,
            sinAnuncios: true,
            accesoAnticipado: true
        }
    };

    constructor(private supabaseService: SupabaseService) {
        this.detectarPlanActual();
        this.resetearContadoresDiarios();
    }

    /**
     * Detecta el plan actual del usuario
     */
    async detectarPlanActual(): Promise<void> {
        try {
            const user = await this.supabaseService.getCurrentUser();

            if (!user) {
                this.planActualSubject.next('gratis');
                return;
            }

            const planId = await this.supabaseService.getPlanUsuario(user.id);
            this.planActualSubject.next((planId as PlanId) || 'gratis');

        } catch (error) {
            console.error('Error detectando plan:', error);
            this.planActualSubject.next('gratis');
        }
    }

    /**
     * Resetea los contadores diarios a medianoche
     */
    private resetearContadoresDiarios(): void {
        const ahora = new Date();
        const manana = new Date(ahora);
        manana.setDate(ahora.getDate() + 1);
        manana.setHours(0, 0, 0, 0);

        const msHastaManana = manana.getTime() - ahora.getTime();

        setTimeout(() => {
            this.usosHoy.clear();
            this.resetearContadoresDiarios(); // Programar el siguiente reset
        }, msHastaManana);
    }

    /**
     * Obtiene el plan actual del usuario
     */
    getPlanActual(): PlanId {
        return this.planActualSubject.value;
    }

    /**
     * Obtiene los límites del plan actual
     */
    getLimitesActuales(): PlanLimites {
        return this.LIMITES_POR_PLAN[this.getPlanActual()];
    }

    /**
     * Verifica si el usuario tiene plan premium (mensual o anual)
     */
    isPremium(): boolean {
        const plan = this.getPlanActual();
        return plan === 'premium-mensual' || plan === 'premium-anual';
    }

    /**
     * Verifica si el usuario tiene plan gratuito
     */
    isGratis(): boolean {
        return this.getPlanActual() === 'gratis';
    }

    /**
     * Verifica si el usuario puede generar un resumen con IA
     */
    puedeGenerarResumen(): FeatureAccess {
        const limites = this.getLimitesActuales();
        const maxResumenes = limites.resumenesIA;

        // -1 significa ilimitado (Premium)
        if (maxResumenes === -1) {
            return { permitido: true };
        }

        // Obtener resúmenes generados hoy
        const resumenesHoy = this.usosHoy.get('resumenes') || 0;
        const permitido = resumenesHoy < maxResumenes;

        return {
            permitido,
            motivo: permitido
                ? undefined
                : `Has alcanzado el límite de ${maxResumenes} resúmenes diarios. Actualiza a Premium para resúmenes ilimitados.`,
            planRequerido: ['premium-mensual', 'premium-anual']
        };
    }

    /**
     * Incrementa el contador de resúmenes generados
     */
    incrementarResumenes(): void {
        const actual = this.usosHoy.get('resumenes') || 0;
        this.usosHoy.set('resumenes', actual + 1);
    }

    /**
     * Obtiene cuántos resúmenes quedan disponibles hoy
     */
    getResumenesRestantes(): number {
        const limites = this.getLimitesActuales();
        const maxResumenes = limites.resumenesIA;

        if (maxResumenes === -1) {
            return -1; // Ilimitado
        }

        const usados = this.usosHoy.get('resumenes') || 0;
        return Math.max(0, maxResumenes - usados);
    }

    /**
     * Verifica si el usuario puede agregar más favoritos
     */
    puedeAgregarFavorito(favoritosActuales: number): FeatureAccess {
        const limites = this.getLimitesActuales();
        const maxFavoritos = limites.favoritosMax;

        // -1 significa ilimitado
        if (maxFavoritos === -1) {
            return { permitido: true };
        }

        const permitido = favoritosActuales < maxFavoritos;

        return {
            permitido,
            motivo: permitido
                ? undefined
                : `Has alcanzado el límite de ${maxFavoritos} favoritos. Actualiza a Premium para favoritos ilimitados.`,
            planRequerido: ['premium-mensual', 'premium-anual']
        };
    }

    /**
     * Obtiene mensaje personalizado de upgrade
     */
    getMensajeUpgrade(feature: string): string {
        const plan = this.getPlanActual();

        if (plan === 'gratis') {
            return `🌟 Actualiza a Premium para desbloquear ${feature} y muchas más funciones.`;
        }

        if (plan === 'premium-mensual') {
            return `✨ Actualiza a Premium Anual para acceso completo a ${feature} y ahorra $39.89 al año.`;
        }

        return `¡Ya tienes acceso completo a todas las funciones!`;
    }

    /**
     * Obtiene el porcentaje de uso de una característica limitada
     */
    getPorcentajeUso(usado: number, feature: keyof PlanLimites): number {
        const limites = this.getLimitesActuales();
        const limite = limites[feature] as number;

        // Si es ilimitado (-1), retornar 0%
        if (limite === -1) {
            return 0;
        }

        return Math.min((usado / limite) * 100, 100);
    }

    /**
     * Verifica si está cerca del límite (>80%)
     */
    estaCercaDelLimite(usado: number, feature: keyof PlanLimites): boolean {
        return this.getPorcentajeUso(usado, feature) >= 80;
    }

    /**
     * Obtiene el texto del badge premium
     */
    getBadgeText(): string {
        const plan = this.getPlanActual();
        if (plan === 'premium-anual') return 'Premium';
        if (plan === 'premium-mensual') return 'Premium';
        return '';
    }

    /**
     * Verifica si debe mostrar el badge premium
     */
    mostrarBadgePremium(): boolean {
        return this.isPremium();
    }
}