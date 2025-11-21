// src/app/components/filtros-sidebar/filtros-sidebar.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FiltrosNoticia, RANGOS_TIEMPO } from '../../models/noticia';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-filtros-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filtros-sidebar.component.html',
  styleUrls: ['./filtros-sidebar.component.css']
})
export class FiltrosSidebarComponent implements OnInit {
  @Input() filtros!: FiltrosNoticia;
  @Input() categorias: string[] = [];
  @Input() paises: string[] = [];
  @Input() regiones: string[] = [];
  @Input() ciudades: string[] = [];
  @Input() tiposNoticia: string[] = [];
  @Input() idiomas: string[] = [];
  @Input() fuentes: string[] = [];

  @Output() filtrosChange = new EventEmitter<Partial<FiltrosNoticia>>();
  @Output() rangoTiempoChange = new EventEmitter<string>();
  @Output() limpiarFiltros = new EventEmitter<void>();
  @Output() abrirModalPlanes = new EventEmitter<void>();

  rangosTiempo = RANGOS_TIEMPO;
  
  // Variables de control de usuario
  usuarioLogueado = false;
  esPremium = false;

  // Filtros que requieren premium
  filtrosPremium = ['region', 'ciudad', 'tipoNoticia', 'idioma', 'fuente', 'fechas'];

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit(): Promise<void> {
    await this.verificarEstadoUsuario();
  }

async verificarEstadoUsuario(): Promise<void> {
  console.log("🟡 Iniciando verificación de estado del usuario...");

  try {
    console.log("🔵 Obteniendo usuario actual desde Supabase...");
    const usuario = await this.supabaseService.getCurrentUser();
    console.log("🟣 Usuario obtenido:", usuario);

    this.usuarioLogueado = !!usuario;
    console.log(`🟠 ¿Usuario logueado?: ${this.usuarioLogueado}`);

    if (this.usuarioLogueado && usuario) {
      console.log(`🔵 Buscando plan del usuario con ID: ${usuario.id}...`);
      const planId = await this.supabaseService.getPlanUsuario(usuario.id);
      console.log(`🟣 Plan obtenido: ${planId}`);

      this.esPremium = planId === "premium-mensual" || planId === "premium-anual";
      console.log(
        `🔐 Usuario detectado como: ${this.esPremium ? 'PREMIUM' : 'GRATUITO'}`
      );
    } else {
      console.log("🟤 No hay usuario logueado. Se considera visitante o no autenticado.");
    }

  } catch (error) {
    console.error("❌ Error al verificar estado del usuario:", error);
    this.usuarioLogueado = false;
  }

  console.log(
    `🏁 Resultado final -> Logueado=${this.usuarioLogueado}, Premium=${this.esPremium}`
  );
}


  onFiltroChange(campo: keyof FiltrosNoticia, valor: any): void {
    // Verificar si el filtro requiere premium
    if (this.esFiltroRestringido(campo) && !this.esPremium) {
      console.log(`🔒 Filtro "${campo}" requiere Premium`);
      this.abrirModalPlanes.emit();
      return;
    }

    this.filtrosChange.emit({ [campo]: valor });
  }

  onRangoTiempoChange(rangoTiempo: string): void {
    this.rangoTiempoChange.emit(rangoTiempo);
  }

  onLimpiarFiltros(): void {
    this.limpiarFiltros.emit();
  }

  /**
   * Verifica si un filtro está restringido para usuarios gratuitos
   */
  esFiltroRestringido(campo: keyof FiltrosNoticia): boolean {
    return this.filtrosPremium.includes(campo);
  }

  /**
   * Maneja el click en un filtro premium para usuarios no premium
   */
  onFiltroPremiumClick(event: Event, campo: string): void {
    if (!this.esPremium) {
      event.preventDefault();
      event.stopPropagation();
      console.log(`🔒 Intentando usar filtro premium: ${campo}`);
      this.abrirModalPlanes.emit();
    }
  }
}