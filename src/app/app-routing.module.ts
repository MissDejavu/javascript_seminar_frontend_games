import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LandingComponent,HomeComponent,LoginComponent,RegisterComponent } from './components';
import { AuthGuard } from './utils';

const routes: Routes = [
    { path: '', component: HomeComponent, canActivate: [AuthGuard] },
    { path: 'about', component: LandingComponent},
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent},

    // otherwise redirect to home
    { path: '**', redirectTo: '' }
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
