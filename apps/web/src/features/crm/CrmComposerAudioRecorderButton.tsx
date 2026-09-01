import { Loader2, Mic, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnimatedIconSwap } from "../../components/ui/AnimatedIconSwap";

export function CrmComposerAudioRecorderButton({
  disabled,
  onSend,
  primary = false,
}: {
  disabled?: boolean;
  onSend: (file: File) => Promise<boolean>;
  primary?: boolean;
}) {
  const [error, setError] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
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
        const cancelled = cancelledRef.current;
        cleanupRecorder();
        if (cancelled || !chunks.length) return;
        void sendRecording(
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

  const sendRecording = async (file: File) => {
    setIsSending(true);
    setError("");
    try {
      if (!(await onSend(file))) {
        setError("Nao foi possivel enviar o audio.");
      }
    } catch {
      setError("Nao foi possivel enviar o audio.");
    } finally {
      setIsSending(false);
    }
  };

  if (isRecording) {
    return (
      <span className="crm-recording" role="status">
        <span className="crm-recording-pulse" />
        <span aria-label="Gravando audio" className="crm-recording-timer">
          {formatDuration(elapsedMs)}
        </span>
        <div className="crm-recording-wave" aria-hidden="true">
          <span className="crm-rec-bar" />
          <span className="crm-rec-bar" />
          <span className="crm-rec-bar" />
          <span className="crm-rec-bar" />
        </div>
        <button
          aria-label="Descartar gravacao"
          className="crm-icon-action crm-recording-cancel"
          onClick={cancelRecording}
          title="Descartar gravacao"
          type="button"
        >
          <Trash2 />
        </button>
        <button
          aria-label="Enviar audio"
          className="crm-icon-action crm-icon-action-active crm-send-action"
          onClick={stopRecording}
          title="Enviar audio"
          type="button"
        >
          <AnimatedIconSwap stateKey={isRecording} variant="pop">
            <Send />
          </AnimatedIconSwap>
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
            ? "crm-icon-action crm-send-action crm-audio-action"
            : "crm-icon-action"
        }
        disabled={disabled || isSending || !supported}
        onClick={() => void startRecording()}
        title={supported ? "Gravar audio" : "Gravacao indisponivel"}
        type="button"
      >
        <AnimatedIconSwap
          stateKey={isSending ? "sending" : "idle"}
          variant="pop"
        >
          {isSending ? <Loader2 className="crm-spin" /> : <Mic />}
        </AnimatedIconSwap>
      </button>
      {error ? <small className="crm-recording-error">{error}</small> : null}
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
