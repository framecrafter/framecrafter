import { MP4Demuxer } from "./MP4Demuxer";

describe("Demuxer", () => {
  test("should get file info", async () => {
    new MP4Demuxer("http://www.mywebsite.com/horse-in-motion", {
      onConfig: (config) => console.log(config),
      onChunk: (chunk) => console.log("Got chunk", chunk.timestamp),
      setStatus: (type, message) => console.log(type, message),
    });
  });
});
