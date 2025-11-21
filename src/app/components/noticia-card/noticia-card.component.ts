// src/app/components/noticia-card/noticia-card.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Noticia } from '../../models/noticia';
import { ResumenService } from '../../services/resumen.service';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-noticia-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './noticia-card.component.html',
  styleUrls: ['./noticia-card.component.css']
})
export class NoticiaCardComponent implements OnInit {
  @Input() noticia!: Noticia;
  @Input() fechaFormateada?: string; // Opcional: para mantener compatibilidad
  
  // Outputs para comunicación con componente padre
  @Output() generarResumen = new EventEmitter<Noticia>();
  @Output() cerrarResumen = new EventEmitter<Noticia>();
  @Output() abrirModalPlanes = new EventEmitter<void>();
  
  // Variables de control de usuario
  usuarioLogueado = false;
  esPremium = false;
  resumenesRestantes = 0;
  resumenesUsados = 0;
  limiteResumenes = 3;

  constructor(
    private resumenService: ResumenService,
    private supabaseService: SupabaseService
  ) {}

  async ngOnInit(): Promise<void> {
    // Verificar estado de autenticación
    await this.verificarEstadoUsuario();
    
    // Cargar resumen si ya existe
    const resumenExistente = await this.resumenService.obtenerResumen(this.noticia.id_noticia);
    if (resumenExistente) {
      this.noticia.resumen = resumenExistente;
      this.noticia.mostrarResumen = false; // Inicialmente oculto
    }
  }

  async verificarEstadoUsuario(): Promise<void> {
    try {
      // Verificar si está logueado
      const usuario = await this.supabaseService.getCurrentUser();
      this.usuarioLogueado = !!usuario;
      
      if (this.usuarioLogueado && usuario) {
        // Verificar si es premium
        const planId = await this.supabaseService.getPlanUsuario(usuario.id);
        this.esPremium = planId === 2 || planId === 3;
        
        // Si no es premium, obtener conteo de resúmenes
        if (!this.esPremium) {
          this.resumenesUsados = await this.resumenService.obtenerConteoResumenes();
          this.resumenesRestantes = Math.max(0, this.limiteResumenes - this.resumenesUsados);
        }
      }
    } catch (error) {
      console.error('Error al verificar estado del usuario:', error);
      this.usuarioLogueado = false;
    }
  }

  async onGenerarResumenClick(): Promise<void> {
    // Verificar si el usuario está logueado
    if (!this.usuarioLogueado) {
      alert('Debes iniciar sesión para usar la función de resúmenes con IA');
      // Emitir evento para que el padre maneje la navegación al login si es necesario
      return;
    }

    // Verificar límite de resúmenes para usuarios gratuitos
    if (!this.esPremium && this.resumenesUsados >= this.limiteResumenes) {
      // Abrir modal de planes desde el componente padre
      this.abrirModalPlanes.emit();
      return;
    }

    // Si ya existe el resumen, solo alternar la visualización
    if (this.noticia.resumen && !this.noticia.cargandoResumen) {
      this.noticia.mostrarResumen = !this.noticia.mostrarResumen;
      
      // Emitir evento apropiado
      if (this.noticia.mostrarResumen) {
        this.generarResumen.emit(this.noticia);
      } else {
        this.cerrarResumen.emit(this.noticia);
      }
      return;
    }

    try {
      // Emitir evento al padre para que maneje la generación
      this.generarResumen.emit(this.noticia);
      
      // Generar nuevo resumen usando el servicio
      await this.resumenService.generarResumen(this.noticia);
      
      // Actualizar contadores solo para usuarios no premium
      if (!this.esPremium) {
        this.resumenesUsados++;
        this.resumenesRestantes = Math.max(0, this.limiteResumenes - this.resumenesUsados);
      }
    } catch (error: any) {
      console.error('Error:', error);
      
      // Si el error es por límite alcanzado, abrir modal de planes
      if (error.message.includes('límite')) {
        this.abrirModalPlanes.emit();
      } else {
        alert(error.message || 'Error al generar el resumen');
      }
    }
  }

  onCerrarResumenClick(): void {
    this.noticia.mostrarResumen = false;
    this.cerrarResumen.emit(this.noticia);
  }

  async verOriginal(event: Event): Promise<void> {
    event.preventDefault();
    window.open(this.noticia.url_fuente, '_blank', 'noopener,noreferrer');
  }

  formatearFecha(fecha: string): string {
    // Si viene fechaFormateada del Input, usarla
    if (this.fechaFormateada) {
      return this.fechaFormateada;
    }
    
    // Sino, formatear aquí
    try {
      const date = new Date(fecha);
      const ahora = new Date();
      const diffMs = ahora.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHoras = Math.floor(diffMs / 3600000);
      const diffDias = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Hace un momento';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHoras < 24) return `Hace ${diffHoras}h`;
      if (diffDias < 7) return `Hace ${diffDias} días`;
      
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short'
      });
    } catch {
      return fecha;
    }
  }

  get textoBotonResumen(): string {
    if (this.noticia.cargandoResumen) {
      return 'Generando resumen...';
    }
    if (this.noticia.resumen) {
      return this.noticia.mostrarResumen ? 'Ocultar resumen' : 'Ver resumen';
    }
    return 'Resumir con IA';
  }

  get mostrarContadorResumenes(): boolean {
    return this.usuarioLogueado && !this.esPremium;
  }
}