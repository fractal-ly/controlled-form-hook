import * as React from 'react';
import { Schema, validate } from 'tiny-validation';
import { useSafeState } from './hooks/useSafeState';

type InputTarget = EventTarget & HTMLInputElement;

export interface CustomTarget {
  name: string;
  type?: string;
  value: unknown;
}

type Target = InputTarget | CustomTarget;

export type SimulatedChangeEvent<T extends Target> = {
  target: T;
  persist: undefined;
};

export type ChangeEvent = SimulatedChangeEvent<CustomTarget>;

type FormState<T> = {
  values: T;
  errors: Record<string, string[]>;
  visited: Record<string, boolean>;
  hasErrors: boolean;
};

enum Actions {
  VALUES = 'set_values',
  ERRORS = 'set_errors',
  CHANGE = 'handle_change',
  RESET = 'reset'
}

type Action<T> =
  | { type: Actions.VALUES; payload: T }
  | { type: Actions.ERRORS; payload: Record<string, string[]> }
  | { type: Actions.CHANGE; payload: Target }
  | { type: Actions.RESET; payload: T };

function reducer<T>(state: FormState<T>, action: Action<T>): FormState<T> {
  switch (action.type) {
    case Actions.VALUES:
      return { ...state, values: action.payload };

    case Actions.ERRORS:
      return {
        ...state,
        errors: action.payload,
        hasErrors: Object.keys(action.payload).length !== 0
      };

    case Actions.RESET:
      return {
        values: action.payload,
        errors: {},
        visited: {},
        hasErrors: false
      };

    case Actions.CHANGE: {
      const { name, type, value } = action.payload;
      const newValue =
        type === 'checkbox' ? (action.payload as InputTarget).checked : value;

      return {
        ...state,
        values: { ...state.values, [name]: newValue },
        visited: { ...state.visited, [name]: true }
      };
    }

    default:
      return state;
  }
}

const getFormState = <T,>(values: T | (() => T)): FormState<T> => ({
  values: values instanceof Function ? values() : values,
  errors: {},
  visited: {},
  hasErrors: false
});

const setErrors =
  <T,>(dispatch: React.Dispatch<Action<T>>) =>
  (value: Record<string, readonly string[]>) =>
    dispatch({
      type: Actions.ERRORS,
      payload: value as Record<string, string[]>
    });

const changeValue = <T,>(dispatch: React.Dispatch<Action<T>>, target: Target) =>
  dispatch({ type: Actions.CHANGE, payload: target });

const setValues =
  <T,>(dispatch: React.Dispatch<Action<T>>) =>
  (values: T) =>
    dispatch({ type: Actions.VALUES, payload: values });

const initialize = <T,>(dispatch: React.Dispatch<Action<T>>, values: T) =>
  dispatch({ type: Actions.RESET, payload: values });

type UseFormProps<T, S> = {
  onSubmit: (formValues: T, ...args: unknown[]) => Promise<S>;
  stableSchema: Schema;
  initialValues: T | (() => T);
  disabledOverride?: boolean;
};

const useForm = <T extends Record<string, unknown>, S = unknown>({
  onSubmit,
  stableSchema,
  initialValues,
  disabledOverride = false
}: UseFormProps<T, S>) => {
  const wrappedReducer = React.useCallback(
    (state: FormState<T>, action: Action<T>) => reducer(state, action),
    []
  );
  const [state, dispatch] = React.useReducer(
    wrappedReducer,
    getFormState(initialValues)
  );
  const [isSubmitting, setIsSubmitting] = useSafeState(false);

  React.useEffect(() => {
    validate(stableSchema, state.values).fold(setErrors(dispatch), () =>
      setErrors(dispatch)({})
    );
  }, [stableSchema, state.values]);

  const handleSubmit = async (
    event?: React.FormEvent<HTMLFormElement>,
    ...args: unknown[]
  ) => {
    if (event) event.preventDefault();
    setIsSubmitting(true);
    if (Object.keys(state.errors).length == 0) {
      return onSubmit(state.values, ...args).finally(() => {
        setIsSubmitting(false);
      });
    } else {
      setIsSubmitting(false);
      return null;
    }
  };

  // useful for applications that use react-aria
  const handleChange = curry((fieldName: string, value: string) =>
    changeValue(dispatch, {
      name: fieldName,
      type: 'input',
      value: value
    })
  );

  const handleFieldChange = (
    event: React.ChangeEvent<HTMLInputElement> | ChangeEvent
  ) => {
    event.persist?.();
    changeValue(dispatch, event.target);
  };

  const reset = (values = initialValues) => {
    setIsSubmitting(false);
    initialize(dispatch, values instanceof Function ? values() : values);
  };

  const isFieldVisited = (fieldName: string) => {
    return state.visited['override'] || state.visited[fieldName];
  };

  const isDisabled = isSubmitting || disabledOverride || state.hasErrors;

  return {
    handleFieldChange,
    handleChange,
    handleSubmit,
    isSubmitting,
    isFieldVisited,
    ...state,
    isDisabled,
    setValues: setValues<T>(dispatch),
    setErrors: setErrors<T>(dispatch),
    reset
  };
};

const createChangeEvent = <T extends Target>(
  target: T
): SimulatedChangeEvent<T> => ({
  persist: undefined,
  target
});

const curry = <F extends (...args: any[]) => any>(
  fn: F
): ((...args: any[]) => any) => {
  return (...args: any[]) => {
    if (fn.length <= args.length) {
      return fn(...args);
    }
    return curry(fn.bind(null, ...args));
  };
};

export { useForm, createChangeEvent };
export * from 'tiny-validation';
