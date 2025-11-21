import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { SupabaseService } from '../../services/supabase.service';
import Swal from 'sweetalert2';

export interface Plan {
  id: string;
  nombre: string;
  precio: number;
  periodo: 'mes' | 'año';
  descripcion: string;
  caracteristicas: string[];
  fuentes: string;
  noticias: string;
  destacado: boolean;
  actual: boolean;
  ahorro?: string;
}

@Component({
  selector: 'app-planes-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './planes-modal.component.html',
  styleUrls: ['./planes-modal.component.css']
})
export class PlanesModalComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  isOpen = false;
  planActual: Plan | null = null;

  planes: Plan[] = [
    {
      id: 'gratis',
      nombre: 'Gratis',
      precio: 0,
      periodo: 'mes',
      descripcion: 'Plan gratuito - 2 fuentes y 30 noticias por día',
      fuentes: '2 fuentes',
      noticias: '30 noticias/día',
      destacado: false,
      actual: false,
      caracteristicas: [
        '2 fuentes de noticias',
        '30 noticias por día',
        'Acceso a categorías básicas',
        'Filtros básicos',
        'Historial limitado a 7 días'
      ]
    },
    {
      id: 'premium-mensual',
      nombre: 'Premium Mensual',
      precio: 9.99,
      periodo: 'mes',
      descripcion: 'Ideal para uso profesional - 20 fuentes y 500 noticias diarias',
      fuentes: '20 fuentes',
      noticias: '500 noticias/día',
      destacado: false,
      actual: false,
      caracteristicas: [
        '20 fuentes de noticias',
        '500 noticias diarias',
        'Todas las categorías',
        'Filtros avanzados',
        'Historial ilimitado',
        'Resúmenes con IA',
        'Favoritos ilimitados',
        'Soporte prioritario'
      ]
    },
    {
      id: 'premium-anual',
      nombre: 'Premium Anual',
      precio: 79.99,
      periodo: 'año',
      descripcion: 'TODO ilimitado + Soporte prioritario + Acceso anticipado',
      fuentes: 'Ilimitadas',
      noticias: 'Ilimitadas',
      destacado: true,
      actual: false,
      ahorro: '$39.89',
      caracteristicas: [
        'Fuentes ILIMITADAS',
        'Noticias ILIMITADAS',
        'Todas las categorías premium',
        'Filtros avanzados + IA',
        'Historial ilimitado',
        'Resúmenes con IA ilimitados',
        'Favoritos ilimitados',
        'Exportación de datos avanzada',
        'Acceso anticipado a nuevas funciones',
        'Badge exclusivo de miembro premium',
        'Soporte prioritario 24/7',
        'Sin anuncios'
      ]
    }
  ];

  constructor(private supabaseService: SupabaseService) {}

  ngOnInit(): void {
    this.detectarPlanActual();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  abrirModal(): void {
    this.isOpen = true;
    document.body.style.overflow = 'hidden';
    // Redetectar el plan al abrir el modal por si cambió
    this.detectarPlanActual();
  }

  cerrarModal(): void {
    this.isOpen = false;
    document.body.style.overflow = '';
  }

  async detectarPlanActual() {
    try {
      // 1️⃣ Obtener usuario autenticado
      const user = await this.supabaseService.getCurrentUser();
      
      if (!user) {
        console.warn('⚠ No hay usuario en sesión - Plan por defecto: gratis');
        // Si no hay usuario, establecer plan gratis por defecto
        this.setPlanActual('gratis');
        return;
      }

      // 2️⃣ Obtener el plan_id desde la tabla usuarios
      const planId = await this.supabaseService.getPlanUsuario(user.id);

      if (!planId) {
        console.warn('⚠ Usuario sin plan asignado - Plan por defecto: gratis');
        // Si el usuario no tiene plan asignado, usar gratis
        this.setPlanActual('gratis');
        return;
      }

      // 3️⃣ Establecer el plan actual
      this.setPlanActual(planId);
      console.log('✅ Plan detectado correctamente:', planId);

    } catch (e: any) {
      console.error('❌ Error detectando plan actual:', e);
      // En caso de error, usar plan gratis por defecto
      this.setPlanActual('gratis');
    }
  }

  /**
   * Establece el plan actual y actualiza el estado de todos los planes
   */
  private setPlanActual(planId: string): void {
    // Marcar todos los planes como no actuales
    this.planes.forEach(plan => {
      plan.actual = false;
    });

    // Buscar y marcar el plan actual
    const planEncontrado = this.planes.find(p => p.id === planId);
    
    if (planEncontrado) {
      planEncontrado.actual = true;
      this.planActual = planEncontrado;
      console.log('📌 Plan actual establecido:', planEncontrado.nombre);
    } else {
      console.warn('⚠ Plan ID no encontrado:', planId, '- Usando gratis');
      // Si el ID no coincide con ningún plan, usar gratis
      const planGratis = this.planes.find(p => p.id === 'gratis');
      if (planGratis) {
        planGratis.actual = true;
        this.planActual = planGratis;
      }
    }
  }

  /**
   * Verifica si un plan es el plan actual
   */
  esPlanActual(planId: string): boolean {
    return this.planActual?.id === planId;
  }

  /**
   * Obtiene la clase CSS para el borde del plan
   */
  getBorderClass(plan: Plan): string {
    if (plan.actual) {
      return 'border-green-500 ring-2 ring-green-500';
    }
    if (plan.destacado) {
      return 'border-indigo-500 ring-2 ring-indigo-500/50';
    }
    return 'border-white/10';
  }

  /**
   * Obtiene la clase CSS para el botón del plan
   */
  getButtonClass(plan: Plan): string {
    if (plan.actual) {
      return 'bg-white/10 text-gray-400 cursor-not-allowed';
    }
    if (plan.destacado) {
      return 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white';
    }
    return 'bg-indigo-600 hover:bg-indigo-700 text-white';
  }

  /**
   * Obtiene el texto del botón según el estado del plan
   */
  getButtonText(plan: Plan): string {
    if (plan.actual) {
      return 'Plan Actual';
    }
    return 'Seleccionar Plan';
  }

async seleccionarPlan(plan: Plan): Promise<void> {
  // No permitir seleccionar el plan actual
  if (plan.actual) {
    return;
  }

  console.log('📝 Plan seleccionado:', plan.nombre);

  // Si es plan gratuito
  if (plan.precio === 0) {

    const user = await this.supabaseService.getCurrentUser();
    if (!user) return;

    await this.supabaseService.updateUserPlan(user.id, plan.id);

    Swal.fire({
      icon: 'success',
      title: 'Plan cambiado',
      text: 'Has cambiado al plan gratuito correctamente.'
    });

    this.cerrarModal();
    return;
  }

  // Si es Premium Mensual o Anual → confirmar
  if (plan.nombre === 'Premium Mensual' || plan.nombre === 'Premium Anual') {

    const confirm = await Swal.fire({
      title: '¿Cambiar de plan?',
      text: `¿Seguro que deseas activar el plan ${plan.nombre}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirm.isConfirmed) return;

    const user = await this.supabaseService.getCurrentUser();
    if (!user) return;

    const { error } = await this.supabaseService.updateUserPlan(user.id, plan.id);

    if (!error) {
      Swal.fire({
        icon: 'success',
        title: '¡Plan actualizado!',
        text: `Tu plan ahora es ${plan.nombre}.`
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo actualizar el plan.'
      });
    }

    this.cerrarModal();
    return;
  }

  // Otros planes (si existieran)
  alert(`Redirigiendo al checkout para el plan: ${plan.nombre} - $${plan.precio}/${plan.periodo}`);
  this.cerrarModal();
}

  /**
   * Verifica si el botón debe estar deshabilitado
   */
  isButtonDisabled(plan: Plan): boolean {
    return plan.actual;
  }
}