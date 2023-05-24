import {
  createFile,
  MP4File,
  MP4VideoTrack,
  MP4ArrayBuffer,
  DataStream,
  MP4VideoData,
  MP4Info,
  MP4Sample,
} from "mp4box";
// Wraps an MP4Box File as a WritableStream underlying sink.
export class MP4FileSink {
  #setStatus: (type: string, message: string) => void | undefined;
  #file: MP4File | undefined;
  #offset = 0;

  constructor(
    file: MP4File,
    setStatus: (type: string, message: string) => void
  ) {
    this.#file = file;
    this.#setStatus = setStatus;
  }

  write(chunk: EncodedVideoChunk) {
    // MP4Box.js requires buffers to be ArrayBuffers, but we have a Uint8Array.
    const buffer = new ArrayBuffer(chunk.byteLength) as MP4ArrayBuffer;
    new Uint8Array(buffer).set(chunk as unknown as ArrayLike<number>);

    // Inform MP4Box where in the file this chunk is from.
    buffer.fileStart = this.#offset;
    this.#offset += buffer.byteLength;

    // Append chunk.
    this.#setStatus("fetch", (this.#offset / 1024 ** 2).toFixed(1) + " MiB");
    if (this.#file) this.#file.appendBuffer(buffer);
  }

  close() {
    this.#setStatus("fetch", "Done");
    if (this.#file) this.#file.flush();
  }
}

// Demuxes the first video track of an MP4 file using MP4Box, calling
// `onConfig()` and `onChunk()` with appropriate WebCodecs objects.
export class MP4Demuxer {
  #onConfig: (config: VideoDecoderConfig) => void | undefined;
  #onChunk: (chunk: EncodedVideoChunk) => void | undefined;
  #setStatus: (type: string, message: string) => void | undefined;
  #file: MP4File | undefined;

  constructor({
    onConfig,
    onChunk,
    setStatus,
  }: {
    onConfig: (config: VideoDecoderConfig) => void;
    onChunk: (chunk: EncodedVideoChunk) => void;
    setStatus: (type: string, message: string) => void;
  }) {
    this.#onConfig = onConfig;
    this.#onChunk = onChunk;
    this.#setStatus = setStatus;

    // Configure an MP4Box File for demuxing.
    this.#file = createFile();
    this.#file.onError = (error) => setStatus("demux", error);
    this.#file.onReady = this.#onReady.bind(this);
    this.#file.onSamples = this.#onSamples.bind(this);
  }

  async initialize(uri: string) {
    if (!this.#file) return;
    // Fetch the file and pipe the data through.
    const fileSink = new MP4FileSink(this.#file, this.#setStatus);
    const fileResponse = await fetch(uri);
    console.log(fileResponse);
    if (fileResponse.body) {
      fileResponse.body.pipeTo(
        new WritableStream(fileSink as unknown as any, { highWaterMark: 3 })
      );
    }
  }

  // Get the appropriate `description` for a specific track. Assumes that the
  // track is H.264 or H.265.
  #description(track: MP4VideoTrack) {
    const trak = this.#file!.getTrackById(track.id);
    for (const entry of trak.mdia.minf.stbl.stsd.entries) {
      if (entry.avcC || entry.hvcC) {
        const stream = new DataStream(undefined, 0, false); // BIG ENDIAN
        if (entry.avcC) {
          entry.avcC.write(stream);
        } else {
          entry.hvcC.write(stream);
        }
        return new Uint8Array(stream.buffer, 8); // Remove the box header.
      }
    }
    throw "avcC or hvcC not found";
  }

  #onReady(info: MP4Info) {
    this.#setStatus("demux", "Ready");
    const track = info.videoTracks[0];

    // Generate and emit an appropriate VideoDecoderConfig.
    this.#onConfig({
      codec: track.codec,
      codedHeight: track.video.height,
      codedWidth: track.video.width,
      description: this.#description(track),
    });

    // Start demuxing.
    if (this.#file) this.#file.setExtractionOptions(track.id);
    if (this.#file) this.#file.start();
  }

  #onSamples(
    track_id: MP4VideoTrack["id"],
    ref: unknown,
    samples: MP4Sample[]
  ) {
    // Generate and emit an EncodedVideoChunk for each demuxed sample.
    for (const sample of samples) {
      this.#onChunk(
        new EncodedVideoChunk({
          type: sample.is_sync ? "key" : "delta",
          timestamp: (1e6 * sample.cts) / sample.timescale,
          duration: (1e6 * sample.duration) / sample.timescale,
          data: sample.data,
        })
      );
    }
  }
}
