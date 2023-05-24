import { readFile } from "fs/promises";
import { resolve } from "path";

function toArrayBuffer(buffer: Buffer) {
  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buffer.length; ++i) view[i] = buffer[i];

  return arrayBuffer;
}
class ResponseFake {
  constructor(public buffer: Buffer) {}

  async json() {
    return JSON.parse(this.buffer.toString());
  }
  async text() {
    return this.buffer.toString();
  }
  async arrayBuffer() {
    return toArrayBuffer(this.buffer);
  }
}

export async function mockFetch(url: string) {
  if (url.includes("://")) return fetch(url);

  const buffer = await readFile(resolve(__dirname, url));
  return new ResponseFake(buffer);
}
