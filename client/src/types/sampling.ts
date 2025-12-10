// Step Type Definitions for Sampling Templates

export type StepType = 'TEXT' | 'INPUT' | 'IMAGE' | 'DOCUMENT' | 'CHECKBOX' | 'SIGNATURE';

export interface BaseStep {
    id: string;
    type: StepType;
    title: string;
    description?: string;
    required?: boolean;
    order: number;
}

export interface TextStep extends BaseStep {
    type: 'TEXT';
    content: string;  // Rich text instructions
}

export interface InputStep extends BaseStep {
    type: 'INPUT';
    inputType: 'text' | 'number' | 'date' | 'time' | 'email';
    placeholder?: string;
    unit?: string;  // e.g., "°C", "mg/L", "m"
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        minLength?: number;
        maxLength?: number;
    };
}

export interface ImageStep extends BaseStep {
    type: 'IMAGE';
    allowMultiple: boolean;
    maxImages?: number;
    requireGPS?: boolean;
    instructions?: string;
}

export interface DocumentStep extends BaseStep {
    type: 'DOCUMENT';
    acceptedFormats: string[];  // ['.pdf', '.doc', '.xlsx']
    maxSize?: number;  // MB
    allowMultiple?: boolean;
}

export interface CheckboxStep extends BaseStep {
    type: 'CHECKBOX';
    label: string;
    requiresComment?: boolean;
    commentPlaceholder?: string;
}

export interface SignatureStep extends BaseStep {
    type: 'SIGNATURE';
    signerName?: string;
    signerRole?: string;
    requireName?: boolean;
    requireRole?: boolean;
}

export type TemplateStep = TextStep | InputStep | ImageStep | DocumentStep | CheckboxStep | SignatureStep;

// Sampling Data Interfaces
export interface StepData {
    stepId: string;
    stepType: StepType;
    value: any;
    timestamp: string;
    gpsLocation?: {
        latitude: number;
        longitude: number;
    };
    files?: string[];  // URLs to uploaded files
    metadata?: Record<string, any>;
}

export interface SamplingData {
    templateId: string;
    templateName: string;
    startedAt: string;
    completedAt?: string;
    steps: StepData[];
    progress: number;  // 0-100
    syncStatus: 'pending' | 'synced' | 'error';
}
