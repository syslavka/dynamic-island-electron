import { Icon } from "../Icon";
import type { IslandController } from "../../hooks/useDynamicIsland";
import { formatTime } from "../../hooks/useDynamicIsland";

export function AlbumArt({
  color = "coast",
  small = false,
  artwork,
}: {
  color?: string;
  small?: boolean;
  artwork?: string;
}) {
  if (artwork || color === "native-art") return <div className={`album-art native-art ${small ? "small" : ""}`} aria-hidden="true">{artwork ? <img src={artwork} alt="" /> : <Icon name="music" size={small ? 16 : 28} />}</div>;
  return (
    <div
      className={`album-art ${color} ${small ? "small" : ""}`}
      aria-hidden="true"
    >
      <span className="album-sun" />
      <span className="album-mountain back" />
      <span className="album-mountain front" />
      <span className="album-caption">
        SLOW
        <br />
        MORNINGS
      </span>
    </div>
  );
}
export function MediaModule({ island }: { island: IslandController }) {
  const { track, playing, setPlaying, progress, setProgress, nextTrack } =
    island;
  return (
    <div className="media-module module-enter">
      <div className="media-track">
        <AlbumArt color={track.color} artwork={track.artwork} />
        <div>
          <h3 title={track.title}>{track.title}</h3>
          <p title={track.artist}>{track.artist}</p>
          <span>{track.album}</span>
        </div>
        <div
          className={`equalizer ${playing ? "is-playing" : ""}`}
          aria-label={playing ? "Playing" : "Paused"}
        >
          {[0, 1, 2, 3, 4].map((index) => (
            <i key={index} style={{ "--bar": index } as React.CSSProperties} />
          ))}
        </div>
      </div>
      <div className="media-progress">
        <label className="sr-only" htmlFor="media-progress">
          Track position
        </label>
        <input
          id="media-progress"
          type="range"
          min="0"
          disabled={!!window.desktop && (!island.nativeMedia.canSeek || island.mediaBusy)}
          max={track.duration || 1}
          value={progress}
          step="0.1"
          onChange={(event) => setProgress(Number(event.target.value))}
          aria-valuetext={formatTime(progress)}
        />
        <div>
          <span>{formatTime(progress)}</span>
          <span>−{formatTime(track.duration - progress)}</span>
        </div>
      </div>
      {island.nativeMedia.error && <p className="media-error" role="status">{island.nativeMedia.error}</p>}
      <div className="media-controls">
        {!window.desktop && <span className="simulated-label">DEMO AUDIO</span>}
        <div>
          <button
            className="icon-button"
            disabled={!!window.desktop && (!island.nativeMedia.canPrevious || island.mediaBusy)}
            aria-label="Previous track"
            onClick={() => nextTrack(-1)}
          >
            <Icon name="previous" size={21} />
          </button>
          <button
            className="play-button"
            disabled={!!window.desktop && (!(playing ? island.nativeMedia.canPause : island.nativeMedia.canPlay) || island.mediaBusy)}
            aria-label={playing ? "Pause playback" : "Play music"}
            onClick={() => setPlaying(!playing)}
          >
            <Icon name={playing ? "pause" : "play"} size={21} />
          </button>
          <button
            className="icon-button"
            disabled={!!window.desktop && (!island.nativeMedia.canNext || island.mediaBusy)}
            aria-label="Next track"
            onClick={() => nextTrack(1)}
          >
            <Icon name="next" size={21} />
          </button>
        </div>
        {!window.desktop && <Icon name="headphones" size={17} />}
      </div>
    </div>
  );
}
