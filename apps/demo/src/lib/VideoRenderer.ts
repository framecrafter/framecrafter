/// <reference types="dom-webcodecs" />

export class VideoRenderer {
  frameBuffer: VideoFrame[] = [];
  fillInProgress = false;
  canvas!: HTMLCanvasElement;
  canvasCtx: CanvasRenderingContext2D | null = null;
  decoder!: VideoDecoder;

  async initialize(canvas: HTMLCanvasElement) {
    this.frameBuffer = [];
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext("2d");

    this.decoder = new VideoDecoder({
      output: (frame) => this.bufferFrame(frame),
      error: (e) => console.error(e),
    });
  }

  bufferFrame(frame: VideoFrame) {
    this.frameBuffer.push(frame);
  }
}
