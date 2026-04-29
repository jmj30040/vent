export type CalculationResult = {
  maxCmh: number;
  maxCfm: number;
  cmh: number;
  cfm: number;
  cmhRate: number;
  cfmRate: number;
};

type Token =
  | { type: 'number'; value: number }
  | { type: 'variable'; name: string }
  | { type: 'operator'; value: '+' | '-' | '*' | '/' }
  | { type: 'paren'; value: '(' | ')' };

const CFM_CONVERSION_RATE = 1.699;
const PRECEDENCE = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
} as const;

export function calculateVentilation(
  formula: string,
  velocity: number,
  maxCmh: number,
  maxCfm?: number,
): CalculationResult {
  if (!Number.isFinite(velocity) || velocity < 0) {
    throw new Error('풍속은 0 이상 숫자만 입력할 수 있습니다.');
  }

  const cmh = evaluateFormula(formula, { velocity });

  if (!Number.isFinite(cmh) || cmh < 0) {
    throw new Error('계산 결과가 올바르지 않습니다. 계산식을 확인해 주세요.');
  }

  return {
    maxCmh,
    maxCfm: maxCfm ?? maxCmh / CFM_CONVERSION_RATE,
    cmh,
    cfm: cmh / CFM_CONVERSION_RATE,
    cmhRate: (cmh / maxCmh) * 100,
    cfmRate: (cmh / maxCmh) * 100,
  };
}

export function evaluateFormula(
  formula: string,
  variables: Record<string, number>,
): number {
  if (!formula.trim()) {
    throw new Error('계산식을 입력해 주세요.');
  }

  const tokens = tokenize(formula);
  const postfix = toPostfix(tokens);
  return evaluatePostfix(postfix, variables);
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/\d|\./.test(char)) {
      let value = '';
      while (index < input.length && /[\d.]/.test(input[index])) {
        value += input[index];
        index += 1;
      }

      if (!/^\d+(\.\d+)?$|^\.\d+$/.test(value)) {
        throw new Error('계산식의 숫자 형식이 올바르지 않습니다.');
      }

      tokens.push({ type: 'number', value: Number(value) });
      continue;
    }

    if (/[a-zA-Z_]/.test(char)) {
      let name = '';
      while (index < input.length && /[a-zA-Z0-9_]/.test(input[index])) {
        name += input[index];
        index += 1;
      }
      tokens.push({ type: 'variable', name });
      continue;
    }

    if ('+-*/'.includes(char)) {
      tokens.push({ type: 'operator', value: char as '+' | '-' | '*' | '/' });
      index += 1;
      continue;
    }

    if (char === '(' || char === ')') {
      tokens.push({ type: 'paren', value: char });
      index += 1;
      continue;
    }

    throw new Error('계산식에 사용할 수 없는 문자가 있습니다.');
  }

  return normalizeUnaryMinus(tokens);
}

function normalizeUnaryMinus(tokens: Token[]): Token[] {
  const normalized: Token[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const previous = tokens[index - 1];
    const isUnaryMinus =
      token.type === 'operator' &&
      token.value === '-' &&
      (!previous ||
        previous.type === 'operator' ||
        (previous.type === 'paren' && previous.value === '('));

    if (isUnaryMinus) {
      const next = tokens[index + 1];
      if (next?.type !== 'number') {
        throw new Error('계산식의 음수 표기 위치가 올바르지 않습니다.');
      }
      normalized.push({ type: 'number', value: -next.value });
      index += 1;
      continue;
    }

    normalized.push(token);
  }

  return normalized;
}

function toPostfix(tokens: Token[]): Token[] {
  const output: Token[] = [];
  const operators: Token[] = [];

  tokens.forEach((token) => {
    if (token.type === 'number' || token.type === 'variable') {
      output.push(token);
      return;
    }

    if (token.type === 'operator') {
      while (true) {
        const previous = operators[operators.length - 1];
        if (
          !previous ||
          previous.type !== 'operator' ||
          PRECEDENCE[previous.value] < PRECEDENCE[token.value]
        ) {
          break;
        }
        output.push(operators.pop() as Token);
      }
      operators.push(token);
      return;
    }

    if (token.value === '(') {
      operators.push(token);
      return;
    }

    while (operators.length) {
      const previous = operators.pop() as Token;
      if (previous.type === 'paren' && previous.value === '(') {
        return;
      }
      output.push(previous);
    }

    throw new Error('계산식의 괄호가 올바르지 않습니다.');
  });

  while (operators.length) {
    const token = operators.pop() as Token;
    if (token.type === 'paren') {
      throw new Error('계산식의 괄호가 올바르지 않습니다.');
    }
    output.push(token);
  }

  return output;
}

function evaluatePostfix(tokens: Token[], variables: Record<string, number>): number {
  const stack: number[] = [];

  tokens.forEach((token) => {
    if (token.type === 'number') {
      stack.push(token.value);
      return;
    }

    if (token.type === 'variable') {
      const value = variables[token.name];
      if (value === undefined) {
        throw new Error(`알 수 없는 변수입니다: ${token.name}`);
      }
      stack.push(value);
      return;
    }

    if (token.type === 'operator') {
      const right = stack.pop();
      const left = stack.pop();

      if (left === undefined || right === undefined) {
        throw new Error('계산식 형식이 올바르지 않습니다.');
      }

      if (token.value === '+') stack.push(left + right);
      if (token.value === '-') stack.push(left - right);
      if (token.value === '*') stack.push(left * right);
      if (token.value === '/') {
        if (right === 0) {
          throw new Error('0으로 나눌 수 없습니다.');
        }
        stack.push(left / right);
      }
    }
  });

  if (stack.length !== 1) {
    throw new Error('계산식 형식이 올바르지 않습니다.');
  }

  return stack[0];
}
