// Deterministic mock model for adapter contract tests. No network.
export function mockModel(rounds) {
  return async () => ({ rounds });
}

export function basicRounds() {
  return [{
    id: 'R01', span: ['q001', 'q002'], title: 'mock', scope: 'family', short: true,
    p_codes: ['Z000'], c_codes: ['Z000'], entities: ['mock', 'test'],
    focus: 'Alice', participants: ['Alice', 'Bob'], scenes: ['test'],
  }];
}

export function basicTranscript() {
  return [
    { id: 'q001', role: 'user', text: 'hello' },
    { id: 'q002', role: 'ai', text: 'hi' },
  ];
}
