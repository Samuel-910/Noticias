import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ChatbotService, ChatMessage } from './chatbot.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  
  isOpen = false;
  messages: ChatMessage[] = [];
  userInput = '';
  isLoading = false;
  
  // Sugerencias rápidas
  quickSuggestions = [
    '¿Cuáles son las últimas noticias?',
    'Buscar noticias de tecnología',
    'Noticias de medio ambiente',
    'Noticias trending'
  ];

  constructor(private chatbotService: ChatbotService) {}

  ngOnInit(): void {
    // Mensaje de bienvenida
    this.addWelcomeMessage();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
  }

  addWelcomeMessage(): void {
    const welcomeMsg: ChatMessage = {
      role: 'bot',
      content: '¡Hola! 👋 Soy tu asistente del Portal de Noticias. Puedo ayudarte a encontrar noticias, responder preguntas sobre ellas y más. ¿En qué puedo ayudarte hoy?',
      timestamp: new Date()
    };
    this.messages.push(welcomeMsg);
  }

  sendMessage(): void {
    if (!this.userInput.trim() || this.isLoading) {
      return;
    }

    const message = this.userInput.trim();
    this.userInput = '';
    this.isLoading = true;

    // Agregar mensaje del usuario a la UI
    this.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Enviar al servicio del chatbot
    this.chatbotService.sendMessage(message).subscribe({
      next: (response) => {
        this.messages.push(response);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error:', error);
        this.messages.push({
          role: 'bot',
          content: 'Lo siento, hubo un error. Por favor intenta de nuevo.',
          timestamp: new Date()
        });
        this.isLoading = false;
      }
    });
  }

  useSuggestion(suggestion: string): void {
    this.userInput = suggestion;
    this.sendMessage();
  }

  clearChat(): void {
    this.messages = [];
    this.chatbotService.clearHistory();
    this.addWelcomeMessage();
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = 
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling:', err);
    }
  }

  trackByMessage(index: number, message: ChatMessage): string {
    return `${message.timestamp.getTime()}-${index}`;
  }
}
