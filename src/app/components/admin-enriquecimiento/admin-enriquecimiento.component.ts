// src/app/components/admin-enriquecimiento/admin-enriquecimiento.component.html
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EnriquecimientoNoticiasService } from '../../services/enriquecimiento-noticias.service';
import { SupabaseService } from '../../services/supabase.service';

@Component({
    selector: 'app-admin-enriquecimiento',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './admin-enriquecimiento.component.html',
    styleUrls: ['./admin-enriquecimiento.component.css']
})
export class AdminEnriquecimientoComponent implements OnInit {
    // Estado del proceso
    procesando = false;
    progreso = 0;

    // Configuración
    limiteProcesamiento = 50;

    // Estadísticas
    estadisticas = {
        total: 0,
        procesadas: 0,
        exitosas: 0,
        fallidas: 0,
        errores: [] as any[]
    };

    // Estadísticas de la base de datos
    estadisticasDB = {
        totalNoticias: 0,
        noticiasCompletas: 0,
        noticiasIncompletas: 0,
        sinImagen: 0,
        sinPais: 0,
        sinRegion: 0,
        sinCiudad: 0,
        sinCategoria: 0,
    };

    constructor(
        private enriquecimientoService: EnriquecimientoNoticiasService,
        private supabaseService: SupabaseService
    ) { }

    async ngOnInit(): Promise<void> {
        await this.cargarEstadisticasDB();
    }

    /**
     * Inicia el proceso de enriquecimiento
     */
    async iniciarEnriquecimiento(): Promise<void> {
        if (this.procesando) {
            return;
        }

        const confirmar = confirm(
            `¿Deseas procesar ${this.limiteProcesamiento} noticias?\n\n` +
            `Esto puede tomar varios minutos y consumirá créditos de la API de Gemini.`
        );

        if (!confirmar) {
            return;
        }

        this.procesando = true;
        this.progreso = 0;
        this.enriquecimientoService.resetearEstadisticas();

        try {
            console.log('🚀 Iniciando proceso de enriquecimiento...');

            // Iniciar el proceso
            await this.enriquecimientoService.enriquecerTodasLasNoticias(this.limiteProcesamiento);

            // Actualizar estadísticas
            this.estadisticas = this.enriquecimientoService.getEstadisticas();

            // Recargar estadísticas de la base de datos
            await this.cargarEstadisticasDB();

            alert('✅ Proceso completado!\n\n' +
                `Exitosas: ${this.estadisticas.exitosas}\n` +
                `Fallidas: ${this.estadisticas.fallidas}`);

        } catch (error: any) {
            console.error('Error en el proceso:', error);
            alert(`❌ Error: ${error.message}`);
        } finally {
            this.procesando = false;
        }
    }

    /**
     * Carga estadísticas de la base de datos
     */
    async cargarEstadisticasDB(): Promise<void> {
        try {
            // Total de noticias
            const { count: total } = await this.supabaseService['supabase']
                .from('noticiastodo')
                .select('*', { count: 'exact', head: true });

            this.estadisticasDB.totalNoticias = total || 0;

            // Noticias sin imagen
            const { count: sinImagen } = await this.supabaseService['supabase']
                .from('noticiastodo')
                .select('*', { count: 'exact', head: true })
                .is('imagen_url', null);

            this.estadisticasDB.sinImagen = sinImagen || 0;

            // Noticias sin país
            const { count: sinPais } = await this.supabaseService['supabase']
                .from('noticiastodo')
                .select('*', { count: 'exact', head: true })
                .is('pais', null);

            this.estadisticasDB.sinPais = sinPais || 0;

            // Noticias sin región
            const { count: sinRegion } = await this.supabaseService['supabase']
                .from('noticiastodo')
                .select('*', { count: 'exact', head: true })
                .is('region', null);

            this.estadisticasDB.sinRegion = sinRegion || 0;

            // Noticias sin ciudad
            const { count: sinCiudad } = await this.supabaseService['supabase']
                .from('noticiastodo')
                .select('*', { count: 'exact', head: true })
                .is('ciudad', null);

            this.estadisticasDB.sinCiudad = sinCiudad || 0;

            // Noticias sin categoría
            const { count: sinCategoria } = await this.supabaseService['supabase']
                .from('noticiastodo')
                .select('*', { count: 'exact', head: true })
                .is('categoria', null);

            this.estadisticasDB.sinCategoria = sinCategoria || 0;


            // Calcular completas e incompletas
            this.estadisticasDB.noticiasIncompletas = Math.max(
                this.estadisticasDB.sinImagen,
                this.estadisticasDB.sinPais,
                this.estadisticasDB.sinRegion,
                this.estadisticasDB.sinCategoria,
            );

            this.estadisticasDB.noticiasCompletas =
                this.estadisticasDB.totalNoticias - this.estadisticasDB.noticiasIncompletas;

            console.log('📊 Estadísticas DB cargadas:', this.estadisticasDB);

        } catch (error) {
            console.error('Error al cargar estadísticas:', error);
        }
    }

    /**
     * Calcula el porcentaje de completitud
     */
    get porcentajeCompletitud(): number {
        if (this.estadisticasDB.totalNoticias === 0) return 0;
        return Math.round(
            (this.estadisticasDB.noticiasCompletas / this.estadisticasDB.totalNoticias) * 100
        );
    }
}