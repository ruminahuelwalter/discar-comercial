import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConvertirCvsTextoComponent } from "./components/convertir-cvs-texto/convertir-cvs-texto.component";
import { DiscarComercialComponent } from './components/discar-comercial/discar-comercial.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ DiscarComercialComponent ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'discar-comercial';
}
