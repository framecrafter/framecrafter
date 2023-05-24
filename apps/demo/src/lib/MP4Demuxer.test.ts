import { MP4Demuxer } from "./MP4Demuxer";

describe("Demuxer", () => {
  test("should get file info", async () => {
    console.log("hello from browser");
    // const demuxer = new MP4Demuxer({
    //   onConfig: (config) => console.log(config),
    //   onChunk: (chunk) => console.log("Got chunk", chunk.timestamp),
    //   setStatus: (type, message) => console.log(type, message),
    // });

    // await demuxer.initialize("http://www.mywebsite.com/horse-in-motion");
  });
});
