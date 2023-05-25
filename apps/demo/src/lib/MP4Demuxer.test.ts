import { MP4Demuxer } from "./MP4Demuxer";

describe("Demuxer", () => {
  it("should get file info", async () => {
    new MP4Demuxer("/horse-in-motion.mp4", {
      onConfig: (config) => console.log(config),
      onChunk: (chunk) => console.log("Got chunk", chunk.timestamp),
      setStatus: (type, message) => console.log(type, message),
    });
  });
});
