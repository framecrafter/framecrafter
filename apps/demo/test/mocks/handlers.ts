// src/mocks/handlers.js
import { rest } from "msw";

export const handlers = [
  rest.get("http://www.mywebsite.com/horse-in-motion", (req, res, ctx) => {
    return res(
      // Respond with a 200 status code
      ctx.status(200)
    );
  }),
];

// function toArrayBuffer(buffer: Buffer) {
//   const arrayBuffer = new ArrayBuffer(buffer.length);
//   const view = new Uint8Array(arrayBuffer);
//   for (let i = 0; i < buffer.length; ++i) view[i] = buffer[i];

//   return arrayBuffer;
// }
// class ResponseFake {
//   constructor(public buffer: Buffer) {}

//   async json() {
//     return JSON.parse(this.buffer.toString());
//   }
//   async text() {
//     return this.buffer.toString();
//   }
//   async arrayBuffer() {
//     return toArrayBuffer(this.buffer);
//   }
// }

// export async function fileFetch(path: string) {
//   const buffer = await readFile(resolve(__dirname, path));
//   return new ResponseFake(buffer);
// }
