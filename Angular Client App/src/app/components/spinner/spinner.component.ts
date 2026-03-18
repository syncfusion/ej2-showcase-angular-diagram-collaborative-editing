import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { SpinnerService } from '../../services/spinner.service';
import { createSpinner, showSpinner, hideSpinner } from '@syncfusion/ej2-popups';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="spinner-overlay" *ngIf="visible">
      <div id="loader" class="spinner-loader">
        <div #spinnerEl id="spinner"></div>
      </div>
    </div>
  `,
  styleUrl: './spinner.component.css',
})
export class SpinnerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('spinnerEl', { static: false }) spinnerEl!: ElementRef;
  visible = true;
  private sub!: Subscription;

  constructor(private spinnerService: SpinnerService) { }

  ngAfterViewInit() {
    try { if (this.spinnerEl?.nativeElement) createSpinner({ target: this.spinnerEl.nativeElement }); } catch { /* ignore */ }
    this.sub = this.spinnerService.visible$.subscribe(v => {
      this.visible = v;
      try {
        const el = this.spinnerEl?.nativeElement;
        if (!el) return;
        if (v) showSpinner(el);
        else hideSpinner(el);
      } catch { /* ignore */ }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}