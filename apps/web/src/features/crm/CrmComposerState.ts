import { useEffect, useRef, useState } from "react";
import type { Dispatch, KeyboardEvent, RefObject, SetStateAction } from "react";
import { readMediaType } from "./crmMediaFiles";
import type { CrmQuickMessage } from "./crmConversationTypes";
import {
  filterQuickMessages,
  readQuickNeedle,
  usePreviewUrls,
} from "./crmComposerSupport";
import type { ComposerDialog, MessageComposerProps } from "./CrmComposerTypes";

type UseMessageComposerStateInput = {
  allowMediaCaption?: boolean;
  allowQuickMessages?: boolean;
  disabled?: boolean;
  onSend: MessageComposerProps["onSend"];
  onSendMedia: MessageComposerProps["onSendMedia"];
  onSendQuickMessage: MessageComposerProps["onSendQuickMessage"];
  quickMessages: MessageComposerProps["quickMessages"];
};

export type MessageComposerState = {
  activeIndex: number;
  applyQuickMessage: (message: CrmQuickMessage) => void;
  canSend: boolean;
  dialog: ComposerDialog | null;
  discardFiles: () => void;
  effectiveDisabled: boolean;
  files: File[];
  imageInputRef: RefObject<HTMLInputElement | null>;
  audioInputRef: RefObject<HTMLInputElement | null>;
  documentInputRef: RefObject<HTMLInputElement | null>;
  isSubmitting: boolean;
  menuOpen: boolean;
  onTextChange: (value: string) => void;
  onTextKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  quickIndex: number;
  quickMatches: CrmQuickMessage[];
  quickNeedle: string;
  quickPickerOpen: boolean;
  removeFile: (index: number) => void;
  setActiveIndex: Dispatch<SetStateAction<number>>;
  setDialog: Dispatch<SetStateAction<ComposerDialog | null>>;
  setFiles: Dispatch<SetStateAction<File[]>>;
  setIsSubmitting: Dispatch<SetStateAction<boolean>>;
  setMenuOpen: Dispatch<SetStateAction<boolean>>;
  setQuickIndex: Dispatch<SetStateAction<number>>;
  setText: Dispatch<SetStateAction<string>>;
  submit: () => Promise<void>;
  text: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  previewUrls: Map<File, string>;
};

export function useMessageComposerState({
  allowMediaCaption = true,
  allowQuickMessages = true,
  disabled = false,
  onSend,
  onSendMedia,
  onSendQuickMessage,
  quickMessages = [],
}: UseMessageComposerStateInput): MessageComposerState {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dialog, setDialog] = useState<ComposerDialog | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickIndex, setQuickIndex] = useState(0);
  const [text, setText] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewUrls = usePreviewUrls(files);
  const canSend = Boolean(text.trim() || files.length);
  const effectiveDisabled = disabled || isSubmitting;
  const quickNeedle = readQuickNeedle(text);
  const quickCommandActive =
    allowQuickMessages && text.trimStart().startsWith("/");
  const quickMatches = quickCommandActive
    ? filterQuickMessages(quickMessages, quickNeedle)
    : [];
  const quickPickerOpen = !files.length && quickCommandActive;

  useEffect(() => {
    if (activeIndex >= files.length) {
      setActiveIndex(Math.max(0, files.length - 1));
    }
  }, [activeIndex, files.length]);

  useEffect(() => {
    if (quickIndex >= quickMatches.length) {
      setQuickIndex(Math.max(0, quickMatches.length - 1));
    }
  }, [quickIndex, quickMatches.length]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 52), 120)}px`;
  }, [text]);

  const submit = async () => {
    if (effectiveDisabled || !canSend) return;
    const caption = text.trim();
    const submittedFiles = files;
    setFiles([]);
    setText("");
    setMenuOpen(false);

    if (!submittedFiles.length) {
      const activeElementAtSubmit = document.activeElement;
      const shouldRestoreFocus =
        activeElementAtSubmit === textareaRef.current ||
        Boolean(activeElementAtSubmit?.closest(".crm-send-action"));
      const accepted = await onSend(caption);
      if (!accepted) {
        setText((current) => current || caption);
        return;
      }
      const currentActiveElement = document.activeElement;
      if (
        shouldRestoreFocus &&
        (currentActiveElement === document.body ||
          currentActiveElement === textareaRef.current ||
          currentActiveElement === activeElementAtSubmit)
      ) {
        textareaRef.current?.focus({ preventScroll: true });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      for (const [index, file] of submittedFiles.entries()) {
        const accepted = await onSendMedia({
          ...(allowMediaCaption && index === 0 && caption ? { caption } : {}),
          file,
          mediaType: readMediaType(file),
        });
        if (!accepted) {
          setFiles(submittedFiles.slice(index));
          setText(index === 0 ? caption : "");
          setActiveIndex(0);
          return;
        }
      }
      if (!allowMediaCaption && caption) setText(caption);
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, item) => item !== index));
    setActiveIndex((current) =>
      index <= current ? Math.max(0, current - 1) : current,
    );
  };

  const discardFiles = () => {
    setFiles([]);
    setActiveIndex(0);
  };

  const applyQuickMessage = (message: CrmQuickMessage) => {
    if (message.kind !== "TEXT") {
      setText("");
      setQuickIndex(0);
      setIsSubmitting(true);
      void onSendQuickMessage(message).finally(() => setIsSubmitting(false));
      return;
    }
    setText(message.content);
    setQuickIndex(0);
    window.requestAnimationFrame(() =>
      textareaRef.current?.focus({ preventScroll: true }),
    );
  };

  const onTextChange = (value: string) => {
    setText(value);
  };

  const onTextKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (quickPickerOpen && quickMatches.length) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setQuickIndex((index) => Math.min(index + 1, quickMatches.length - 1));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setQuickIndex((index) => Math.max(index - 1, 0));
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        const message = quickMatches[quickIndex];
        if (message) applyQuickMessage(message);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setText("");
        return;
      }
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  return {
    activeIndex,
    applyQuickMessage,
    canSend,
    dialog,
    discardFiles,
    effectiveDisabled,
    files,
    imageInputRef,
    audioInputRef,
    documentInputRef,
    isSubmitting,
    menuOpen,
    onTextChange,
    onTextKeyDown,
    quickIndex,
    quickMatches,
    quickNeedle,
    quickPickerOpen,
    removeFile,
    setActiveIndex,
    setDialog,
    setFiles,
    setIsSubmitting,
    setMenuOpen,
    setQuickIndex,
    setText,
    submit,
    text,
    textareaRef,
    previewUrls,
  };
}
