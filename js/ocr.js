let tesseractReady = false;

async function initTesseract() {
  if (typeof Tesseract === "undefined") {
    console.warn("Tesseract.js not loaded.");
    return false;
  }
  tesseractReady = true;
  return true;
}

function preprocessImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const scale = 2;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        let gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        gray = Math.min(255, Math.max(0, Math.round((gray - 80) * 255 / (175 - 80))));
        data[i] = data[i + 1] = data[i + 2] = gray;
      }

      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob(blob => {
        if (blob) resolve(new File([blob], file.name, { type: "image/png" }));
        else resolve(file);
      }, "image/png");
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

async function performOCR(imageFile, onProgress) {
  if (!tesseractReady) {
    const ready = await initTesseract();
    if (!ready) {
      throw new Error("Tesseract.js is not available");
    }
  }

  const processed = await preprocessImage(imageFile);

  const result = await Tesseract.recognize(processed, "eng+jpn", {
    logger: m => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    }
  });

  const words = result.data.words || [];
  const rawTokens = words
    .filter(w => w.confidence >= 15)
    .map(w => w.text.trim())
    .filter(t => t.length > 0);

  const combined = rawTokens.join(" ");

  const joinedText = combined.replace(
    /([\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff])\s+(?=[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff])/g,
    "$1"
  );

  const splitCase = t => t.split(/(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])|(?<=[A-Za-z])(?=[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff])|(?<=[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff])(?=[A-Za-z])/);
  const tokens = joinedText
    .split(/\s+/)
    .flatMap(t => splitCase(t))
    .map(t => normalizeText(t))
    .filter(t => t.length >= 2);

  const unique = [...new Set(tokens)];
  return unique;
}

function generateAlternatives(text) {
  const alternatives = [text];

  const charVariants = {
    "0": ["O", "o"],
    "O": ["0"],
    "o": ["0"],
    "1": ["l", "I", "i"],
    "l": ["1", "I"],
    "I": ["1", "l"],
    "i": ["1"],
    "5": ["S", "s"],
    "S": ["5"],
    "s": ["5"],
    "8": ["B"],
    "B": ["8"],
    "6": ["G"],
    "G": ["6"],
    "4": ["A"],
    "A": ["4"],
    "9": ["g"],
    "g": ["9"],
    "2": ["Z"],
    "Z": ["2"],
    "n": ["m", "rn"],
    "m": ["n", "rn"],
    "w": ["vv"],
    "vv": ["w"],
    "v": ["y", "V"],
    "V": ["v", "Y"],
    "y": ["v", "Y"],
    "Y": ["y", "V", "v"],
    "x": ["z", "X"],
    "X": ["x", "Z"],
    "z": ["x", "Z"],
    "Z": ["z", "X", "x"],
    "k": ["t", "K"],
    "K": ["k", "T"],
    "t": ["k", "T"],
    "T": ["t", "K", "k"]
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const variants = charVariants[ch];
    if (variants) {
      for (const v of variants) {
        alternatives.push(text.slice(0, i) + v + text.slice(i + 1));
      }
    }
  }

  const unique = [...new Set(alternatives)];
  return unique;
}

function fuzzyMatchMembers(ocrNames, members) {
  const results = [];
  const matchedMemberIds = new Set();

  ocrNames.forEach(ocrName => {
    const candidates = generateAlternatives(ocrName);
    let bestMatch = null;
    let bestScore = 0;
    let closestMatch = null;
    let closestScore = 0;

    members.forEach(member => {
      for (const candidate of candidates) {
        const score = similarity(candidate, member.name);
        if (score > bestScore && score >= 60) {
          bestScore = score;
          bestMatch = member;
        }
        if (score > closestScore) {
          closestScore = score;
          closestMatch = member;
        }
      }
    });

    if (bestMatch) {
      results.push({
        ocrName,
        member: bestMatch,
        confidence: bestScore,
        source: "ocr",
        manual: false
      });
      matchedMemberIds.add(bestMatch.id);
    } else {
      results.push({
        ocrName,
        member: null,
        confidence: 0,
        source: "ocr",
        manual: false,
        closestMatch,
        closestScore
      });
    }
  });

  return { results, matchedMemberIds };
}