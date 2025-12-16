import { Subject } from '../types';
import { HSC_ICT } from './hsc_ict';
import { HSC_PHYSICS } from './hsc_physics';

// To add a new subject, import it above and add it to this array.
export const AVAILABLE_SUBJECTS: Subject[] = [
    HSC_ICT,
    HSC_PHYSICS
];

export const DEFAULT_SUBJECT = AVAILABLE_SUBJECTS[0];
