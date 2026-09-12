export type CrmSseFrame = {
  data: string;
  event: string;
  id: string;
};

export async function readCrmSseStream(
  stream: ReadableStream<Uint8Array>,
  onFrame: (frame: CrmSseFrame) => void,
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const parser = createCrmSseParser(onFrame);

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.push(decoder.decode(value, { stream: true }));
    }
    parser.push(decoder.decode());
    parser.finish();
  } finally {
    reader.releaseLock();
  }
}

function createCrmSseParser(onFrame: (frame: CrmSseFrame) => void) {
  let buffer = "";
  let data: string[] = [];
  let event = "";
  let id = "";

  const dispatch = () => {
    if (data.length > 0) {
      onFrame({ data: data.join("\n"), event: event || "message", id });
    }
    data = [];
    event = "";
  };

  const consumeLine = (line: string) => {
    if (!line) {
      dispatch();
      return;
    }
    if (line.startsWith(":")) return;

    const separator = line.indexOf(":");
    const field = separator === -1 ? line : line.slice(0, separator);
    const rawValue = separator === -1 ? "" : line.slice(separator + 1);
    const value = rawValue.startsWith(" ") ? rawValue.slice(1) : rawValue;

    if (field === "data") data.push(value);
    if (field === "event") event = value;
    if (field === "id" && !value.includes("\0")) id = value;
  };

  const drain = (atEnd: boolean) => {
    let offset = 0;
    for (let index = 0; index < buffer.length; index += 1) {
      const character = buffer[index];
      if (character !== "\n" && character !== "\r") continue;
      if (character === "\r" && index === buffer.length - 1 && !atEnd) break;

      consumeLine(buffer.slice(offset, index));
      if (character === "\r" && buffer[index + 1] === "\n") index += 1;
      offset = index + 1;
    }
    buffer = buffer.slice(offset);
  };

  return {
    finish() {
      drain(true);
      if (buffer) consumeLine(buffer);
      dispatch();
      buffer = "";
    },
    push(chunk: string) {
      buffer += chunk;
      drain(false);
    },
  };
}
