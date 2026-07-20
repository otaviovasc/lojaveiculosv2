// Approved brand color components in RGB.
export const approvedBaseColors = [
  [21, 21, 21], // Carvão #151515
  [42, 36, 36], // Escuro Quente #2a2424
  [74, 68, 68], // Chumbo #4a4444
  [160, 152, 152], // Cinza Médio #a09898
  [232, 227, 226], // Cinza Quente #e8e3e2
  [244, 239, 238], // Off-white #f4efee
  [255, 244, 238], // Warm white #fff4ee
  [247, 236, 231], // Warm canvas #f7ece7
  [234, 219, 213], // Warm line #eadbd5
  [170, 147, 138], // Warm line strong #aa938a
  [236, 221, 214], // Warm elevated surface #ecddd6
  [140, 17, 24], // Vermelho Deep #8c1118
  [184, 24, 32], // Vermelho Hover #b81820
  [225, 31, 38], // Vermelho LV #e11f26
  [252, 232, 233], // Vermelho Claro #fce8e9
  [24, 42, 184], // Azul Info #182ab8
  [24, 184, 65], // Verde Sucesso #18b841
  [184, 148, 24], // Âmbar Aviso #b89418
  [255, 250, 248], // Warm panel #fffaf8
  [255, 255, 255], // Translucent white effects; opaque white is blocked
  [0, 0, 0], // Translucent black effects; opaque black is blocked
  [17, 24, 39], // dark slate background
  [55, 65, 81], // mid-gray slate
  [203, 213, 225], // slate border #cbd5e1
  [226, 232, 240], // slate divider #e2e8f0
  [30, 41, 59], // slate text/panel #1e293b
  [9, 9, 11], // zinc-950 #09090b
  [39, 39, 42], // zinc-800 #27272a
  [253, 224, 71], // yellow-300 #fde047
  [250, 204, 21], // yellow-400 #facc15
  [234, 179, 8], // yellow-500 #eab308
  [217, 119, 6], // amber-600 #d97706
  [180, 83, 9], // amber-700 #b45309
  [254, 243, 199], // amber-50 #fef3c7
  [245, 197, 66], // warning #f5c542
  [59, 32, 0], // dark amber #3b2000
  [16, 185, 129], // emerald-500 #10b981
  [5, 150, 105], // emerald-600 #059669
  [4, 120, 87], // emerald-700 #047857
  [52, 211, 153], // emerald-400 #34d399
  [34, 197, 94], // green-500 #22c55e
  [22, 163, 74], // green-600 #16a34a
  [21, 128, 61], // green-700 #15803d
  [209, 250, 229], // emerald-100 #d1fae5
  [220, 252, 231], // green-100 #dcfce7
  [32, 199, 122], // status green #20c77a
  [8, 122, 47], // accessible green text on light surfaces #087a2f
  [6, 101, 37], // accessible green text on translucent light surfaces #066525
  [114, 223, 145], // accessible green text on dark surfaces #72df91
  [59, 130, 246], // blue-500 #3b82f6
  [37, 99, 235], // blue-600 #2563eb
  [29, 78, 216], // blue-700 #1d4ed8
  [96, 165, 250], // blue-400 #60a5fa
  [219, 234, 254], // blue-100 #dbeafe
  [139, 92, 246], // violet-500 #8b5cf6
  [124, 58, 237], // violet-600 #7c3aed
  [109, 40, 217], // violet-700 #6d28d9
  [237, 233, 254], // violet-100 #ede9fe
  [167, 139, 250], // accessible violet text on dark surfaces #a78bfa
  [168, 162, 158], // stone-400 #a8a29e
  [120, 113, 108], // stone-500 #78716c
  [87, 83, 78], // stone-600 #57534e
  [245, 245, 244], // stone-100 #f5f5f4
  [245, 158, 11], // amber-500 #f59e0b
  [118, 91, 0], // accessible amber text on light surfaces #765b00
  [234, 209, 110], // accessible amber text on dark surfaces #ead16e
];

function hexToRgb(hex) {
  let clean = hex.replace("#", "").toLowerCase();
  if (clean.length === 3 || clean.length === 4) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  } else if (clean.length === 8) {
    clean = clean.substring(0, 6);
  }
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ];
}

export function isPureOpaqueNeutral(colorStr) {
  const trimmed = colorStr.trim().toLowerCase();
  let channels;
  let alpha = 1;

  if (trimmed.startsWith("#")) {
    const clean = trimmed.slice(1);
    channels = hexToRgb(trimmed);
    if (clean.length === 4) alpha = parseInt(clean[3] + clean[3], 16) / 255;
    if (clean.length === 8) alpha = parseInt(clean.slice(6, 8), 16) / 255;
  } else {
    const match = trimmed.match(
      /^rgba?\s*\(\s*(\d+)\s*(?:,\s*|\s+)(\d+)\s*(?:,\s*|\s+)(\d+)(?:\s*(?:,|\/)\s*([0-9.]+)(%)?)?\s*\)$/,
    );
    if (!match) return false;
    channels = match.slice(1, 4).map(Number);
    if (match[4] !== undefined) {
      alpha = Number(match[4]) / (match[5] ? 100 : 1);
    }
  }

  const isWhite = channels.every((channel) => channel === 255);
  const isBlack = channels.every((channel) => channel === 0);
  return alpha === 1 && (isWhite || isBlack);
}

export function isColorApproved(colorStr) {
  const trimmed = colorStr.trim().toLowerCase();
  const channels = trimmed.startsWith("#")
    ? hexToRgb(trimmed)
    : trimmed
        .match(/^rgba?\s*\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/)
        ?.slice(1, 4)
        .map(Number);
  if (!channels) return false;
  return approvedBaseColors.some(([r, g, b]) =>
    channels.every((channel, index) => channel === [r, g, b][index]),
  );
}
