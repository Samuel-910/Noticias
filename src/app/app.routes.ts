import { Routes } from '@angular/router';
import { NoticiasPortalComponent } from './components/noticias-portal/noticias-portal.component';
import { authRoutes } from './authentication/auth.routes';
import { HistorialComponent } from './components/historial/historial.component';
import { FavoritosComponent } from './components/favoritos/favoritos.component';

export const routes: Routes = [
    { path: '', component: NoticiasPortalComponent },
    { path: 'noticias', component: NoticiasPortalComponent },
    {
        path: 'auth',
        children: [
            ...authRoutes
        ]
    },
    { path: 'historial', component: HistorialComponent },
    { path: 'favoritos', component: FavoritosComponent }
];