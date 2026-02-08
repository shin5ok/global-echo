
export enum Accent {
  USA = 'USA',
  India = 'India',
  Singapore = 'Singapore',
  Australia = 'Australia',
  HongKong = 'Hong Kong'
}

export enum Tone {
  Cheerful = 'Cheerful',
  Flat = 'Flat',
  Business = 'Business-like',
  Inquisitive = 'Inquisitive',
  Serious = 'Serious'
}

export interface FeedbackItem {
  category: string;
  comment: string;
}

export interface EvaluationResult {
  score: number;
  feedback: string[];
}
