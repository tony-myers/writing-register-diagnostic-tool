const textDecoder = new TextDecoder("utf-8");
const latin1Decoder = new TextDecoder("latin1");

interface ZipEntry {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  localHeaderOffset: number;
}

function extensionFor(file: File) {
  return file.name.toLowerCase().split(".").pop() ?? "";
}

function readUInt16(data: DataView, offset: number) {
  return data.getUint16(offset, true);
}

function readUInt32(data: DataView, offset: number) {
  return data.getUint32(offset, true);
}

async function inflate(bytes: Uint8Array, format: "deflate" | "deflate-raw") {
  if (typeof DecompressionStream !== "function") {
    throw new Error("This browser cannot decompress .docx or compressed PDF text streams.");
  }

  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream(format));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function findEndOfCentralDirectory(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minimumOffset = Math.max(0, bytes.length - 65557);
  for (let offset = bytes.length - 22; offset >= minimumOffset; offset -= 1) {
    if (readUInt32(view, offset) === 0x06054b50) {
      return offset;
    }
  }
  throw new Error("Could not read the .docx zip directory.");
}

function readZipEntries(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const endOffset = findEndOfCentralDirectory(bytes);
  const entryCount = readUInt16(view, endOffset + 10);
  const centralDirectoryOffset = readUInt32(view, endOffset + 16);
  const entries: ZipEntry[] = [];
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (readUInt32(view, offset) !== 0x02014b50) {
      throw new Error("Could not read a .docx zip entry.");
    }
    const compressionMethod = readUInt16(view, offset + 10);
    const compressedSize = readUInt32(view, offset + 20);
    const nameLength = readUInt16(view, offset + 28);
    const extraLength = readUInt16(view, offset + 30);
    const commentLength = readUInt16(view, offset + 32);
    const localHeaderOffset = readUInt32(view, offset + 42);
    const nameBytes = bytes.slice(offset + 46, offset + 46 + nameLength);
    entries.push({
      name: textDecoder.decode(nameBytes),
      compressionMethod,
      compressedSize,
      localHeaderOffset,
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

async function readZipEntryText(bytes: Uint8Array, entry: ZipEntry) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const offset = entry.localHeaderOffset;
  if (readUInt32(view, offset) !== 0x04034b50) {
    throw new Error(`Could not read ${entry.name} from the .docx file.`);
  }

  const nameLength = readUInt16(view, offset + 26);
  const extraLength = readUInt16(view, offset + 28);
  const dataOffset = offset + 30 + nameLength + extraLength;
  const compressed = bytes.slice(dataOffset, dataOffset + entry.compressedSize);
  const uncompressed =
    entry.compressionMethod === 0
      ? compressed
      : entry.compressionMethod === 8
        ? await inflate(compressed, "deflate-raw")
        : null;

  if (!uncompressed) {
    throw new Error(`Unsupported compression method in ${entry.name}.`);
  }

  return textDecoder.decode(uncompressed);
}

function paragraphTextFromWordXml(xml: string) {
  const documentXml = new DOMParser().parseFromString(xml, "application/xml");
  const parserError = documentXml.querySelector("parsererror");
  if (parserError) {
    return "";
  }

  return Array.from(documentXml.getElementsByTagNameNS("*", "p"))
    .map((paragraph) => {
      const parts: string[] = [];
      paragraph.querySelectorAll("*").forEach((node) => {
        if (node.localName === "t") {
          parts.push(node.textContent ?? "");
        } else if (node.localName === "tab") {
          parts.push("\t");
        } else if (node.localName === "br" || node.localName === "cr") {
          parts.push("\n");
        }
      });
      return parts.join("").trim();
    })
    .filter(Boolean)
    .join("\n\n");
}

async function extractDocxText(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const entries = readZipEntries(bytes);
  const documentEntries = entries.filter((entry) =>
    /^word\/(document|footnotes|endnotes|header\d+|footer\d+)\.xml$/i.test(entry.name),
  );

  const texts = await Promise.all(
    documentEntries.map(async (entry) => paragraphTextFromWordXml(await readZipEntryText(bytes, entry))),
  );
  const extracted = texts.filter(Boolean).join("\n\n").trim();
  if (!extracted) {
    throw new Error("No readable text was found in this .docx file.");
  }
  return extracted;
}

function bytesToLatin1(bytes: Uint8Array) {
  return latin1Decoder.decode(bytes);
}

function findPdfStreams(bytes: Uint8Array) {
  const pdfText = bytesToLatin1(bytes);
  const streams: Array<{ dictionary: string; bytes: Uint8Array }> = [];
  let searchFrom = 0;

  while (searchFrom < pdfText.length) {
    const streamIndex = pdfText.indexOf("stream", searchFrom);
    if (streamIndex === -1) {
      break;
    }
    const dictionaryStart = pdfText.lastIndexOf("<<", streamIndex);
    const dictionaryEnd = pdfText.lastIndexOf(">>", streamIndex);
    const endStreamIndex = pdfText.indexOf("endstream", streamIndex);
    if (dictionaryStart === -1 || dictionaryEnd === -1 || endStreamIndex === -1) {
      searchFrom = streamIndex + 6;
      continue;
    }

    let dataStart = streamIndex + 6;
    if (pdfText[dataStart] === "\r" && pdfText[dataStart + 1] === "\n") {
      dataStart += 2;
    } else if (pdfText[dataStart] === "\n" || pdfText[dataStart] === "\r") {
      dataStart += 1;
    }

    let dataEnd = endStreamIndex;
    if (pdfText[dataEnd - 2] === "\r" && pdfText[dataEnd - 1] === "\n") {
      dataEnd -= 2;
    } else if (pdfText[dataEnd - 1] === "\n" || pdfText[dataEnd - 1] === "\r") {
      dataEnd -= 1;
    }

    streams.push({
      dictionary: pdfText.slice(dictionaryStart, dictionaryEnd + 2),
      bytes: bytes.slice(dataStart, dataEnd),
    });
    searchFrom = endStreamIndex + 9;
  }

  return streams;
}

async function decodePdfStream(dictionary: string, bytes: Uint8Array) {
  if (/\/Filter\s*(?:\/FlateDecode|\[[^\]]*\/FlateDecode[^\]]*\])/.test(dictionary)) {
    try {
      return bytesToLatin1(await inflate(bytes, "deflate"));
    } catch {
      return bytesToLatin1(await inflate(bytes, "deflate-raw"));
    }
  }
  if (/\/Filter\b/.test(dictionary)) {
    return "";
  }
  return bytesToLatin1(bytes);
}

function decodePdfLiteralString(value: string) {
  let output = "";
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character !== "\\") {
      output += character;
      continue;
    }

    const next = value[index + 1];
    index += 1;
    if (next === "n") output += "\n";
    else if (next === "r") output += "\r";
    else if (next === "t") output += "\t";
    else if (next === "b") output += "\b";
    else if (next === "f") output += "\f";
    else if (next === "\n" || next === "\r") {
      if (next === "\r" && value[index + 1] === "\n") index += 1;
    } else if (/[0-7]/.test(next)) {
      let octal = next;
      for (let count = 0; count < 2 && /[0-7]/.test(value[index + 1] ?? ""); count += 1) {
        octal += value[index + 1];
        index += 1;
      }
      output += String.fromCharCode(parseInt(octal, 8));
    } else {
      output += next ?? "";
    }
  }
  return output;
}

function parsePdfStringTokens(value: string) {
  const tokens: string[] = [];
  let index = 0;
  while (index < value.length) {
    if (value[index] === "(") {
      let depth = 1;
      let token = "";
      index += 1;
      while (index < value.length && depth > 0) {
        const character = value[index];
        if (character === "\\") {
          token += character + (value[index + 1] ?? "");
          index += 2;
        } else if (character === "(") {
          depth += 1;
          token += character;
          index += 1;
        } else if (character === ")") {
          depth -= 1;
          if (depth > 0) token += character;
          index += 1;
        } else {
          token += character;
          index += 1;
        }
      }
      tokens.push(decodePdfLiteralString(token));
    } else if (value[index] === "<" && value[index + 1] !== "<") {
      const end = value.indexOf(">", index + 1);
      if (end === -1) break;
      tokens.push(decodePdfHexString(value.slice(index + 1, end)));
      index = end + 1;
    } else {
      index += 1;
    }
  }
  return tokens;
}

function decodePdfHexString(hex: string) {
  const cleanHex = hex.replace(/\s+/g, "");
  if (!cleanHex) {
    return "";
  }

  const bytes = cleanHex.match(/.{1,2}/g)?.map((pair) => parseInt(pair.padEnd(2, "0"), 16)) ?? [];
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    let output = "";
    for (let index = 2; index + 1 < bytes.length; index += 2) {
      output += String.fromCharCode((bytes[index] << 8) + bytes[index + 1]);
    }
    return output;
  }

  return bytes
    .map((byte) => (byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : " "))
    .join("");
}

function extractTextFromPdfContent(content: string) {
  const textParts: string[] = [];
  const textOperatorPattern =
    /(\((?:\\.|[^\\()])*(?:\((?:\\.|[^\\()])*\)(?:\\.|[^\\()])*)*\)|<[\da-fA-F\s]+>|\[(?:[^\]\\]|\\.)*?\])\s*(?:Tj|TJ|'|")/gs;

  let match: RegExpExecArray | null;
  while ((match = textOperatorPattern.exec(content))) {
    const token = match[1];
    if (token.startsWith("[") && token.endsWith("]")) {
      textParts.push(...parsePdfStringTokens(token.slice(1, -1)));
    } else if (token.startsWith("(") && token.endsWith(")")) {
      textParts.push(decodePdfLiteralString(token.slice(1, -1)));
    } else if (token.startsWith("<") && token.endsWith(">")) {
      textParts.push(decodePdfHexString(token.slice(1, -1)));
    }
  }

  return textParts.join(" ");
}

async function extractPdfText(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const streams = findPdfStreams(bytes);
  const streamTexts = await Promise.all(
    streams.map(async (stream) => extractTextFromPdfContent(await decodePdfStream(stream.dictionary, stream.bytes))),
  );
  const extracted = streamTexts
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!extracted) {
    throw new Error("No readable text was found in this PDF. Scanned/image-only PDFs are not supported.");
  }
  return extracted;
}

export async function extractTextFromFile(file: File) {
  const extension = extensionFor(file);
  if (extension === "txt" || extension === "md") {
    return file.text();
  }
  if (extension === "docx") {
    return extractDocxText(file);
  }
  if (extension === "pdf") {
    return extractPdfText(file);
  }
  throw new Error("Unsupported file type. Use .txt, .md, .docx or .pdf.");
}
