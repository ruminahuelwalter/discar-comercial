import { Component, NgModule } from '@angular/core';
import * as Papa from 'papaparse';
import { FormsModule } from '@angular/forms';
import {MatDividerModule} from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'app-convertir-cvs-texto',
  standalone: true,
  imports: [MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    FormsModule,
    MatTableModule,
    NgIf,
    NgFor,
    MatInputModule,
    MatDividerModule,
    MatIconModule
  ],
  templateUrl: './convertir-cvs-texto.component.html',
  styleUrl: './convertir-cvs-texto.component.css'
})
export class ConvertirCvsTextoComponent {
  rows: any[] = [];
  headers: string[] = [];
  outputFileName = 'salida';
  previewLimit = 5;
  fileName: string = '';

  previewData: any[] = [];
  discarData: string | null = null;

  displayedColumns: string[] = [
  'folio', 'nombre', 'direccion', 'socio', 'sum', 'medidor', 'latitud', 'longitud'
];

  // Nombres reales de columnas
  colNumeroDeSerie = 'NumeroDeSerie';
  colActivaT0Final = 'ActivaT0Final';
  colFechaHoraFinal = 'FechaHoraFinal'; // ÚLTIMA COLUMNA (debe quedar sin hora)

  suggestFileName(originalName: string) {
    const base = originalName.split('.')[0];
    this.fileName = `${base}_${new Date().toISOString().slice(0,10)}.txt`;
    return this.fileName;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.outputFileName = this.suggestFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        this.rows = results.data as any[];

        // Normalizar todas las fechas por fila
        this.rows = this.rows.map(row => this.procesarFechasFila(row));

        if (this.rows.length > 0) {
          this.headers = Object.keys(this.rows[0]);
        }
        this.previewData = results.data.slice(0,5)
        this.discarData = results.data.toString()
        console.log(this.previewData)
        this.applyFormulas();
      },
      error: (err) => {
        console.error('Error leyendo CSV:', err);
        alert('Error al leer el archivo CSV. Ver consola.');
      }
    });
  }

 // Procesar filas: normaliza columnas de fecha EXCEPTO la columna fuente final
procesarFechasFila(row: any): any {
  const newRow = { ...row };

  // detectar posibles columnas de fecha
  const columnasFecha = Object.keys(newRow).filter(k =>
    /fecha|hora/i.test(k) || /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(String(newRow[k]))
  );

  columnasFecha.forEach(col => {
    // OMITIR la columna fuente que se usa para crear la Fecha final
    if (col === this.colFechaHoraFinal) return;

    if (!newRow[col]) return;
    newRow[col] = this.normalizarFechaCompleta(newRow[col]);
  });

  return newRow;
}

// Normaliza columnas donde quieres fecha+hora (formato D/M/YYYY HH:MM)
// Acepta entrada ISO, dd/mm/yyyy hh:mm(:ss) o Date object
normalizarFechaCompleta(valor: any): string {
  if (valor === null || valor === undefined) return '';

  // Si ya es Date
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    const dd = Number(valor.getDate()).toString();
    const mm = Number(valor.getMonth() + 1).toString();
    const yyyy = valor.getFullYear();
    const hh = String(valor.getHours()).padStart(2, '0');
    const min = String(valor.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }

  const s = String(valor).trim();

  // Si viene en formato dd/mm/yy hh:mm(:ss)?
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m) {
    let [, d, mth, y, hh, mm] = m;
    if (y.length === 2) y = '20' + y;
    const dia = Number(d).toString();
    const mes = Number(mth).toString();
    hh = hh.padStart(2, '0');
    mm = mm.padStart(2, '0');
    return `${dia}/${mes}/${y} ${hh}:${mm}`;
  }

  // Si viene solo fecha dd/mm/yyyy → devolver fecha + "00:00"
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m2) {
    let [, d, mth, y] = m2;
    if (y.length === 2) y = '20' + y;
    return `${Number(d)}/${Number(mth)}/${y} 00:00`;
  }

  // Intentar parse ISO (yyyy-mm-dd or yyyy-mm-ddTHH:MM:SS)
  const iso = new Date(s.replace(' ', 'T'));
  if (!isNaN(iso.getTime())) {
    const dia = Number(iso.getDate()).toString();
    const mes = Number(iso.getMonth() + 1).toString();
    const yyyy = iso.getFullYear();
    const hh = String(iso.getHours()).padStart(2, '0');
    const min = String(iso.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${yyyy} ${hh}:${min}`;
  }

  // fallback: devolver original
  return s;
}

// Normaliza y devuelve SOLO la fecha en formato D/M/YYYY (sin hora)
// Acepta entrada que tenga hora (la ignora), o ISO, o Date.
normalizarSoloFecha(valor: any): string {
  if (valor === null || valor === undefined) return '';

  // Si ya es Date
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return `${Number(valor.getDate())}/${Number(valor.getMonth() + 1)}/${valor.getFullYear()}`;
  }

  const s = String(valor).trim();

  // Si viene "dd/mm/yyyy hh:mm" o "dd/mm/yy hh:mm" -> tomar primera parte antes del espacio
  const [parteFecha] = s.split(/\s+/); // si no hay hora, devuelve todo

  const m = parteFecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let [, d, mth, y] = m;
    if (y.length === 2) y = '20' + y;
    return `${Number(d)}/${Number(mth)}/${y}`;
  }

  // Si viene ISO 'yyyy-mm-dd' o 'yyyy-mm-ddTHH:MM:SS'
  const iso = new Date(s.replace(' ', 'T'));
  if (!isNaN(iso.getTime())) {
    return `${Number(iso.getDate())}/${Number(iso.getMonth() + 1)}/${iso.getFullYear()}`;
  }

  // fallback: devolver original (pero sin hora si había)
  return parteFecha;
}

  // -------------------- FORMULAS -------------------------

  getMdd(row: any): string {
    const serie = (row[this.colNumeroDeSerie] ?? '').toString();
    const ultimos8 = serie.slice(-8);
    return ultimos8.padStart(11, '0');
  }

  getKwh(row: any): string {
    const raw = row[this.colActivaT0Final];
    const num = Number(String(raw).replace(/[^0-9.-]+/g, ''));
    if (isNaN(num)) return '';
    return String(num / 1000);
  }

  applyFormulas() {
    if (!this.rows || this.rows.length === 0) return;

    const newRows = this.rows.map(r => ({ ...r }));

    newRows.forEach(r => {
      r['Mdd'] = this.getMdd(r);
      r['KWh'] = this.getKwh(r);

      // 🔥 Última columna de fecha **solo fecha**
      r['Fecha'] = this.normalizarSoloFecha(r[this.colFechaHoraFinal]);
    });

    this.rows = newRows;
    this.headers = [...new Set([...this.headers, 'Mdd', 'KWh', 'Fecha'])];
  }

  // ------------------ EXPORTAR TXT ---------------------

  generateTxt() {
    if (!this.rows || this.rows.length === 0) {/*  */
      alert('No hay datos para exportar. Cargá un CSV primero.');
      return;
    }

    const orderedHeaders = this.getOrderedHeaders();
    const headerLine = orderedHeaders.join('\t');

    const lines = this.rows.map(r =>
      orderedHeaders.map(h =>
        String(r[h] ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ')
      ).join('\t')
    );

    const txtContent = [headerLine, ...lines].join('\n');
    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = this.outputFileName + '.txt';
    a.click();

    URL.revokeObjectURL(url);
  }

  getOrderedHeaders(): string[] {
    let original = this.headers.filter(h => !['Mdd', 'KWh', 'Fecha'].includes(h));

    return [...original, 'Mdd', 'KWh', 'Fecha'];
  }

  get previewRows() {
    return this.rows.slice(0, this.previewLimit);
  }

  clearData() {
    this.discarData = null;
    this.previewData = [];
    this.rows =[]
    console.log('ClearData')
    console.log(this.discarData)
    console.log(this.previewData)
  }

}
