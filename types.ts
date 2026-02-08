
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

export interface CategoryEvaluation {
  score: number;
  advice: string;
}

export interface DetailedEvaluation {
  overallScore: number;
  pronunciation: CategoryEvaluation;
  prosody: CategoryEvaluation;
  fluency: CategoryEvaluation;
  chunking: CategoryEvaluation;
  expressiveness: CategoryEvaluation;
}
