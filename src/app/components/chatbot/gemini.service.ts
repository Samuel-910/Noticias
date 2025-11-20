import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private apiKey = 'AIzaSyBNt7swAhgYqg8hP1GhNztdY22jf9TV6hI'; // Reemplazar con tu API key
  private  GEMINI_MODEL = 'gemini-2.5-flash';
  private  apiUrl = `https://generativelanguage.googleapis.com/v1/models/${this.GEMINI_MODEL}:generateContent`;

  constructor(private http: HttpClient) {}

  generateResponse(prompt: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    const body = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    };

    return this.http.post(
      `${this.apiUrl}?key=${this.apiKey}`,
      body,
      { headers }
    );
  }

  extractTextFromResponse(response: any): string {
    try {
      return response.candidates[0].content.parts[0].text;
    } catch (error) {
      return 'Lo siento, no pude procesar la respuesta.';
    }
  }
}
