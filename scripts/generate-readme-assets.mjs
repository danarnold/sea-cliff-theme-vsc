import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const rootDir = process.cwd();
const packageJson = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'),
);

const themeEntries = packageJson.contributes.themes.map((entry) => ({
  label: entry.label.replace('Sea Cliff ', ''),
  path: path.join(rootDir, entry.path),
  theme: JSON.parse(fs.readFileSync(path.join(rootDir, entry.path), 'utf8')),
}));

const uiPairs = [
  ['activityBar.foreground', 'activityBar.background'],
  ['activityBar.inactiveForeground', 'activityBar.background'],
  ['badge.foreground', 'badge.background'],
  ['breadcrumb.foreground', 'breadcrumb.background'],
  ['breadcrumb.activeSelectionForeground', 'breadcrumb.background'],
  ['commandCenter.foreground', 'commandCenter.background'],
  ['dropdown.foreground', 'dropdown.background'],
  ['editor.foreground', 'editor.background'],
  ['editorLineNumber.foreground', 'editor.background'],
  ['editorLineNumber.activeForeground', 'editor.background'],
  ['input.foreground', 'input.background'],
  ['input.placeholderForeground', 'input.background'],
  ['list.activeSelectionForeground', 'list.activeSelectionBackground'],
  ['menu.foreground', 'menu.background'],
  ['menu.selectionForeground', 'menu.selectionBackground'],
  ['panelTitle.activeForeground', 'panel.background'],
  ['quickInput.foreground', 'quickInput.background'],
  ['quickInputList.focusForeground', 'quickInputList.focusBackground'],
  ['sideBar.foreground', 'sideBar.background'],
  ['sideBarTitle.foreground', 'sideBar.background'],
  ['statusBar.foreground', 'statusBar.background'],
  ['tab.activeForeground', 'tab.activeBackground'],
  ['tab.inactiveForeground', 'tab.inactiveBackground'],
  ['terminal.foreground', 'terminal.background'],
  ['titleBar.activeForeground', 'titleBar.activeBackground'],
  ['titleBar.inactiveForeground', 'titleBar.inactiveBackground'],
];

const nonTextPairs = [
  ['activityBar.border', 'activityBar.background'],
  ['dropdown.border', 'dropdown.background'],
  ['editorIndentGuide.background1', 'editor.background'],
  ['editorIndentGuide.activeBackground1', 'editor.background'],
  ['editorWhitespace.foreground', 'editor.background'],
  ['editor.selectionBackground', 'editor.background'],
  ['editor.selectionHighlightBackground', 'editor.background'],
  ['list.activeSelectionBackground', 'sideBar.background'],
  ['list.hoverBackground', 'sideBar.background'],
  ['menu.border', 'menu.background'],
  ['menu.selectionBackground', 'menu.background'],
  ['panel.border', 'panel.background'],
  ['sideBar.border', 'sideBar.background'],
  ['statusBar.border', 'statusBar.background'],
  ['tab.border', 'tab.inactiveBackground'],
  ['tab.activeBorder', 'tab.activeBackground'],
  ['titleBar.border', 'titleBar.activeBackground'],
];

const syntaxPalette = [
  ['Comments', '#a6b3c2'],
  ['Keywords', '#ffb3c1'],
  ['Strings', '#a8e6cf'],
  ['Numbers', '#f3e1a6'],
  ['Types', '#ffc4a6'],
  ['Variables', '#8fd3ff'],
  ['Functions', '#d7b4ff'],
  ['Classes', '#b8c0ff'],
  ['Constants', '#f2a7c6'],
  ['Instance vars', '#f2b6a0'],
];

function parseHex(hex) {
  const raw = hex.replace('#', '').trim();
  if (raw.length === 3) {
    return {
      r: Number.parseInt(raw[0] + raw[0], 16),
      g: Number.parseInt(raw[1] + raw[1], 16),
      b: Number.parseInt(raw[2] + raw[2], 16),
      a: 1,
    };
  }
  if (raw.length === 4) {
    return {
      r: Number.parseInt(raw[0] + raw[0], 16),
      g: Number.parseInt(raw[1] + raw[1], 16),
      b: Number.parseInt(raw[2] + raw[2], 16),
      a: Number.parseInt(raw[3] + raw[3], 16) / 255,
    };
  }
  if (raw.length === 6) {
    return {
      r: Number.parseInt(raw.slice(0, 2), 16),
      g: Number.parseInt(raw.slice(2, 4), 16),
      b: Number.parseInt(raw.slice(4, 6), 16),
      a: 1,
    };
  }
  if (raw.length === 8) {
    return {
      r: Number.parseInt(raw.slice(0, 2), 16),
      g: Number.parseInt(raw.slice(2, 4), 16),
      b: Number.parseInt(raw.slice(4, 6), 16),
      a: Number.parseInt(raw.slice(6, 8), 16) / 255,
    };
  }
  throw new Error(`Unsupported hex color: ${hex}`);
}

function compositeColor(fg, bg) {
  const alpha = fg.a + bg.a * (1 - fg.a);
  return {
    r: Math.round((fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / alpha),
    g: Math.round((fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / alpha),
    b: Math.round((fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / alpha),
    a: alpha,
  };
}

function relativeChannel(value) {
  const srgb = value / 255;
  return srgb <= 0.03928
    ? srgb / 12.92
    : ((srgb + 0.055) / 1.055) ** 2.4;
}

function luminance(color) {
  return (
    0.2126 * relativeChannel(color.r) +
    0.7152 * relativeChannel(color.g) +
    0.0722 * relativeChannel(color.b)
  );
}

function contrastRatio(foregroundHex, backgroundHex) {
  const foreground = parseHex(foregroundHex);
  const background = parseHex(backgroundHex);
  const resolvedForeground =
    foreground.a < 1 ? compositeColor(foreground, background) : foreground;
  const lighter = Math.max(
    luminance(resolvedForeground),
    luminance(background),
  );
  const darker = Math.min(
    luminance(resolvedForeground),
    luminance(background),
  );
  return (lighter + 0.05) / (darker + 0.05);
}

function writePalettePng(themeEntry) {
  const { colors } = themeEntry.theme;
  const outputPath = path.join(
    rootDir,
    'assets',
    `sea-cliff-${themeEntry.label.toLowerCase()}-palette.png`,
  );

  const palette = [
    colors['activityBar.background'],
    colors['sideBar.background'],
    colors['editor.background'],
    colors['input.background'],
    colors['sideBar.border'],
    colors['editor.foreground'],
    colors['sideBar.foreground'],
    colors['input.placeholderForeground'],
    colors['tab.activeBorder'],
    colors['editorCursor.foreground'],
    ...syntaxPalette.map(([, color]) => color),
  ];

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sea-cliff-'));
  const ppmPath = path.join(tempDir, `${themeEntry.label.toLowerCase()}.ppm`);
  const width = 1320;
  const height = 240;
  const padding = 36;
  const gap = 18;
  const columns = 10;
  const rows = Math.ceil(palette.length / columns);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const tileWidth = Math.floor((innerWidth - gap * (columns - 1)) / columns);
  const tileHeight = Math.floor((innerHeight - gap * (rows - 1)) / rows);
  const background = parseHex(colors['editor.background']);
  const pixels = Buffer.alloc(width * height * 3);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 3;
      pixels[offset] = background.r;
      pixels[offset + 1] = background.g;
      pixels[offset + 2] = background.b;
    }
  }

  palette.forEach((hex, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x0 = padding + column * (tileWidth + gap);
    const y0 = padding + row * (tileHeight + gap);
    const color = parseHex(hex);

    for (let y = y0; y < y0 + tileHeight; y += 1) {
      for (let x = x0; x < x0 + tileWidth; x += 1) {
        const offset = (y * width + x) * 3;
        pixels[offset] = color.r;
        pixels[offset + 1] = color.g;
        pixels[offset + 2] = color.b;
      }
    }
  });

  const header = Buffer.from(`P6\n${width} ${height}\n255\n`, 'ascii');
  fs.writeFileSync(ppmPath, Buffer.concat([header, pixels]));
  execFileSync('convert', [ppmPath, outputPath]);
  fs.rmSync(tempDir, { recursive: true, force: true });
}

function themeSummary(theme) {
  const { colors } = theme;
  const uiRatios = uiPairs.map(([fg, bg]) => contrastRatio(colors[fg], colors[bg]));
  const nonTextRatios = nonTextPairs.map(([fg, bg]) =>
    contrastRatio(colors[fg], colors[bg]),
  );
  const syntaxRatios = syntaxPalette.map(([, swatch]) =>
    contrastRatio(swatch, colors['editor.background']),
  );

  return {
    editorText: contrastRatio(colors['editor.foreground'], colors['editor.background']),
    placeholderText: contrastRatio(
      colors['input.placeholderForeground'],
      colors['input.background'],
    ),
    lineNumbers: contrastRatio(
      colors['editorLineNumber.foreground'],
      colors['editor.background'],
    ),
    syntaxMin: Math.min(...syntaxRatios),
    uiTextMin: Math.min(...uiRatios),
    nonTextMin: Math.min(...nonTextRatios),
    activeIndentGuide: contrastRatio(
      colors['editorIndentGuide.activeBackground1'],
      colors['editor.background'],
    ),
  };
}

fs.mkdirSync(path.join(rootDir, 'assets'), { recursive: true });
for (const themeEntry of themeEntries) {
  writePalettePng(themeEntry);
}

const summaries = themeEntries.map((entry) => ({
  theme: entry.theme.name,
  ...themeSummary(entry.theme),
}));

console.log(JSON.stringify(summaries, null, 2));
