import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent {
  email = '';
  password = '';
  showPassword = false;
  confirmPassword = '';
  constructor(private supabase: SupabaseService, private router: Router) { }

  async register() {
    if (this.password !== this.confirmPassword) {
      Swal.fire('Error', 'Las contraseñas no coinciden.', 'error');
      return;
    }

    try {
      await this.supabase.signUp(this.email, this.password);
      Swal.fire('Registro exitoso', 'Revisa tu correo para confirmar.', 'success');
      this.router.navigate(['/']);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudo registrar.', 'error');
    }
  }
  
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}
