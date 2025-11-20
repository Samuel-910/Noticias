
export interface Noticia {
    id_noticia: number;
    nombre_fuente: string;
    url_fuente: string;
    fecha_publicacion: string;
    fecha_scraping: string;
    periodo_inicio: number;
    periodo_mes: number;
    periodo_semana: number;
    imagen_url: string;
    imagen_path: string;
    pais: string;
    region: string;
    ciudad: string;
    ubicacion_mencionada: string;
    categoria: string;
    entidades_mencionadas: string;
    titulo: string;
    contenido: string;
    language: string;
    tipo_noticia: string;
    fecha_registro: string;
    vistas?: number;
    resumen?: string;
    cargandoResumen?: boolean;
    mostrarResumen?: boolean;
}

export interface FiltrosNoticia {
    busqueda: string;
    categoria: string;
    pais: string;
    region: string;
    ciudad: string;
    tipoNoticia: string;
    idioma: string;
    fuente: string;
    fechaInicio: string;
    fechaFin: string;
    rangoTiempo: string;
}

export interface OrdenamientoNoticia {
    campo: keyof Noticia;
    direccion: 'asc' | 'desc';
}

export interface RangoTiempo {
    valor: string;
    etiqueta: string;
}

export const RANGOS_TIEMPO: RangoTiempo[] = [
    { valor: '', etiqueta: 'Todo el tiempo' },
    { valor: 'ultima-hora', etiqueta: 'Última hora' },
    { valor: 'ultimas-3-horas', etiqueta: 'Últimas 3 horas' },
    { valor: 'hoy', etiqueta: 'Hoy' },
    { valor: 'ayer', etiqueta: 'Ayer' },
    { valor: 'ultimos-7-dias', etiqueta: 'Últimos 7 días' },
    { valor: 'este-mes', etiqueta: 'Este mes' }
];