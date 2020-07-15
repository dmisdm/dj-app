/* eslint-disable import/no-webpack-loader-syntax */
import {
  ToneAudioWorklet,
  ToneAudioWorkletOptions
} from "tone/build/esm/core/context/ToneAudioWorklet";
import { connectSeries, Gain, Param } from "tone";

type Opts = ToneAudioWorkletOptions;
export class PitchSifhterWorklet extends ToneAudioWorklet<Opts> {
  channel0: Float32Array;
  channel1: Float32Array;
  tempo: Param<"number">;
  constructor({
    audioBuffer,
    tempo
  }: {
    audioBuffer: AudioBuffer;
    tempo: number;
  }) {
    super({ ...ToneAudioWorklet.getDefaults() });
    this.input = new Gain({ context: this.context });
    this.output = new Gain({ context: this.context });
    const sharedChan1Buffer = new SharedArrayBuffer(
      audioBuffer.getChannelData(0).byteLength
    );
    const sharedChan2Buffer = new SharedArrayBuffer(
      audioBuffer.getChannelData(1).byteLength
    );
    const sharedChan1 = new Float32Array(sharedChan1Buffer);
    const sharedChan2 = new Float32Array(sharedChan2Buffer);

    sharedChan1.set(audioBuffer.getChannelData(0));
    sharedChan2.set(audioBuffer.getChannelData(1));
    this.channel0 = sharedChan1;
    this.channel1 = sharedChan2;
    this.tempo = new Param({
      value: tempo
    });
  }
  protected _audioWorklet(): string {
    // eslint-disable-next-line import/no-webpack-loader-syntax
    return require("raw-loader!./soundtouch-worklet").default;
  }
  protected _audioWorkletName(): string {
    return "pitch-shifter";
  }

  protected onReady(node: AudioWorkletNode): void {
    this._worklet.port.postMessage({
      type: "INIT",
      channel0: this.channel0,
      channel1: this.channel1,
      tempo: this.tempo
    });
    connectSeries(this.input, node, this.output);
  }
  input: import("tone").ToneAudioNode<
    import("tone/build/esm/core/context/ToneWithContext").ToneWithContextOptions
  >;
  output: import("tone").ToneAudioNode<
    import("tone/build/esm/core/context/ToneWithContext").ToneWithContextOptions
  >;
  dispose(): this {
    super.dispose();
    this.input.dispose();
    this.output.dispose();
    /*     this.bits.dispose(); */
    return this;
  }

  setTempo = (tempo: number) => {
    this.tempo.set({
      value: tempo
    });
  };
}
