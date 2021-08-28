type Input = Record<string, unknown>;
type SuccessfulOutput = Input;
type FailedOutput = Record<string, readonly string[]>;

export type Runner = (key: string, value: unknown, meta?: Input) => Result;
type Fold = (
  f: (value: FailedOutput) => unknown,
  g: (value: SuccessfulOutput) => unknown
) => unknown;

type Validation = {
  readonly run: Runner;
  readonly concat: (other: Validation) => Validation;
};

type Result = {
  readonly isFail: boolean;
  readonly x: Input | FailedOutput;
  readonly fold: Fold;
  readonly concat: (other: Result) => Result;
};

export type Schema = Record<string, readonly Validation[]>;

const Validation = (run: Runner): Validation => ({
  run,
  concat: (other) =>
    Validation((key, x, meta) =>
      run(key, x, meta).concat(other.run(key, x, meta))
    ),
});

const Success = (x: Input = {}): Result => ({
  isFail: false,
  x,
  fold: (_, g) => g(x),
  concat: (other) => (other.isFail ? other : Success(x)),
});

const Fail = (x: FailedOutput): Result => ({
  isFail: true,
  x,
  fold: (f) => f(x),
  concat: (other) =>
    other.isFail ? Fail(mergeFailures(other.x as FailedOutput, x)) : Fail(x),
});

const mergeFailures = (
  fail1: FailedOutput,
  fail2: FailedOutput
): FailedOutput =>
  Object.entries(fail2).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]: [...(acc[key] ?? []), ...value],
    }),
    fail1 ?? {}
  );

const validate = (schema: Schema, obj: Input): Result => {
  console.log(obj);
  return Object.keys(schema).reduce(
    (acc, key) =>
      acc.concat(schema[key].reduce(concat).run(key, obj[key], obj)),
    Success(obj)
  );
};

const concat = (f: Validation, g: Validation) => g?.concat(f) ?? g;

const pattern =
  (re: RegExp, errorMessage?: string): Runner =>
  (key, x) =>
    typeof x !== 'string'
      ? Fail({ [key]: [`${key} must be a string`] })
      : re.test(x)
      ? Success()
      : Fail({ [key]: [errorMessage ?? `${key} bad format`] });

const isPresent = (errorMessage?: string) =>
  Validation((key, x) =>
    x ? Success() : Fail({ [key]: [errorMessage ?? `${key} is not present`] })
  );

const isEmail = (errorMessage?: string) =>
  Validation(
    pattern(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      errorMessage ?? 'Bad email format'
    )
  );

const isTrue = (errorMessage?: string) =>
  Validation((key, x) =>
    x === true
      ? Success()
      : Fail({ [key]: [errorMessage ?? `${key} must be set`] })
  );

const maxChars = (max: number, errorMessage?: string) =>
  Validation((key, x) =>
    typeof x !== 'string'
      ? Fail({ [key]: [`${key} must be a string`] })
      : x.length < max
      ? Success()
      : Fail({
          [key]: [errorMessage ?? `${key} has to be shorter than ${max} chars`],
        })
  );

const minChars = (min: number, errorMessage?: string) =>
  Validation((key, x) =>
    typeof x !== 'string'
      ? Fail({ [key]: [`${key} must be a string`] })
      : x.length >= min
      ? Success()
      : Fail({
          [key]: [errorMessage ?? `${key} has to be greater than ${min} chars`],
        })
  );

const minVal = (min: number, errorMessage?: string) =>
  Validation((key, x) =>
    typeof x !== 'number'
      ? Fail({ [key]: [`${key} must be a number`] })
      : x >= min
      ? Success()
      : Fail({
          [key]: [errorMessage ?? `${key} has to be greater than ${min}`],
        })
  );

const maxVal = (max: number, errorMessage?: string) =>
  Validation((key, x) =>
    typeof x !== 'number'
      ? Fail({ [key]: [`${key} must be a number`] })
      : x <= max
      ? Success()
      : Fail({ [key]: [errorMessage ?? `${key} has to be less than ${max}`] })
  );

const equals = (comparisonKey: string, errorMessage?: string) =>
  Validation((key, x, meta) => {
    console.log({ key, x, meta, comparisonKey });
    return x === meta?.[comparisonKey]
      ? Success()
      : Fail({ [key]: [errorMessage ?? `${comparisonKey} does not match`] });
  });

const Validators = {
  equals,
  maxVal,
  minVal,
  minChars,
  maxChars,
  isTrue,
  isEmail,
  isPresent,
  pattern,
};

export { Validation, Success, Fail, validate, Validators };
