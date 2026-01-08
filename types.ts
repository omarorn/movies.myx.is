
export enum AppState {
  KEY_SELECTION = 'KEY_SELECTION',
  UPLOAD = 'UPLOAD',
  CONFIGURE = 'CONFIGURE',
  ANALYZING = 'ANALYZING',
  STORYBOARD = 'STORYBOARD',
  GENERATING = 'GENERATING',
  RESULT = 'RESULT'
}

export type Genre = 'Sci-fi' | 'Comedy' | 'Drama' | 'Horror' | 'Action' | 'Romance';
export type Mood = 'Uplifting' | 'Suspenseful' | 'Heartwarming' | 'Dark' | 'Epic' | 'Noir';
export type Archetype = 'Reluctant Hero' | 'Wise Mentor' | 'Cunning Villain' | 'Comic Relief' | 'Femme Fatale' | 'The Outcast';
export type CameraMovement = 'Static' | 'Cinematic Push-In' | 'Slow Pan Left' | 'Slow Pan Right' | 'Handheld Shake' | 'Drone Flyover' | 'Zoom Out';

export interface Subtitle {
  startTime: number;
  endTime: number;
  text: string;
}

export interface GenerationConfig {
  genre: Genre;
  mood: Mood;
  archetypes: Archetype[];
  camera: CameraMovement;
  includeSubtitles: boolean;
}

export interface MovieScene {
  title: string;
  description: string;
  visualPrompt: string;
  genre: string;
  mood: string;
  characters: string[];
  subtitles?: Subtitle[];
  storyboardImage?: string; // Base64 or URL
}

export interface GenerationStatus {
  message: string;
  progress: number;
}
