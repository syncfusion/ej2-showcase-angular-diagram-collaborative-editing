import { Component } from '@angular/core';

@Component({
  selector: 'app-bottom-banner',
  templateUrl: './banner.component.html',
  styleUrls: ['./banner.component.css']
})
export class BannerComponent {
  trialUrl: string = 'https://www.syncfusion.com/account/manage-trials/downloads';
  demoUrl: string = 'https://www.syncfusion.com/request-demo?tag=es-freetools-diagram-collaboration-sample-ft';

  openUrl(url: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}