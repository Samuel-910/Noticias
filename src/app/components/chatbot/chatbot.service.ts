import { Injectable } from '@angular/core';
import { GeminiService } from './gemini.service';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { SupabaseService } from '../../services/supabase.service';
import { Noticia } from '../../models/noticia';

export interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
  noticias?: Noticia[];
}

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private conversationHistory: ChatMessage[] = [];

  constructor(
    private geminiService: GeminiService,
    private supabaseService: SupabaseService
  ) {}

  sendMessage(userMessage: string): Observable<ChatMessage> {
    // Agregar mensaje del usuario al historial
    const userMsg: ChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    this.conversationHistory.push(userMsg);

    // Analizar la intención del usuario y buscar noticias relevantes
    return this.analyzeUserIntent(userMessage).pipe(
      switchMap(intent => {
        // Buscar noticias según la intención
        return this.fetchRelevantNews(intent, userMessage);
      }),
      switchMap(noticias => {
        // Crear contexto para Gemini con las noticias encontradas
        const context = this.buildContext(noticias, userMessage);
        
        // Generar respuesta con Gemini
        return this.geminiService.generateResponse(context).pipe(
          map(response => {
            const botResponse = this.geminiService.extractTextFromResponse(response);
            const botMsg: ChatMessage = {
              role: 'bot',
              content: botResponse,
              timestamp: new Date(),
              noticias: noticias.length > 0 ? noticias.slice(0, 3) : undefined
            };
            this.conversationHistory.push(botMsg);
            return botMsg;
          })
        );
      }),
      catchError(error => {
        console.error('Error en chatbot:', error);
        const errorMsg: ChatMessage = {
          role: 'bot',
          content: 'Lo siento, ocurrió un error al procesar tu solicitud. ¿Puedes intentarlo de nuevo?',
          timestamp: new Date()
        };
        return of(errorMsg);
      })
    );
  }

  private analyzeUserIntent(message: string): Observable<string> {
    const lowerMessage = message.toLowerCase();
    
    // Detectar intenciones básicas
    if (lowerMessage.includes('categoría') || lowerMessage.includes('categoria')) {
      return of('categoria');
    } else if (lowerMessage.includes('país') || lowerMessage.includes('pais')) {
      return of('pais');
    } else if (lowerMessage.includes('buscar') || lowerMessage.includes('encuentra')) {
      return of('buscar');
    } else if (lowerMessage.includes('últimas') || lowerMessage.includes('ultimas') || 
               lowerMessage.includes('recientes') || lowerMessage.includes('trending')) {
      return of('recientes');
    }
    
    return of('general');
  }

  private fetchRelevantNews(intent: string, message: string): Observable<Noticia[]> {
    const lowerMessage = message.toLowerCase();
    
    switch (intent) {
      case 'categoria':
        // Extraer categoría del mensaje
        const categorias = ['general', 'deportes', 'tecnología', 'política', 'medio ambiente', 'economía'];
        const categoria = categorias.find(cat => lowerMessage.includes(cat));
        if (categoria) {
          return this.supabaseService.getNoticiasByCategoria(categoria);
        }
        break;
        
      case 'pais':
        // Extraer país del mensaje
        const paises = ['españa', 'méxico', 'argentina', 'colombia', 'chile', 'perú'];
        const pais = paises.find(p => lowerMessage.includes(p));
        if (pais) {
          return this.supabaseService.getNoticiasByPais(pais);
        }
        break;
        
      case 'buscar':
        // Extraer términos de búsqueda
        const searchTerms = message.replace(/buscar|encuentra|sobre|acerca de/gi, '').trim();
        if (searchTerms.length > 2) {
          return this.supabaseService.searchNoticias(searchTerms);
        }
        break;
        
      case 'recientes':
        return this.supabaseService.getAllNoticias().pipe(
          map(noticias => noticias.slice(0, 5))
        );
    }
    
    // Por defecto, buscar en el contenido del mensaje
    return this.supabaseService.searchNoticias(message).pipe(
      switchMap(noticias => {
        if (noticias.length === 0) {
          // Si no hay resultados, traer las más recientes
          return this.supabaseService.getAllNoticias().pipe(
            map(all => all.slice(0, 5))
          );
        }
        return of(noticias);
      })
    );
  }

  private buildContext(noticias: Noticia[], userMessage: string): string {
    let context = `Eres un asistente virtual del Portal de Noticias. Tu trabajo es ayudar a los usuarios a encontrar noticias relevantes y responder preguntas sobre ellas.

Usuario pregunta: "${userMessage}"

`;

    if (noticias.length > 0) {
      context += `He encontrado ${noticias.length} noticias relevantes en nuestra base de datos:\n\n`;
      
      noticias.slice(0, 5).forEach((noticia, index) => {
        context += `Noticia ${index + 1}:
- Título: ${noticia.titulo}
- Categoría: ${noticia.categoria}
- País: ${noticia.pais}
- Fecha: ${noticia.fecha_publicacion}
- Resumen: ${noticia.contenido.substring(0, 200)}...

`;
      });
      
      context += `\nBasándote en estas noticias, proporciona una respuesta útil y conversacional al usuario. Si hay noticias relevantes, menciona los títulos más importantes y ofrece ayudar con más detalles. Sé breve, amigable y útil.`;
    } else {
      context += `No encontré noticias específicas sobre este tema en nuestra base de datos. Puedes sugerir al usuario que:\n
1. Reformule su pregunta
2. Busque en categorías específicas (general, deportes, tecnología, política, medio ambiente, economía)
3. Explore las noticias más recientes

Sé amigable y ofrece alternativas útiles.`;
    }

    return context;
  }

  getConversationHistory(): ChatMessage[] {
    return this.conversationHistory;
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }
}
