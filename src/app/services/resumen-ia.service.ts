// src/app/services/resumen-ia.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Noticia } from '../models/noticia';
import { environment } from '../environments/environment';

// Interfaz para la respuesta esperada de la API de Gemini
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class ResumenIaService {
  // Modelo y URL de la API de Gemini
  private readonly GEMINI_MODEL = 'gemini-2.5-flash';
  private readonly GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/models/${this.GEMINI_MODEL}:generateContent`;

  // ⚠️ Importante: Reemplaza con el nombre de tu clave de entorno
  private readonly API_KEY = environment.geminiApiKey; 

  // Inyectar HttpClient de Angular
  constructor(private http: HttpClient) {}

  async generarResumen(noticia: Noticia): Promise<void> {
    // Si ya tiene resumen, solo toggle mostrar/ocultar
    if (noticia.resumen) {
      noticia.mostrarResumen = !noticia.mostrarResumen;
      return;
    }

    // Iniciar carga
    noticia.cargandoResumen = true;
    noticia.mostrarResumen = true;

    try {
      const prompt = this.crearPromptResumen(noticia.titulo, noticia.contenido);

      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });
      
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ]
      };

      // Realizar la solicitud POST a la API de Gemini
      const response = await this.http.post<GeminiResponse>(
        `${this.GEMINI_API_URL}?key=${this.API_KEY}`, 
        payload, 
        { headers }
      ).toPromise();

      // Procesar la respuesta
      const resumenGenerado = response?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (resumenGenerado) {
        noticia.resumen = resumenGenerado.trim();
      } else {
        noticia.resumen = '❌ No se pudo generar el resumen. La respuesta de la API no fue válida.';
      }

    } catch (error) {
      console.error('Error generando resumen:', error);
      noticia.resumen = `❌ Error de conexión o API. Revisa la consola y tu clave.`;
    } finally {
      noticia.cargandoResumen = false;
    }
  }

  // Helper para construir el prompt
  private crearPromptResumen(titulo: string, contenido: string): string {
    return `Genera un resumen conciso y objetivo de la siguiente noticia, manteniendo un tono formal:\n\nTitulo: ${titulo}\n\nContenido: ${contenido}`;
  }

  // Métodos de utilidad (se mantienen igual)
  // ---
  cerrarResumen(noticia: Noticia): void {
    noticia.mostrarResumen = false;
  }

  tieneResumen(noticia: Noticia): boolean {
    return !!noticia.resumen;
  }

  estaGenerando(noticia: Noticia): boolean {
    return !!noticia.cargandoResumen;
  }

  estaMostrando(noticia: Noticia): boolean {
    return !!noticia.mostrarResumen;
  }
}