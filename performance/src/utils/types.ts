export interface IndividualTestResult {
  name: string;
  opsPerSecond: number;
  avgTime: number;
  margin: number;
  samples: number;
}

export interface TestResult {
  name: string;
  results: IndividualTestResult[];
}
