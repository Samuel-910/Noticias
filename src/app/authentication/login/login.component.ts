import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { SupabaseService } from '../../services/supabase.service';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email = '';
  password = '';
  showPassword = false;
constructor(private supabase: SupabaseService, private router: Router) { }
  

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

async login() {
    try {
      await this.supabase.signInWithPassword(this.email, this.password);
        this.router.navigate(['/']);
        Swal.fire({
          icon: 'success',
          title: '¡Bienvenido!',
          text: 'Has iniciado sesión correctamente.',
          confirmButtonText: 'Aceptar'
        });
      

    } catch (err: any) {
      console.error('Login failed', err);
      Swal.fire({
        icon: 'error',
        title: '¡Error!',
        text: 'Hubo un problema al iniciar sesión. Verifica tus credenciales.',
        confirmButtonText: 'Aceptar'
      });
    }
  }
}

