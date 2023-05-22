import { useEffect, useRef, useState } from "react";
import "./App.css";

const sequenceBuffer = new Array(75).fill(1).map(async (_x, index) => {
  const imageURI = `./horse-thumb-${index + 1}.png`;
  const fetchedImage = await fetch(imageURI);
  if (!fetchedImage.ok) {
    throw Error("Couldn't fetch image");
  }
  const imageBlob = await fetchedImage.blob();
  return new VideoFrame(await createImageBitmap(imageBlob), { timestamp: 0 });
});

function App() {
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    async function paintFrame() {
      if (!canvasRef.current) return;
      const canvasWidth = canvasRef.current?.width;
      const canvasHeight = canvasRef.current?.height;
      const canvasContext = canvasRef.current?.getContext("2d");

      canvasContext?.drawImage(
        await sequenceBuffer[frameIndex],
        0,
        0,
        canvasWidth,
        canvasHeight
      );
    }

    paintFrame();
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
