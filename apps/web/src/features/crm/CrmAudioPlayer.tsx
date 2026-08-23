import { Pause, Play, Volume2, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function CrmAudioPlayer({
  outgoing = false,
  src,
}: {
  outgoing?: boolean;
  src: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [duration, setDuration] = useState("0:00");
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);
  const [hasError, setHasError] = useState(false);

  // Generate deterministic wave heights based on the audio src string
  const waveBars = useMemo(() => {
    const bars: number[] = [];
    let hash = 0;
    for (let i = 0; i < src.length; i++) {
      hash = (hash << 5) - hash + src.charCodeAt(i);
      hash |= 0;
    }
    for (let i = 0; i < 28; i++) {
      const pseudo = Math.abs(Math.sin((hash + i * 13) * 0.7));
      bars.push(Math.round(25 + pseudo * 65));
    }
    return bars;
  }, [src]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || hasError) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => setHasError(true));
    }
  }, [isPlaying, hasError]);

  const cycleSpeed = useCallback(() => {
    const nextRate: 1 | 1.5 | 2 =
      playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  }, [playbackRate]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const current = audio.currentTime;
    const total = audio.duration;
    if (total && !isNaN(total)) {
      setProgress((current / total) * 100);
      setCurrentTime(formatTime(current));
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const total = audio.duration;
    if (total && !isNaN(total)) {
      setDuration(formatTime(total));
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime("0:00");
  }, []);

  const handleSeek = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    audio.currentTime = ratio * audio.duration;
    setProgress(ratio * 100);
  }, []);

  const updatePosition = useCallback((nextTime: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0)
      return;
    const boundedTime = Math.max(0, Math.min(audio.duration, nextTime));
    audio.currentTime = boundedTime;
    setCurrentTime(formatTime(boundedTime));
    setProgress((boundedTime / audio.duration) * 100);
  }, []);

  const handleSeekKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio) return;
      const nextTime =
        event.key === "ArrowRight"
          ? audio.currentTime + 5
          : event.key === "ArrowLeft"
            ? audio.currentTime - 5
            : event.key === "Home"
              ? 0
              : event.key === "End"
                ? audio.duration
                : null;
      if (nextTime === null) return;
      event.preventDefault();
      updatePosition(nextTime);
    },
    [updatePosition],
  );

  const retryLoad = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime("0:00");
    setDuration("0:00");
    setHasError(false);
    audio.load();
  }, []);

  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime("0:00");
    setHasError(false);
  }, [src]);

  return (
    <div
      className={
        outgoing ? "crm-audio-player crm-audio-player-out" : "crm-audio-player"
      }
      role="region"
      aria-label="Audio player"
    >
      <audio
        aria-label="Mensagem de audio"
        className="sr-only"
        onEnded={handleEnded}
        onError={() => setHasError(true)}
        onLoadedMetadata={handleLoadedMetadata}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={handleTimeUpdate}
        preload="metadata"
        ref={audioRef}
        src={src}
      />

      <button
        aria-label={
          hasError
            ? "Tentar carregar audio novamente"
            : isPlaying
              ? "Pausar audio"
              : "Reproduzir audio"
        }
        className="crm-audio-play-btn"
        onClick={hasError ? retryLoad : togglePlay}
        title={
          hasError ? "Tentar novamente" : isPlaying ? "Pausar" : "Reproduzir"
        }
        type="button"
      >
        {hasError ? (
          <RotateCcw className="size-4" />
        ) : isPlaying ? (
          <Pause className="size-4 fill-current" />
        ) : (
          <Play className="size-4 fill-current ml-0.5" />
        )}
      </button>

      <div className="crm-audio-body">
        <div
          aria-label="Linha do tempo do audio"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.round(progress)}
          aria-valuetext={`${currentTime} de ${duration}`}
          className="crm-audio-waveform"
          onClick={handleSeek}
          onKeyDown={handleSeekKeyDown}
          role="slider"
          tabIndex={0}
        >
          {waveBars.map((height, index) => {
            const barProgress = (index / waveBars.length) * 100;
            const isPlayed = barProgress <= progress;
            return (
              <span
                className={
                  isPlayed
                    ? "crm-audio-bar crm-audio-bar-played"
                    : "crm-audio-bar"
                }
                key={index}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>

        <div className="crm-audio-meta">
          <span className="crm-audio-time">
            {isPlaying
              ? currentTime
              : duration !== "0:00"
                ? duration
                : currentTime}
          </span>
          <div className="crm-audio-actions">
            <button
              aria-label={`Velocidade de reproducao ${playbackRate}x`}
              className="crm-audio-speed-btn"
              onClick={cycleSpeed}
              title="Velocidade"
              type="button"
            >
              {playbackRate}x
            </button>
            <Volume2 aria-hidden="true" className="size-3 opacity-60" />
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
