// src/mocks/handlers.js
import { rest } from "msw";
import { readFile } from "fs/promises";
import { resolve } from "path";

export const handlers = [
  rest.get(
    "http://www.mywebsite.com/horse-in-motion",
    async (req, res, ctx) => {
      // Read the image from the file system using the "fs" module.
      const videoBuffer = await readFile(
        resolve(__dirname, "../../public/horse-in-motion.mp4")
      );

      return res(
        ctx.set("Content-Length", videoBuffer.byteLength.toString()),
        ctx.set("Content-Type", "video/mp4"),
        // Respond with the "ArrayBuffer".
        ctx.body(videoBuffer)
      );
    }
  ),
];
