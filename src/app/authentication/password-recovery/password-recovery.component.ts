import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-password-recovery',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './password-recovery.component.html',
  styleUrl: './password-recovery.component.css'
})
export class PasswordRecoveryComponent {
  email: string = '';

  constructor(private authService: SupabaseService, private router: Router) {}

  async verificar(): Promise<void> {
    if (this.email) {
      try {
        await this.authService.resetPassword(this.email);
        console.log('Reseteo de contraseña solicitado con éxito');
        Swal.fire({
          icon: 'success',
          title: 'Correo enviado',
          text: 'Revisa tu bandeja de entrada para cambiar la contraseña.',
          confirmButtonText: 'Aceptar'
        });
      } catch (error: any) {
        console.error('Error al solicitar el reseteo de la contraseña:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'No se pudo enviar el correo de recuperación.',
          confirmButtonText: 'Aceptar'
        });
      }
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Advertencia',
        text: 'Por favor, ingresa un correo electrónico válido.',
        confirmButtonText: 'Aceptar'
      });
    }
  }
}
