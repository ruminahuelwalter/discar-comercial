import { Component, ViewChild, ElementRef } from '@angular/core';
import * as Papa from 'papaparse';
import { FormsModule } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { NgIf, NgFor } from '@angular/common';

@Component({
  selector: 'app-discar-comercial',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    FormsModule,
    MatTableModule,
    NgIf,
    NgFor,
    MatInputModule,
    MatDividerModule,
    MatIconModule,
    MatTableModule
  ],
  templateUrl: './discar-comercial.component.html',
  styleUrl: './discar-comercial.component.css'
})
export class DiscarComercialComponent {

  @ViewChild('fileInput', { static: false })
  fileInput!: ElementRef<HTMLInputElement>;

  // ---------------------------
  // VARIABLES PRINCIPALES
  // ---------------------------

  rows: any[] = [];
  headers: string[] = [];
  previewLimit = 10;
  previewData: any[] = [];
  discarData: string | null = null;
  isData: boolean = false
  outputFileName = 'salida';
  fileName = '';

  grupo: string = ''
  // Columnas importantes
  colNumeroDeSerie = 'NumeroDeSerie';
  colActivaT0Final = 'ActivaT0Final';
  colFechaHoraFinal = 'FechaHoraFinal';

  visibleColumns: string[] = [
  'NumeroDeSerie',
  'Contrato',
  'Titular',
  'FechaHoraFinal',
  'ActivaT0Final',
  'Mdd',
  'KWh',
  'Fecha'
  ];
  


  onFileSelected(event: Event) {
    

    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.outputFileName = this.suggestFileName(file.name);
    this.isData = true;
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      worker: true,      // 🔥 Máximo rendimiento
      complete: (results) => {
        this.rows = results.data as any[];
    
        // Normalizar fechas
        this.rows = this.rows.map(row => this.procesarFechasFila(row));

        if (this.rows.length > 0) {
          this.headers = Object.keys(this.rows[0]);

          this.grupo = this.rows[0]['grupo'] ?? this.rows[0]['Grupo'] ?? '';
          if (this.grupo) {
            this.outputFileName = `ruta-${this.grupo}`;
          }
        }

        this.previewData = this.rows.slice(0, 5);
        this.applyFormulas();
      },
      error: (err) => {
        console.error('Error leyendo CSV:', err);
        alert('Error al leer el archivo CSV.');
      }
    });

  }

  suggestFileName(originalName: string) {
    const base = originalName.split('.')[0];
    this.fileName = `${base}_${new Date().toISOString().slice(0, 10)}.txt`;
    return this.fileName;
  }

  // ---------------------------------------------------
  // Normalización de fechas
  // ---------------------------------------------------

  procesarFechasFila(row: any): any {
    const newRow = { ...row };

    const columnasFecha = Object.keys(newRow).filter(k =>
      /fecha|hora/i.test(k) ||
      /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(String(newRow[k]))
    );

    columnasFecha.forEach(col => {
      if (col === this.colFechaHoraFinal) return;
      if (!newRow[col]) return;
      newRow[col] = this.normalizarFechaCompleta(newRow[col]);
    });

    return newRow;
  }

  normalizarFechaCompleta(valor: any): string {
    if (valor === null || valor === undefined) return '';
    const s = String(valor).trim();

    // dd/mm/yyyy hh:mm
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})/);
    if (m) {
      let [, d, mth, y, hh, mm] = m;
      if (y.length === 2) y = '20' + y;
      return `${+d}/${+mth}/${y} ${hh.padStart(2, '0')}:${mm}`;
    }

    // dd/mm/yyyy sin hora → 00:00
    const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m2) {
      let [, d, mth, y] = m2;
      if (y.length === 2) y = '20' + y;
      return `${+d}/${+mth}/${y} 00:00`;
    }

    // ISO → convertir
    const iso = new Date(s.replace(' ', 'T'));
    if (!isNaN(iso.getTime())) {
      const dd = iso.getDate();
      const mm = iso.getMonth() + 1;
      const yyyy = iso.getFullYear();
      const hh = String(iso.getHours()).padStart(2, '0');
      const min = String(iso.getMinutes()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
    }

    return s; // fallback
  }

  normalizarSoloFecha(valor: any): string {
    if (!valor) return '';
    const s = String(valor).trim();
    const [fecha] = s.split(/\s+/);

    const m = fecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
      let [, d, mth, y] = m;
      if (y.length === 2) y = '20' + y;
      return `${+d}/${+mth}/${y}`;
    }

    const iso = new Date(s.replace(' ', 'T'));
    if (!isNaN(iso.getTime())) {
      return `${iso.getDate()}/${iso.getMonth() + 1}/${iso.getFullYear()}`;
    }

    return fecha;
  }

  // ---------------------------------------------------
  // Fórmulas
  // ---------------------------------------------------

  getMdd(row: any): string {
    const serie = (row[this.colNumeroDeSerie] ?? '').toString();
    return serie.slice(-8).padStart(11, '0');
  }

  getKwh(row: any): string {
    const raw = row[this.colActivaT0Final];
    const num = Number(String(raw).replace(/[^0-9.-]+/g, ''));
    return isNaN(num) ? '' : String(num / 1000);
  }

  applyFormulas() {
    this.rows = this.rows.map(r => ({
      ...r,
      Mdd: this.getMdd(r),
      KWh: this.getKwh(r),
      Fecha: this.normalizarSoloFecha(r[this.colFechaHoraFinal])
    }));

    this.headers = [...new Set([...this.headers, 'Mdd', 'KWh', 'Fecha'])];
  }

  // ---------------------------------------------------
  // Exportar TXT
  // ---------------------------------------------------

  generateTxt() {
    if (!this.rows.length) {
      alert('No hay datos para exportar');
      return;
    }

    // 🟢 AGREGADO: renombrar en el momento antes de descargar
    if (this.grupo) {
      
      this.outputFileName = `ruta-${this.grupo}`;
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
    const original = this.headers.filter(h => !['Mdd', 'KWh', 'Fecha'].includes(h));
    return [...original, 'Mdd', 'KWh', 'Fecha'];
  }

  get previewRows() {
    return this.rows.slice(0, this.previewLimit);
  }

  // ---------------------------------------------------
  // Borrar datos y resetear input file
  // ---------------------------------------------------

  clearData() {
    this.discarData = null;
    this.previewData = [];
    this.rows = [];
    this.headers = [];
    this.fileName = '';
    this.outputFileName = 'salida';
    this.isData = false;

    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }
}
