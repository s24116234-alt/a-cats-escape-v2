// Sprite coordinate reference based on the 2x2 sprite sheet:
// /public/assets/aistudio/Gemini_Generated_Image_bg1hsobg1hsobg1h_8d4ce345.jfif
// Total image resolution: typically ~1024x1024 or ~1792x1024 depending on generation.
// We can use normalized (0-1) coordinates or auto-detect dimensions in canvas!

export interface SpriteRect {
  u: number; // 0 to 1
  v: number; // 0 to 1
  w: number; // 0 to 1
  h: number; // 0 to 1
}

// Normalized bounds inside Gemini_Generated_Image_bg1hsobg1hsobg1h_8d4ce345.jfif:
// Top-Left (0, 0, 0.5, 0.5): Cat (阿橘)
// Top-Right (0.5, 0, 0.5, 0.5): Clerk (店員)
// Bottom-Left (0, 0.5, 0.5, 0.5): Customer (顧客)
// Bottom-Right (0.5, 0.5, 0.5, 0.5): Interactive items & Heisei props

export const SPRITE_SHEET_URL = '/assets/aistudio/Gemini_Generated_Image_bg1hsobg1hsobg1h_8d4ce345.jfif';
export const SCENE_MOCKUP_URL = '/assets/aistudio/Gemini_Generated_Image_ch2gt8ch2gt8ch2g_44b3ebc3.jfif';

export const SPRITE_REGIONS = {
  // Cat
  catFront: { u: 0.02, v: 0.10, w: 0.09, h: 0.17 },
  catWalkSide: { u: 0.13, v: 0.10, w: 0.12, h: 0.17 },
  catBack: { u: 0.27, v: 0.10, w: 0.09, h: 0.17 },
  catHiss: { u: 0.13, v: 0.32, w: 0.14, h: 0.14 },
  catPounce: { u: 0.30, v: 0.32, w: 0.17, h: 0.14 },

  // Clerk
  clerkFront: { u: 0.52, v: 0.10, w: 0.09, h: 0.36 },
  clerkSide: { u: 0.64, v: 0.10, w: 0.07, h: 0.36 },
  clerkBack: { u: 0.73, v: 0.10, w: 0.09, h: 0.36 },
  clerkShowerCatch: { u: 0.83, v: 0.15, w: 0.15, h: 0.32 },

  // Customer
  customerFront: { u: 0.03, v: 0.60, w: 0.09, h: 0.36 },
  customerSide: { u: 0.15, v: 0.60, w: 0.08, h: 0.36 },
  customerBack: { u: 0.23, v: 0.60, w: 0.10, h: 0.36 },
  customerReachSlip: { u: 0.34, v: 0.61, w: 0.13, h: 0.35 },

  // Items
  cansTower: { u: 0.52, v: 0.60, w: 0.09, h: 0.12 },
  cansTumbled: { u: 0.63, v: 0.62, w: 0.10, h: 0.10 },
  foodBag: { u: 0.76, v: 0.60, w: 0.08, h: 0.12 },
  foodSpilled: { u: 0.85, v: 0.63, w: 0.12, h: 0.09 },
  bucketRag: { u: 0.52, v: 0.80, w: 0.09, h: 0.12 },
  bucketPuddle: { u: 0.63, v: 0.79, w: 0.11, h: 0.14 },

  // Heisei Items
  flipPhoneBlue: { u: 0.76, v: 0.79, w: 0.06, h: 0.14 },
  flipPhoneBlack: { u: 0.83, v: 0.79, w: 0.06, h: 0.14 },
  tamagotchi: { u: 0.90, v: 0.80, w: 0.06, h: 0.13 },
};
