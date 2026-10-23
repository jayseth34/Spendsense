import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import { Chart, ChartDataset, ChartType, registerables } from 'chart.js';
import { formatInr } from '../core/ui';

Chart.register(...registerables);

/** Thin Chart.js wrapper. Colours follow the app's CSS tokens so charts work in light and dark mode. */
@Component({
  selector: 'app-chart',
  template: `<div class="chart-box" [style.height.px]="height"><canvas #canvas></canvas></div>`,
  styles: [`.chart-box { position: relative; width: 100%; }`],
})
export class ChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() type: ChartType = 'bar';
  @Input() labels: string[] = [];
  @Input() datasets: ChartDataset[] = [];
  @Input() height = 220;
  @Input() legend = false;
  @Input() stacked = false;

  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  private chart?: Chart;
  private renderedType?: ChartType;
  private mq = window.matchMedia('(prefers-color-scheme: dark)');
  private onScheme = () => this.render();

  ngAfterViewInit(): void {
    this.mq.addEventListener?.('change', this.onScheme);
    this.render();
  }

  ngOnChanges(): void {
    if (!this.canvas) return;
    if (this.chart && this.renderedType === this.type) {
      this.chart.data.labels = this.labels;
      this.chart.data.datasets = this.datasets as any;
      this.chart.update();
    } else {
      this.render();
    }
  }

  ngOnDestroy(): void {
    this.mq.removeEventListener?.('change', this.onScheme);
    this.chart?.destroy();
  }

  private render(): void {
    this.chart?.destroy();
    const css = getComputedStyle(document.documentElement);
    const text = css.getPropertyValue('--text-2').trim() || '#64748b';
    const grid = css.getPropertyValue('--line').trim() || '#e2e8f0';
    const round = this.type === 'doughnut' || this.type === 'pie';
    this.renderedType = this.type;

    this.chart = new Chart(this.canvas.nativeElement, {
      type: this.type,
      data: { labels: this.labels, datasets: this.datasets as any },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250 },
        cutout: this.type === 'doughnut' ? '68%' : undefined,
        plugins: {
          legend: { display: this.legend, position: 'bottom', labels: { color: text, boxWidth: 10, boxHeight: 10, usePointStyle: true } },
          tooltip: {
            callbacks: {
              label: (ctx: any) => {
                const v = (round ? ctx.parsed : ctx.parsed.y) as number;
                const name = round ? ctx.label : ctx.dataset.label;
                return `${name ? name + ': ' : ''}${formatInr(v, true)}`;
              },
            },
          },
        },
        scales: round ? {} : {
          x: { stacked: this.stacked, grid: { display: false }, ticks: { color: text, maxRotation: 0, autoSkipPadding: 8 }, border: { color: grid } },
          y: {
            stacked: this.stacked, beginAtZero: true, grid: { color: grid }, border: { display: false },
            ticks: { color: text, maxTicksLimit: 5, callback: (v: any) => compactInr(Number(v)) },
          },
        },
      } as any,
    });
  }
}

function compactInr(v: number): string {
  if (v >= 1e7) return `₹${+(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${+(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `₹${+(v / 1e3).toFixed(1)}k`;
  return `₹${v}`;
}
