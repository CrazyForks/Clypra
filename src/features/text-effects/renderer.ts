import { applyFontConfig, wrapText, resolveFontFamilyName } from "./lib/helpers";
import { TextEffectDefinition } from "./types/types";
import { hasRegisteredEngine, renderRegisteredEffect } from "./registry";

/**
 * Core Canvas 2D Text Effects Rendering Context Engine.
 * Renders full text layers onto any rendering context.
 *
 * Effect dispatch is driven entirely by the registry — no per-effect if-blocks here.
 * To add a new effect: drop its file in effects/ and add two lines to registry.ts.
 */
export const renderTextEffectToContext = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  text: string,
  effect: TextEffectDefinition,
  fontSize: number,
  _x: number,
  _y: number,
  canvasWidth: number,
  canvasHeight: number,
  time?: number,
  clipStartTime?: number,
  clipDuration?: number
) => {
  // Overhaul context with a dynamic text animation interception wrapper
  const originalFillText = ctx.fillText;
  const originalStrokeText = ctx.strokeText;

  const animation = effect.animation;
  const hasAnimation = animation && animation.type !== "none";

  if (hasAnimation && typeof time === "number" && typeof clipStartTime === "number" && typeof clipDuration === "number") {
    const localTime = Math.max(0, time - clipStartTime);
    const progress = Math.min(1.0, localTime / Math.max(0.1, clipDuration));

    const drawAnimatedText = (
      originalFn: (text: string, x: number, y: number) => void,
      txt: string,
      x: number,
      y: number
    ) => {
      ctx.save();

      // Retrieve current text properties from context
      const font = ctx.font;
      const align = ctx.textAlign || "center";
      const baseline = ctx.textBaseline || "alphabetic";
      const letterSpacing = typeof (ctx as any).letterSpacing === "string" ? parseFloat((ctx as any).letterSpacing) : 0;

      // We will draw letter-by-letter, so set alignment to left
      ctx.textAlign = "left";

      // Measure total text width to calculate start X based on alignment
      const totalWidth = ctx.measureText(txt).width;
      let startX = x;
      if (align === "center") {
        startX = x - totalWidth / 2;
      } else if (align === "right") {
        startX = x - totalWidth;
      }

      // Draw character by character
      let cumulativeWidth = 0;
      const originalAlpha = ctx.globalAlpha;

      for (let i = 0; i < txt.length; i++) {
        const char = txt[i];
        const charWidth = ctx.measureText(char).width;
        const charX = startX + cumulativeWidth;

        // Apply animations
        let drawChar = true;
        let charY = y;
        let charXOffset = 0;

        if (animation.type === "typewriter") {
          const typewriterProgress = progress;
          const visibleCount = Math.floor(typewriterProgress * txt.length);
          if (i >= visibleCount) {
            drawChar = false;
          }
        } else if (animation.type === "wave") {
          const waveSpeed = animation.speed ?? 1.0;
          const waveAmp = animation.amplitude ?? (fontSize * 0.12);
          const waveFreq = animation.frequency ?? 5.0;
          const waveY = Math.sin(localTime * waveFreq * waveSpeed + i * 0.4) * waveAmp;
          charY = y + waveY;
        } else if (animation.type === "fade") {
          // Staggered fade in: delay starts from 0 to 0.4 seconds based on character index
          const staggerDelay = (i / txt.length) * 0.4;
          const fadeDuration = 0.25;
          const charProgress = Math.max(0, Math.min(1.0, (localTime - staggerDelay) / fadeDuration));
          ctx.globalAlpha = originalAlpha * charProgress;
        } else if (animation.type === "glitch") {
          // Jitter/skew characters occasionally based on a time trigger
          const glitchTimeTrigger = Math.floor(localTime * 10); // changes 10 times a second
          const noise = Math.sin(glitchTimeTrigger * 12.9898) * 43758.5453;
          const randomVal = noise - Math.floor(noise);

          if (randomVal < 0.15) { // 15% chance of glitch active at this instant
            // Apply slight skew/offset to some letters
            const letterHash = Math.sin(i * 7.13) * 1000;
            const letterRandom = letterHash - Math.floor(letterHash);
            if (letterRandom < 0.3) {
              charXOffset = (Math.random() - 0.5) * (fontSize * 0.08);
              charY = y + (Math.random() - 0.5) * (fontSize * 0.08);
            }
          }
        }

        if (drawChar) {
          originalFn.call(ctx, char, charX + charXOffset, charY);
        }

        cumulativeWidth += charWidth + letterSpacing;
      }

      ctx.restore();
    };

    ctx.fillText = function (txt, x, y) {
      drawAnimatedText(originalFillText, txt, x, y);
    };

    ctx.strokeText = function (txt, x, y) {
      drawAnimatedText(originalStrokeText, txt, x, y);
    };
  }

  // Registry dispatch — covers all studio-generated engine effects.
  // Registered engines set their own ctx.font and expect default textBaseline ("alphabetic").
  // Do NOT call applyFontConfig here — it sets textBaseline = "middle" which breaks
  // the engines' vertical centering math (fontSize * 0.8 offset assumes "alphabetic").
  if (hasRegisteredEngine(effect?.id)) {
    renderRegisteredEffect(ctx, effect, text, fontSize, canvasWidth, canvasHeight, time, clipStartTime, clipDuration);
    
    // Restore original functions
    ctx.fillText = originalFillText;
    ctx.strokeText = originalStrokeText;
    return;
  }

  // Apply baseline font config only for the fallback generic renderer
  applyFontConfig(ctx, effect.font, fontSize);

  // ── Fallback generic renderer ────────────────────────────────────────────
  // Reached only for effects that are not registered in the registry.
  // Dynamic Bounding Box Word Wrapping: wraps sentences to prevent viewport bleeding!
  const maxWidth = canvasWidth * 0.8;
  const rawLines = text.split("\n");
  const lines: string[] = [];
  rawLines.forEach((rl) => {
    lines.push(...wrapText(ctx, rl, maxWidth));
  });

  const lineHeightPx = fontSize * (effect.font.lineHeight || 1.2);
  const totalHeight = (lines.length - 1) * lineHeightPx;
  const startY = _y - totalHeight / 2;

  const fill = effect.fills?.[0];
  const stroke = effect.strokes?.[0];
  const shadow = effect.shadows?.[0];

  ctx.save();

  // Apply Drop Shadow
  if (shadow) {
    ctx.shadowColor = shadow.color || "rgba(0,0,0,0.5)";
    ctx.shadowBlur = shadow.blur ?? 5;
    ctx.shadowOffsetX = shadow.offsetX ?? 0;
    ctx.shadowOffsetY = shadow.offsetY ?? 0;
  }

  // Set Fill Style
  const hasFill = !fill || fill.type !== "none";
  if (hasFill) {
    if (fill && fill.type === "gradient") {
      const stops = fill.gradient?.stops || [];
      const grad = ctx.createLinearGradient(_x, startY - fontSize / 2, _x, startY + totalHeight + fontSize / 2);
      stops.forEach((stop: any) => {
        const offset = typeof stop.offset === "number" ? stop.offset : (stop.position ?? 0);
        grad.addColorStop(offset, stop.color);
      });
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = fill?.color || "#ffffff";
    }
  }

  // Set Stroke Style
  const hasStroke = !!stroke;
  if (hasStroke) {
    ctx.strokeStyle = stroke.color || "#000000";
    ctx.lineWidth = stroke.width ?? 2;
    ctx.lineJoin = stroke.lineJoin || "round";
  }

  // Draw lines
  lines.forEach((line, i) => {
    const currentY = startY + i * lineHeightPx;
    if (hasFill) {
      ctx.fillText(line, _x, currentY);
    }
    if (hasStroke) {
      // Disable shadow for outline/stroke to keep it crisp
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.strokeText(line, _x, currentY);
    }
  });

  ctx.restore();

  // Restore original functions
  ctx.fillText = originalFillText;
  ctx.strokeText = originalStrokeText;
};

/**
 * Core Canvas 2D Text Effects Rendering Engine.
 * Renders full text layers in premium NLE composition order.
 * @param canvas - The HTMLCanvasElement to render onto.
 * @param text - The text string, supporting newlines.
 * @param effect - The text effect definition block.
 * @param fontSize - Master font size in pixels.
 */
export const renderTextEffect = (canvas: HTMLCanvasElement, text: string, effect: TextEffectDefinition, fontSize: number) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  console.log("RENDER TEXT: ", effect);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  renderTextEffectToContext(ctx, text, effect, fontSize, canvas.width / 2, canvas.height / 2, canvas.width, canvas.height);
};

/**
 * Renders the full text effect on a configurable offscreen canvas and returns a high-resolution export PNG data URL.
 * @param text - The text string.
 * @param effect - The text effect definition block.
 * @param fontSize - Master font size in pixels.
 * @param width - Canvas export width in px (default: 800).
 * @param height - Canvas export height in px (default: 400).
 * @returns A base64 PNG data URL string.
 */
export const renderTextEffectToDataURL = (text: string, effect: TextEffectDefinition, fontSize: number, width: number = 800, height: number = 400): string => {
  const offscreen = document.createElement("canvas");
  offscreen.width = width;
  offscreen.height = height;

  renderTextEffect(offscreen, text, effect, fontSize);
  return offscreen.toDataURL("image/png");
};
