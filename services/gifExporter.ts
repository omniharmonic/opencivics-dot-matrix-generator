import GIF from 'gif.js';
import { type Settings, type Point, type Line, type ExportOptions } from '../types';
import { generateGridPoints, generateArt } from './artGenerator';

export class GifExporter {
  private gif: GIF | null = null;
  private canvasSize: number;

  constructor(canvasSize: number = 1000) {
    this.canvasSize = canvasSize;
  }

  async exportAnimation(
    settingsFrames: Settings[],
    options: ExportOptions,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.gif = new GIF({
        workers: 2,
        quality: 10 - Math.floor(options.quality * 9), // gif.js uses inverted quality (10 = lowest)
        width: options.width,
        height: options.height,
        transparent: options.withAlpha ? 0x00FFFFFF : null,
        background: options.withAlpha ? null : '#FFFFFF',
      });

      this.gif.on('progress', (progress: number) => {
        onProgress?.(progress);
      });

      this.gif.on('finished', (blob: Blob) => {
        resolve(blob);
      });

      this.gif.on('error', (error: Error) => {
        reject(error);
      });

      this.addFramesToGif(settingsFrames, options)
        .then(() => {
          this.gif!.render();
        })
        .catch(reject);
    });
  }

  private async addFramesToGif(
    settingsFrames: Settings[],
    options: ExportOptions
  ): Promise<void> {
    const frameDuration = 1000 / options.fps; // Duration per frame in milliseconds

    for (let i = 0; i < settingsFrames.length; i++) {
      const settings = settingsFrames[i];
      const canvas = await this.renderFrame(settings, options);

      this.gif!.addFrame(canvas, {
        delay: frameDuration,
        copy: true,
      });
    }
  }

  private async renderFrame(
    settings: Settings,
    options: ExportOptions
  ): Promise<HTMLCanvasElement> {
    // Generate the art for this frame
    const points = generateGridPoints(
      this.canvasSize / 2,
      this.canvasSize / 2,
      settings.ringCount,
      settings.symmetrySides,
      settings.chaos,
      settings.seed
    );

    const lines = generateArt(points, settings);

    // Create SVG
    const svg = this.createSvgFromArt(points, lines, settings);

    // Convert SVG to canvas
    return this.svgToCanvas(svg, options);
  }

  private createSvgFromArt(
    points: Point[],
    lines: Line[],
    settings: Settings
  ): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', this.canvasSize.toString());
    svg.setAttribute('height', this.canvasSize.toString());
    svg.setAttribute('viewBox', `0 0 ${this.canvasSize} ${this.canvasSize}`);

    // Add background (white or transparent)
    const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.setAttribute('width', '100%');
    background.setAttribute('height', '100%');
    background.setAttribute('fill', 'white');
    svg.appendChild(background);

    // Create points map for quick lookup
    const pointsById = new Map(points.map(p => [p.id, p]));

    // Add lines
    lines.forEach(([id1, id2], index) => {
      const p1 = pointsById.get(id1);
      const p2 = pointsById.get(id2);
      if (!p1 || !p2) return;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = this.getCurvePath(p1, p2, settings.curvature);
      path.setAttribute('d', d);
      path.setAttribute('stroke', 'black');
      path.setAttribute('stroke-width', settings.lineWidth.toString());
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('fill', 'none');
      svg.appendChild(path);
    });

    // Add dots
    if (settings.dotSize > 0) {
      points.forEach(point => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', point.x.toString());
        circle.setAttribute('cy', point.y.toString());
        circle.setAttribute('r', settings.dotSize.toString());
        circle.setAttribute('fill', 'black');
        svg.appendChild(circle);
      });
    }

    return svg;
  }

  private getCurvePath(p1: Point, p2: Point, curvature: number): string {
    if (curvature === 0) {
      return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
    }

    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;

    // Perpendicular vector
    const normalX = -dy / len;
    const normalY = dx / len;

    const controlPointOffset = len * curvature * 0.5;

    const controlX = midX + normalX * controlPointOffset;
    const controlY = midY + normalY * controlPointOffset;

    return `M ${p1.x},${p1.y} Q ${controlX},${controlY} ${p2.x},${p2.y}`;
  }

  private async svgToCanvas(
    svg: SVGSVGElement,
    options: ExportOptions
  ): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = options.width;
        canvas.height = options.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        if (!options.withAlpha) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, options.width, options.height);
        }

        const scale = Math.min(options.width / this.canvasSize, options.height / this.canvasSize);
        const scaledWidth = this.canvasSize * scale;
        const scaledHeight = this.canvasSize * scale;
        const offsetX = (options.width - scaledWidth) / 2;
        const offsetY = (options.height - scaledHeight) / 2;

        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
        resolve(canvas);
      };

      img.onerror = () => {
        reject(new Error('Failed to load SVG image'));
      };

      img.src = svgUrl;
    });
  }

  downloadGif(blob: Blob, filename: string = `animation-${Date.now()}.gif`): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  abort(): void {
    if (this.gif) {
      this.gif.abort();
      this.gif = null;
    }
  }
}