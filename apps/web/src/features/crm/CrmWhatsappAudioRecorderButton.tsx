import { Mic, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function CrmWhatsappAudioRecorderButton({
  disabled,
  onRecorded,
  primary = false,
}: {
  disabled?: boolean;
  onRecorded: (file: File) => void;
  primary?: boolean;
}) {
  const [error, setError] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cancelledRef = useRef(false);
  const supported = canRecordAudio();

  useEffect(() => {
    if (!isRecording) return undefined;
    const interval = window.setInterval(() => {
      setElapsedMs(startedAt ? Date.now() - startedAt : 0);
    }, 500);
    return () => window.clearInterval(interval);
  }, [isRecording, startedAt]);

  useEffect(
    () => () => {
      cleanupRecorder();
    },
    [],
  );

  const startRecording = async () => {
    if (disabled || !supported) return;
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = createRecorderSafely(stream);
      chunksRef.current = [];
      cancelledRef.current = false;
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const chunks = chunksRef.current;
        cleanupRecorder();
        if (cancelledRef.current || !chunks.length) return;
        onRecorded(
          new File([new Blob(chunks, { type })], fileName(type), { type }),
        );
      };
      recorder.start();
      setStartedAt(Date.now());
      setElapsedMs(0);
      setIsRecording(true);
    } catch {
      setError("Nao foi possivel acessar o microfone.");
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
  };

  const cancelRecording = () => {
    cancelledRef.current = true;
    stopRecording();
    cleanupRecorder();
  };

  if (isRecording) {
    return (
      <span className="crm-whatsapp-recording">
        <span aria-label="Gravando audio">{formatDuration(elapsedMs)}</span>
        <button
          aria-label="Descartar gravacao"
          className="crm-icon-action"
          onClick={cancelRecording}
          title="Descartar gravacao"
          type="button"
        >
          <Trash2 />
        </button>
        <button
          aria-label="Parar gravacao"
          className="crm-icon-action crm-icon-action-active"
          onClick={stopRecording}
          title="Parar gravacao"
          type="button"
        >
          <Square />
        </button>
      </span>
    );
  }

  return (
    <>
      <button
        aria-label="Gravar audio"
        className={
          primary
            ? "crm-icon-action crm-icon-action-active crm-whatsapp-send-action"
            : "crm-icon-action"
        }
        disabled={disabled || !supported}
        onClick={() => void startRecording()}
        title={supported ? "Gravar audio" : "Gravacao indisponivel"}
        type="button"
      >
        <Mic />
      </button>
      {error ? (
        <small className="crm-whatsapp-recording-error">{error}</small>
      ) : null}
    </>
  );

  function cleanupRecorder() {
    setIsRecording(false);
    setStartedAt(null);
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }
}

function canRecordAudio() {
  return Boolean(
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined",
  );
}

function createRecorder(stream: MediaStream) {
  const mimeType = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ].find((type) => MediaRecorder.isTypeSupported(type));
  return new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
}

function createRecorderSafely(stream: MediaStream) {
  try {
    return createRecorder(stream);
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    throw error;
  }
}

function fileName(mimeType: string) {
  return `whatsapp-audio-${Date.now()}.${mimeType.includes("ogg") ? "ogg" : "webm"}`;
}

function formatDuration(elapsedMs: number) {
  const seconds = Math.floor(elapsedMs / 1000);
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
