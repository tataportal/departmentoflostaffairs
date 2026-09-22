import {Color} from 'three';
import {TEMPERATURES} from './state.js';

// Bloom uses linear luminance, not the brightest RGB channel. Match the
// neutral shade's luminance without removing the selected temperature's hue.
export const luminance=color=>.2126*color.r+.7152*color.g+.0722*color.b;
const reference=luminance(new Color(TEMPERATURES.neutral.color));
export const emissionGain=color=>reference/Math.max(.001,luminance(color));
