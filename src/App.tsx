import React from "react";
import { Box, Grid, CssBaseline, Typography, Button } from "@material-ui/core";
import { guess } from "web-audio-beat-detector";
import { CircularProgress } from "@material-ui/core";
import { Player, BitCrusher, Gain, InputNode } from "tone";
import { PitchSifhterWorklet } from "./PitchShifterWorklet";

function Disk(props: {
  player?: Player;
  loading?: boolean;
  className?: string;
}) {
  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => {
    const player = props.player;
    if (player) {
      const interval = setInterval(() => {
        setProgress(player.toTicks());
      }, 100);
      return () => {
        clearInterval(interval);
      };
    }
  }, [props.player]);
  console.log(progress);
  return (
    <CircularProgress
      className={props.className}
      size="100%"
      value={progress}
      variant={props.loading ? "indeterminate" : "static"}
      style={{ border: "solid 1px #ccc ", borderRadius: "50%" }}
    />
  );
}

type State = {
  status: "downloading" | "analyzing" | "ready";
  bpm?: number;
  buffer?: AudioBuffer;
  sharedRawBuffer?: SharedArrayBuffer;
};
const useSong = (url: string) => {
  const [tempo, setTempo] = React.useState(1);
  const [state, setState] = React.useState<State>({
    status: "downloading"
  });
  const [ctx] = React.useState(() => new AudioContext());
  const [player, setPlayer] = React.useState<Player>();
  React.useEffect(() => {
    setState(state => ({ ...state, status: "downloading" }));

    fetch(url, { mode: "no-cors" }).then(async r => {
      const arrayBuffer = await r.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      setState(state => ({
        ...state,
        status: "analyzing",
        buffer: audioBuffer
      }));

      await guess(audioBuffer).then(({ bpm }) => {
        setState(state => ({
          ...state,
          status: "ready",
          bpm
        }));
      });
    });
  }, [ctx, url]);

  const shifterRef = React.useRef<PitchSifhterWorklet>();

  const play = React.useCallback(() => {
    if (state.status === "ready" && state.buffer && !player) {
      const shifter = (shifterRef.current = new PitchSifhterWorklet({
        audioBuffer: state.buffer,
        tempo
      }));

      const player = new Player(state.buffer).chain(shifter.toDestination());
      player.start();
      player.playbackRate = 1.2;
      setPlayer(player);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.buffer, player]);
  const stop = React.useCallback(() => {
    if (state.status === "ready" && player) {
      player.restart();
      player.stop();
      player.dispose();
      if (shifterRef.current) {
        shifterRef.current.dispose();
        shifterRef.current = undefined;
      }
      setPlayer(undefined);
    }
  }, [state.status, player]);
  return {
    ...state,
    url,
    playing: !!player,
    player,
    play,
    stop,
    tempo,
    setTempo
  };
};

const App = () => {
  const song1 = useSong("/song2.mp3");
  const song2 = useSong("/song3.wav");
  const items = [song1, song2].map(song => (
    <Box
      key={song.url}
      display="flex"
      justifyContent="center"
      alignItems="center"
      clone
    >
      <Grid item sm={6}>
        <Box
          position="relative"
          height={300}
          width={300}
          borderRadius="50%"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexDirection="column"
        >
          <Box clone position="absolute">
            <Disk loading={song.status !== "ready"} player={song.player} />
            <input
              type="range"
              value={song.tempo}
              min={0.1}
              max={2}
              step={0.01}
              onChange={e => song.setTempo(parseInt(e.target.value, 10))}
            />
          </Box>
          <Typography variant="h4">
            {song.status !== "ready" ? (
              "Loading..."
            ) : (
              <>
                BPM: <small>{song.bpm}</small>
              </>
            )}
          </Typography>
          <Button
            disabled={song.status !== "ready"}
            onClick={song.playing ? song.stop : song.play}
          >
            {song.playing ? "Stop" : "Play"}
          </Button>
        </Box>
      </Grid>
    </Box>
  ));
  return (
    <>
      <CssBaseline />
      <Box height="100vh" width="100vw" display="flex">
        <Grid direction="row" container>
          {items}
        </Grid>
      </Box>
    </>
  );
};

export default App;
