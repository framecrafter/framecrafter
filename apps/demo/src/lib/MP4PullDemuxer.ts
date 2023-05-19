import {
  PullDemuxerBase,
  AUDIO_STREAM_TYPE,
  StreamType,
} from "./PullDemuxerBase";
import * as MP4Box from "mp4box";

const ENABLE_DEBUG_LOGGING = false;

function debugLog(msg: any) {
  if (!ENABLE_DEBUG_LOGGING) {
    return;
  }
  console.debug(msg);
}

// Wrapper around MP4Box.js that shims pull-based demuxing on top their
// push-based API.
export class MP4PullDemuxer extends PullDemuxerBase {
  source: MP4Source | undefined;
  streamType: StreamType = 0;
  audioTrack: MP4Box.MP4AudioTrack | undefined;
  videoTrack: MP4Box.MP4VideoTrack | undefined;

  constructor(public fileUri: string) {
    super();
    this.fileUri = fileUri;
  }

  async initialize(streamType: StreamType) {
    this.source = new MP4Source(this.fileUri);
    this.readySamples = [];
    this._pending_read_resolver = null;
    this.streamType = streamType;

    await this._tracksReady();

    if (this.streamType == AUDIO_STREAM_TYPE) {
      this._selectTrack(this.audioTrack);
    } else {
      this._selectTrack(this.videoTrack);
    }
  }

  getDecoderConfig() {
    if (this.streamType == AUDIO_STREAM_TYPE) {
      if (this.audioTrack && this.source)
        return {
          codec: this.audioTrack.codec,
          sampleRate: this.audioTrack.audio.sample_rate,
          numberOfChannels: this.audioTrack.audio.channel_count,
          description: this.source.getAudioSpecificConfig(),
        };
    } else {
      if (this.videoTrack && this.source)
        return {
          codec: this.videoTrack.codec,
          displayWidth: this.videoTrack.track_width,
          displayHeight: this.videoTrack.track_height,
          description: this._getAvcDescription(this.source.getAvccBox()),
        };
    }
  }

  async getNextChunk() {
    let sample = await this._readSample();
    const type = sample.is_sync ? "key" : "delta";
    const pts_us = (sample.cts * 1000000) / sample.timescale;
    const duration_us = (sample.duration * 1000000) / sample.timescale;
    const EncodedChunk =
      this.streamType == AUDIO_STREAM_TYPE
        ? EncodedAudioChunk
        : EncodedVideoChunk;
    return new EncodedChunk({
      type: type,
      timestamp: pts_us,
      duration: duration_us,
      data: sample.data,
    });
  }

  _getAvcDescription(avccBox) {
    const stream = new DataStream(undefined, 0, DataStream.BIG_ENDIAN);
    avccBox.write(stream);
    return new Uint8Array(stream.buffer, 8); // Remove the box header.
  }

  async _tracksReady() {
    if (!this.source) return;
    let info = await this.source.getInfo();
    this.videoTrack = info.videoTracks[0];
    this.audioTrack = info.audioTracks[0];
  }

  _selectTrack(track) {
    console.assert(!this.selectedTrack, "changing tracks is not implemented");
    this.selectedTrack = track;
    this.source.selectTrack(track);
  }

  async _readSample() {
    console.assert(this.selectedTrack);
    console.assert(!this._pending_read_resolver);

    if (this.readySamples.length) {
      return Promise.resolve(this.readySamples.shift());
    }

    let promise = new Promise((resolver) => {
      this._pending_read_resolver = resolver;
    });
    console.assert(this._pending_read_resolver);
    this.source.start(this._onSamples.bind(this));
    return promise;
  }

  _onSamples(samples) {
    const SAMPLE_BUFFER_TARGET_SIZE = 50;

    this.readySamples.push(...samples);
    if (this.readySamples.length >= SAMPLE_BUFFER_TARGET_SIZE)
      this.source.stop();

    let firstSampleTime = (samples[0].cts * 1000000) / samples[0].timescale;
    debugLog(
      `adding new ${samples.length} samples (first = ${firstSampleTime}). total = ${this.readySamples.length}`
    );

    if (this._pending_read_resolver) {
      this._pending_read_resolver(this.readySamples.shift());
      this._pending_read_resolver = null;
    }
  }
}

class MP4Source {
  file: MP4Box.MP4File | undefined;
  constructor(uri: string) {
    this.file = MP4Box.createFile();
    this.file.onError = console.error.bind(console);
    this.file.onReady = this.onReady.bind(this);
    this.file.onSamples = this.onSamples.bind(this);

    debugLog("fetching file");
    fetch(uri).then(async (response) => {
      debugLog("fetch responded");
      if (!response.body) return;
      const reader = response.body.getReader();
      let offset = 0;
      let mp4File = this.file;

      function appendBuffers({
        done,
        value,
      }: ReadableStreamReadResult<Uint8Array>) {
        if (!mp4File) return;
        if (done) {
          mp4File.flush();
          return;
        }
        let buf = value.buffer as MP4Box.MP4ArrayBuffer;
        buf.fileStart = offset;

        offset += buf.byteLength;

        mp4File.appendBuffer(buf);

        return reader.read().then(appendBuffers);
      }

      const result_2 = await reader.read();
      return appendBuffers(result_2);
    });

    this.info = null;
    this._info_resolver = null;
  }

  onReady(info) {
    // TODO: Generate configuration changes.
    this.info = info;

    if (this._info_resolver) {
      this._info_resolver(info);
      this._info_resolver = null;
    }
  }

  getInfo() {
    if (this.info) return Promise.resolve(this.info);

    return new Promise((resolver) => {
      this._info_resolver = resolver;
    });
  }

  getAvccBox() {
    // TODO: make sure this is coming from the right track.
    if (!this.file) return;
    return this.file.moov.traks[0].mdia.minf.stbl.stsd.entries[0].avcC;
  }

  getAudioSpecificConfig() {
    // TODO: make sure this is coming from the right track.
    if (!this.file) return;
    // 0x04 is the DecoderConfigDescrTag. Assuming MP4Box always puts this at position 0.

    console.assert(
      this.file.moov.traks[0].mdia.minf.stbl.stsd.entries[0].esds.esd.descs[0]
        .tag == 0x04
    );
    // 0x40 is the Audio OTI, per table 5 of ISO 14496-1
    console.assert(
      this.file.moov.traks[0].mdia.minf.stbl.stsd.entries[0].esds.esd.descs[0]
        .oti == 0x40
    );
    // 0x05 is the DecSpecificInfoTag
    console.assert(
      this.file.moov.traks[0].mdia.minf.stbl.stsd.entries[0].esds.esd.descs[0]
        .descs[0].tag == 0x05
    );

    return this.file.moov.traks[0].mdia.minf.stbl.stsd.entries[0].esds.esd
      .descs[0].descs[0].data;
  }

  selectTrack(track) {
    debugLog("selecting track %d", track.id);
    this.file.setExtractionOptions(track.id);
  }

  start(onSamples) {
    this._onSamples = onSamples;
    this.file.start();
  }

  stop() {
    this.file.stop();
  }

  onSamples(track_id, ref, samples) {
    this._onSamples(samples);
  }
}
