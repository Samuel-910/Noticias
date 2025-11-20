// src/app/services/auth.service.ts - Usa tu SupabaseService existente

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { supabase } from './supabase.config';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
    public isAuthenticated$: Observable<boolean> = this.isAuthenticatedSubject.asObservable();

    constructor(private supabaseService: SupabaseService) {
        this.initAuthState();
        this.setupAuthListener();
    }

    /**
     * Inicializa el estado de autenticación al cargar el servicio
     */
    private async initAuthState(): Promise<void> {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const isAuthenticated = !!session;
            this.isAuthenticatedSubject.next(isAuthenticated);
            console.log('🔐 Estado de auth inicial:', isAuthenticated);
        } catch (error) {
            console.error('Error obteniendo sesión:', error);
            this.isAuthenticatedSubject.next(false);
        }
    }

    /**
     * Escucha cambios en el estado de autenticación de Supabase
     */
    private setupAuthListener(): void {
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔄 Auth state cambió:', event, !!session);
            const isAuthenticated = !!session;
            this.isAuthenticatedSubject.next(isAuthenticated);
        });
    }

    /**
     * Verifica si existe una sesión activa (síncrono para templates)
     */
    isLoggedIn(): boolean {
        // Verifica si existe el token de Supabase en localStorage
        const keys = Object.keys(localStorage);
        const authKey = keys.find(key => key.includes('auth-token'));
        return !!authKey && !!localStorage.getItem(authKey);
    }

    /**
     * Inicia sesión usando tu SupabaseService
     */
    async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
        try {
            const data = await this.supabaseService.signInWithPassword(email, password);

            if (data.session) {
                console.log('✅ Login exitoso');
                this.isAuthenticatedSubject.next(true);
                return { success: true };
            }

            return { success: false, error: 'No se pudo crear la sesión' };
        } catch (error: any) {
            console.error('❌ Error en login:', error);
            return { success: false, error: error.message || 'Credenciales incorrectas' };
        }
    }

    /**
     * Registra un nuevo usuario usando tu SupabaseService
     */
    async register(email: string, password: string): Promise<{ success: boolean; error?: string }> {
        try {
            const data = await this.supabaseService.signUp(email, password);

            if (data.user) {
                console.log('✅ Registro exitoso');
                // Supabase puede requerir confirmación por email
                return { success: true };
            }

            return { success: false, error: 'No se pudo crear el usuario' };
        } catch (error: any) {
            console.error('❌ Error en registro:', error);
            return { success: false, error: error.message || 'Error al crear la cuenta' };
        }
    }

    /**
     * Recuperar contraseña usando tu SupabaseService
     */
    async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
        try {
            await this.supabaseService.resetPassword(email);
            console.log('✅ Email de recuperación enviado');
            return { success: true };
        } catch (error: any) {
            console.error('❌ Error en recuperación:', error);
            return { success: false, error: error.message || 'Error al enviar el email' };
        }
    }

    /**
     * Cierra la sesión usando tu SupabaseService
     */
    async logout(): Promise<void> {
        try {
            await this.supabaseService.signOut();
            console.log('✅ Sesión cerrada correctamente');
            this.isAuthenticatedSubject.next(false);
        } catch (error) {
            console.error('❌ Error al cerrar sesión:', error);
        }
    }

    /**
     * Obtiene la sesión actual de Supabase
     */
    async getSession() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                console.error('Error obteniendo sesión:', error);
                return null;
            }

            return session;
        } catch (error) {
            console.error('Error inesperado obteniendo sesión:', error);
            return null;
        }
    }

    /**
     * Obtiene el usuario actual
     */
    async getUser() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();

            if (error) {
                console.error('Error obteniendo usuario:', error);
                return null;
            }

            return user;
        } catch (error) {
            console.error('Error inesperado obteniendo usuario:', error);
            return null;
        }
    }

    /**
     * Obtiene el email del usuario actual
     */
    async getUserEmail(): Promise<string | null> {
        const user = await this.getUser();
        return user?.email || null;
    }
}