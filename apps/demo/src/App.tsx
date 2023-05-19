import { useEffect, useRef, useState } from "react";
import "./App.css";

const sequenceBuffer = new Array(75)
  .fill(1)
  .map((_x, index) => `./horse-thumb-${index + 1}.png`);

function App() {
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvasWidth = canvasRef.current?.width;
    const canvasHeight = canvasRef.current?.height;
    const canvasContext = canvasRef.current?.getContext("2d");
    const image = new Image();
    image.src = sequenceBuffer[frameIndex];
    image.onload = () =>
      canvasContext?.drawImage(image, 0, 0, canvasWidth, canvasHeight);
  }, [frameIndex]);

  useEffect(() => {
    let interval: NodeJS.Timer | null = null;
    if (playing) {
      interval = setInterval(() => {
        setFrameIndex((x) => Math.min(x + 1, sequenceBuffer.length - 1));
      }, 83.3333333);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  });

  return (
    <>
      <canvas className="aspect-video w-full bg-slate-500" ref={canvasRef}>
        Framecrafter
      </canvas>
      <div className="mt-6 flex items-center justify-center space-x-3">
        <button
          className="rounded bg-slate-600 px-6  py-3 text-white"
          onClick={() => setFrameIndex(0)}
        >
          Seek Start
        </button>
        <button
          className="rounded bg-slate-600 px-6  py-3 text-white"
          onClick={() => setPlaying((x) => !x)}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button
          className="rounded bg-slate-600 px-6  py-3 text-white"
          onClick={() => setFrameIndex(Math.max(0, sequenceBuffer.length - 1))}
        >
          Seek End
        </button>
      </div>
    </>
  );
}

export default App;
