import { SimpleFilter, SoundTouch } from "./soundtouch";

const BUFFER_SIZE = 4096;

export class PitchShifter {
  scriptProcessor: ScriptProcessorNode;
  soundTouch: any = new SoundTouch();
  simpleFilter: any = new SimpleFilter();
  samples: Float32Array;
  context: OfflineAudioContext;
  duration?: number;
  source?: any;
  constructor({
    context,
    buffer,
    pitch,
    tempo
  }: {
    buffer: AudioBuffer;
    context: OfflineAudioContext;
    pitch: number;
    tempo: number;
  }) {
    this.samples = new Float32Array(BUFFER_SIZE * 2);
    this.scriptProcessor = context.createScriptProcessor(BUFFER_SIZE, 2, 2);
    this.scriptProcessor.onaudioprocess = e => {
      const l = e.outputBuffer.getChannelData(0);
      const r = e.outputBuffer.getChannelData(1);
      const framesExtracted = this.simpleFilter.extract(
        this.samples,
        BUFFER_SIZE
      );
      if (framesExtracted === 0) {
        /*         this.emitter.emit("stop"); */
      }
      for (let i = 0; i < framesExtracted; i++) {
        l[i] = this.samples[i * 2];
        r[i] = this.samples[i * 2 + 1];
      }
    };

    this.soundTouch.pitch = pitch;
    this.soundTouch.tempo = tempo;
    this.context = context;
    const bufferSource = this.context.createBufferSource();
    bufferSource.buffer = buffer;

    this.source = {
      extract: (target: Float32Array, numFrames: number, position: number) => {
        /* this.emitter.emit("state", { t: position / this.context.sampleRate }); */
        const l = buffer.getChannelData(0);
        const r = buffer.getChannelData(1);
        for (let i = 0; i < numFrames; i++) {
          target[i * 2] = l[i + position];
          target[i * 2 + 1] = r[i + position];
        }
        return Math.min(numFrames, l.length - position);
      }
    };
    this.simpleFilter = new SimpleFilter(this.source, this.soundTouch);
  }

  get pitch() {
    return this.soundTouch.pitch;
  }
  set pitch(pitch) {
    this.soundTouch.pitch = pitch;
  }

  get tempo() {
    return this.soundTouch.tempo;
  }
  set tempo(tempo) {
    this.soundTouch.tempo = tempo;
  }
}
