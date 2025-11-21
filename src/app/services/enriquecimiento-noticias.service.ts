// src/app/services/enriquecimiento-noticias.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SupabaseService } from './supabase.service';
import { environment } from '../environments/environment';

interface DatosExtraidos {
    imagen_url?: string;
    pais?: string;
    region?: string;
    ciudad?: string;
    categoria?: string;
    tipo_noticia?: string;
    idioma?: string;
    tags?: string[];
}

interface ResultadoEnriquecimiento {
    exito: boolean;
    noticia_id: string;
    datos_actualizados: DatosExtraidos;
    error?: string;
}

@Injectable({
    providedIn: 'root'
})
export class EnriquecimientoNoticiasService {
  private readonly GEMINI_MODEL = 'gemini-2.5-flash';
  private readonly GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/models/${this.GEMINI_MODEL}:generateContent`;

    private readonly API_KEY = environment.geminiApiKey;

    // Estadísticas del proceso
    private estadisticas = {
        total: 0,
        procesadas: 0,
        exitosas: 0,
        fallidas: 0,
        errores: [] as { noticia_id: string; error: string }[]
    };

    constructor(
        private http: HttpClient,
        private supabaseService: SupabaseService
    ) { }

    /**
     * Procesa todas las noticias que tienen campos vacíos
     */
    async enriquecerTodasLasNoticias(limite: number = 100): Promise<void> {
        console.log('🚀 Iniciando proceso de enriquecimiento de noticias...');

        try {
            // Obtener noticias con campos vacíos o nulos
            const noticias = await this.obtenerNoticiasIncompletas(limite);

            this.estadisticas.total = noticias.length;
            console.log(`📊 Total de noticias a procesar: ${this.estadisticas.total}`);

            // Procesar en lotes de 5 para no saturar la API
            const BATCH_SIZE = 5;
            for (let i = 0; i < noticias.length; i += BATCH_SIZE) {
                const lote = noticias.slice(i, i + BATCH_SIZE);
                const progreso = Math.round((i / noticias.length) * 100);

                console.log(`\n📦 Procesando lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(noticias.length / BATCH_SIZE)} (${progreso}%)`);

                // Procesar lote en paralelo
                const promesas = lote.map(noticia => this.enriquecerNoticia(noticia));
                await Promise.all(promesas);

                // Pequeña pausa entre lotes para no saturar la API
                await this.esperar(2000);
            }

            // Mostrar resumen final
            this.mostrarResumen();

        } catch (error) {
            console.error('❌ Error general en el proceso:', error);
        }
    }

    /**
     * Enriquece una noticia individual
     */
    async enriquecerNoticia(noticia: any): Promise<ResultadoEnriquecimiento> {
        const inicio = Date.now();

        try {
            console.log(`\n🔍 Procesando: ${noticia.titulo.substring(0, 50)}...`);
            console.log(`   ID: ${noticia.id}`);
            console.log(`   URL: ${noticia.url_fuente}`);

            // 1. Extraer contenido de la URL
            let contenidoHTML = '';
            try {
                contenidoHTML = await this.extraerContenidoURL(noticia.url_fuente);
            } catch (error) {
                console.warn(`   ⚠️ No se pudo extraer contenido HTML, usando datos existentes`);
            }

            // 2. Analizar con Gemini AI
            const datosExtraidos = await this.analizarConGemini(
                noticia.titulo,
                noticia.contenido || '',
                contenidoHTML,
                noticia.url_fuente
            );

            // 3. Actualizar en Supabase
            await this.actualizarNoticiaEnSupabase(noticia.id, datosExtraidos);

            const duracion = ((Date.now() - inicio) / 1000).toFixed(1);
            this.estadisticas.procesadas++;
            this.estadisticas.exitosas++;

            console.log(`   ✅ Completado en ${duracion}s`);
            console.log(`   📊 Datos extraídos:`, datosExtraidos);

            return {
                exito: true,
                noticia_id: noticia.id,
                datos_actualizados: datosExtraidos
            };

        } catch (error: any) {
            this.estadisticas.procesadas++;
            this.estadisticas.fallidas++;
            this.estadisticas.errores.push({
                noticia_id: noticia.id,
                error: error.message
            });

            console.error(`   ❌ Error: ${error.message}`);

            return {
                exito: false,
                noticia_id: noticia.id,
                datos_actualizados: {},
                error: error.message
            };
        }
    }

    /**
     * Analiza el contenido con Gemini AI
     */
    private async analizarConGemini(
        titulo: string,
        contenido: string,
        contenidoHTML: string,
        url: string
    ): Promise<DatosExtraidos> {

        const prompt = `Analiza la siguiente noticia y extrae información estructurada. 
Debes responder ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown, sin backticks.

INFORMACIÓN DE LA NOTICIA:
- Título: ${titulo}
- Contenido: ${contenido.substring(0, 1000)}
- URL: ${url}
${contenidoHTML ? `- HTML parcial: ${contenidoHTML.substring(0, 500)}` : ''}

INSTRUCCIONES:
Extrae y devuelve la siguiente información en formato JSON:

{
  "imagen_url": "URL de la imagen principal de la noticia (busca en el contenido HTML si está disponible)",
  "pais": "País al que pertenece la noticia (ej: Perú, Colombia, Argentina, España, México, etc.)",
  "region": "Región o departamento (ej: Lima, Puno, Arequipa, Cusco, etc.)",
  "ciudad": "Ciudad específica mencionada (ej: Juliaca, Lima, Arequipa, etc.)",
  "categoria": "Categoría principal (debe ser UNA de estas: tecnologia, deportes, politica, economia, salud, entretenimiento, educacion, ciencia, cultura, internacional)",
  "tipo_noticia": "Tipo de noticia (debe ser UNO de estos: articulo, reportaje, opinion, entrevista, breaking_news, analisis)",
  "idioma": "Idioma de la noticia (debe ser UNO de estos: espanol, ingles, portugues, frances, otro)",
  "tags": ["tag1", "tag2", "tag3"]
}

REGLAS IMPORTANTES:
1. Categoría DEBE ser una de: tecnologia, deportes, politica, economia, salud, entretenimiento, educacion, ciencia, cultura, internacional
2. Tipo DEBE ser uno de: articulo, reportaje, opinion, entrevista, breaking_news, analisis
3. Idioma DEBE ser uno de: espanol, ingles, portugues, frances, otro
4. Si no puedes determinar un valor, usa null
5. La descripción debe ser concisa y objetiva
6. Tags deben ser palabras clave relevantes
7. Responde SOLO con el JSON, sin explicaciones adicionales

IMPORTANTE: Tu respuesta debe ser SOLO el objeto JSON, sin texto antes ni después, sin bloques de código markdown.`;

        try {
            const response = await this.http.post<any>(
                `${this.GEMINI_API_URL}?key=${this.API_KEY}`,
                {
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 1000,
                    }
                }
            ).toPromise();

            const textoRespuesta = response?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!textoRespuesta) {
                throw new Error('Respuesta vacía de Gemini');
            }

            // Limpiar la respuesta (eliminar markdown, espacios, etc.)
            let jsonLimpio = textoRespuesta
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();

            // Parsear JSON
            const datos: DatosExtraidos = JSON.parse(jsonLimpio);

            // Validar y limpiar datos
            return this.validarYLimpiarDatos(datos);

        } catch (error: any) {
            console.error('Error al analizar con Gemini:', error);
            throw new Error(`Error de Gemini: ${error.message}`);
        }
    }

    /**
     * Extrae contenido HTML de la URL
     */
    private async extraerContenidoURL(url: string): Promise<string> {
        try {
            // Nota: En producción, necesitarías un proxy o backend para evitar CORS
            // Por ahora, retornamos string vacío y Gemini trabajará con título y contenido
            return '';
        } catch (error) {
            return '';
        }
    }

    /**
     * Valida y limpia los datos extraídos
     */
    private validarYLimpiarDatos(datos: any): DatosExtraidos {
        const categoriasValidas = [
            'tecnologia', 'deportes', 'politica', 'economia', 'salud',
            'entretenimiento', 'educacion', 'ciencia', 'cultura', 'internacional'
        ];

        const tiposValidos = [
            'articulo', 'reportaje', 'opinion', 'entrevista', 'breaking_news', 'analisis'
        ];

        const idiomasValidos = ['espanol', 'ingles', 'portugues', 'frances', 'otro'];

        return {
            imagen_url: datos.imagen_url || null,
            pais: datos.pais || null,
            region: datos.region || null,
            ciudad: datos.ciudad || null,
            categoria: categoriasValidas.includes(datos.categoria?.toLowerCase())
                ? datos.categoria.toLowerCase()
                : 'internacional',
            tipo_noticia: tiposValidos.includes(datos.tipo_noticia?.toLowerCase())
                ? datos.tipo_noticia.toLowerCase()
                : 'articulo',
            idioma: idiomasValidos.includes(datos.idioma?.toLowerCase())
                ? datos.idioma.toLowerCase()
                : 'espanol',
            tags: Array.isArray(datos.tags) ? datos.tags : []
        };
    }

    /**
     * Actualiza la noticia en Supabase
     */
    private async actualizarNoticiaEnSupabase(
        noticiaId: string,
        datos: DatosExtraidos
    ): Promise<void> {
        const datosActualizacion: any = {};

        // Solo actualizar campos que no estén vacíos
        if (datos.imagen_url) datosActualizacion.imagen_url = datos.imagen_url;
        if (datos.pais) datosActualizacion.pais = datos.pais;
        if (datos.region) datosActualizacion.region = datos.region;
        if (datos.ciudad) datosActualizacion.ciudad = datos.ciudad;
        if (datos.categoria) datosActualizacion.categoria = datos.categoria;
        if (datos.tipo_noticia) datosActualizacion.tipo_noticia = datos.tipo_noticia;
        if (datos.idioma) datosActualizacion.idioma = datos.idioma;
        if (datos.tags && datos.tags.length > 0) {
            datosActualizacion.tags = datos.tags;
        }

        datosActualizacion.updated_at = new Date().toISOString();

        const { error } = await this.supabaseService['supabase']
            .from('noticiastodo')
            .update(datosActualizacion)
            .eq('id', noticiaId);

        if (error) {
            throw new Error(`Error al actualizar Supabase: ${error.message}`);
        }
    }

    /**
     * Obtiene noticias con campos incompletos
     */
    private async obtenerNoticiasIncompletas(limite: number): Promise<any[]> {
        const { data, error } = await this.supabaseService['supabase']
            .from('noticiastodo')
            .select('*')
            .or('imagen_url.is.null,pais.is.null,region.is.null,ciudad.is.null,categoria.is.null')
            .limit(limite);

        if (error) {
            throw new Error(`Error al obtener noticias: ${error.message}`);
        }

        return data || [];
    }

    /**
     * Muestra resumen del proceso
     */
    private mostrarResumen(): void {
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN DEL PROCESO DE ENRIQUECIMIENTO');
        console.log('='.repeat(60));
        console.log(`✅ Total procesadas: ${this.estadisticas.procesadas}/${this.estadisticas.total}`);
        console.log(`✅ Exitosas: ${this.estadisticas.exitosas}`);
        console.log(`❌ Fallidas: ${this.estadisticas.fallidas}`);

        if (this.estadisticas.errores.length > 0) {
            console.log('\n❌ ERRORES:');
            this.estadisticas.errores.forEach((err, index) => {
                console.log(`   ${index + 1}. ID ${err.noticia_id}: ${err.error}`);
            });
        }

        console.log('='.repeat(60) + '\n');
    }

    /**
     * Función auxiliar para esperar
     */
    private esperar(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Obtiene estadísticas del proceso
     */
    getEstadisticas() {
        return { ...this.estadisticas };
    }

    /**
     * Resetea estadísticas
     */
    resetearEstadisticas(): void {
        this.estadisticas = {
            total: 0,
            procesadas: 0,
            exitosas: 0,
            fallidas: 0,
            errores: []
        };
    }
}