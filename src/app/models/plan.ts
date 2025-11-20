interface Plan {
    id: string;
    nombre: string;
    precio: number;
    periodo: string;
    descripcion: string;
    caracteristicas: string[];
    destacado: boolean;
    color: string;
    ahorro?: string;
}