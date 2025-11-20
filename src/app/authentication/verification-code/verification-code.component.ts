import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { supabase } from '../../services/supabase.config';


@Component({
  selector: 'app-verification-code',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './verification-code.component.html',
  styleUrl: './verification-code.component.css'
})
export class VerificationCodeComponent implements OnInit {
  newPassword: string = '';
  token: string = '';
  confirmPassword: string = '';
  constructor(private router: Router) {}

  async ngOnInit() {
    // Opcionalmente puedes verificar si el usuario está autenticado después del link de recuperación
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      Swal.fire('Error', 'No se encontró una sesión activa. Asegúrate de acceder desde el enlace del correo.', 'error');
    }
  }

  async verificarcodigo() {
    if (!this.newPassword) {
      Swal.fire('Campos incompletos', 'Por favor, ingresa una nueva contraseña.', 'warning');
      return;
    }

    const { data, error } = await supabase.auth.updateUser({
      password: this.newPassword
    });

    if (error) {
      console.error(error);
      Swal.fire('Error', 'Hubo un problema al actualizar la contraseña.', 'error');
    } else {
      Swal.fire({
        icon: 'success',
        title: '¡Contraseña actualizada!',
        text: 'Tu contraseña ha sido actualizada correctamente.',
        confirmButtonText: 'Iniciar sesión'
      }).then(() => {
        this.router.navigate(['/']);
      });
    }
  }
}
