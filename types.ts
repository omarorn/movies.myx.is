
export enum AppState {
  KEY_SELECTION = 'KEY_SELECTION',
  UPLOAD = 'UPLOAD',
  CONFIGURE = 'CONFIGURE',
  ANALYZING = 'ANALYZING',
  GENERATING = 'GENERATING',
  RESULT = 'RESULT'
}

export type Genre = 'Sci-fi' | 'Comedy' | 'Drama' | 'Horror' | 'Action' | 'Romance';
export type Mood = 'Uplifting' | 'Suspenseful' | 'Heartwarming' | 'Dark' | 'Epic' | 'Noir';
export type Archetype = 'Reluctant Hero' | 'Wise Mentor' | 'Cunning Villain' | 'Comic Relief' | 'Femme Fatale' | 'The Outcast';

export interface GenerationConfig {
  genre: Genre;
  mood: Mood;
  archetypes: Archetype[];
}

export interface MovieScene {
  title: string;
  description: string;
  visualPrompt: string;
  genre: string;
  mood: string;
  characters: string[];
}

export interface GenerationStatus {
  message: string;
  progress: number;
}
