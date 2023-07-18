import * as React from 'react';
import { Schema, validate } from 'tiny-validation';
import { produce, castDraft } from 'immer';
import { useSafeState } from './hooks/useSafeState';

type InputTarget = EventTarget & HTMLInputElement;

export interface CustomTarget {
  name: string;
  type: string;
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

export type UseFormResult<T> = {
  handleFieldChange: (
    event: React.ChangeEvent<HTMLInputElement> | ChangeEvent
  ) => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<unknown>;
  isSubmitting: boolean;
  isDisabled: boolean;
  setValues: (values: T) => void;
  setErrors: (errors: Record<string, string[]>) => void;
  reset: (values?: T) => void;
  isFieldVisited: (fielName: string) => boolean;
} & FormState<T>;

enum Actions {
  VALUES = 'set_values',
  ERRORS = 'set_errors',
  CHANGE = 'handle_change',
  RESET = 'reset'
}

type Action<T> =
  | {
      type: Actions.VALUES;
      payload: T;
    }
  | {
      type: Actions.ERRORS;
      payload: Record<string, readonly string[]>;
    }
  | {
      type: Actions.CHANGE;
      payload: Target;
    }
  | {
      type: Actions.RESET;
      payload: T;
    };

function reducer<T>() {
  return produce<FormState<T>, [Action<T>]>((draft, action) => {
    if (action.type === Actions.VALUES) {
      draft.values = castDraft(action.payload);
    } else if (action.type === Actions.ERRORS) {
      draft.errors = castDraft(action.payload);
      draft.hasErrors = Object.keys(draft.errors).length !== 0;
    } else if (action.type === Actions.RESET) {
      draft.visited = {};
      draft.errors = {};
      draft.values = castDraft(action.payload);
      draft.hasErrors = false;
    } else if (action.type === Actions.CHANGE) {
      const { name } = action.payload;
      if (action.payload.type === 'checkbox') {
        const payload = action.payload as InputTarget;
        draft.values[name] = payload.checked;
      } else {
        draft.values[name] = action.payload.value;
      }
      draft.visited[name] = true;
    }
  });
}

const getFormState = <T extends Record<string, unknown>>(
  values: T | (() => T)
): FormState<T> => ({
  values: values instanceof Function ? values() : values,
  errors: {},
  visited: {},
  hasErrors: false
});

const setErrors =
  <T extends Record<string, unknown>>(dispatch: React.Dispatch<Action<T>>) =>
  (value: Record<string, readonly string[]>) =>
    dispatch({ type: Actions.ERRORS, payload: value });

const changeValue = <T extends Record<string, unknown>>(
  dispatch: React.Dispatch<Action<T>>,
  target: Target
) => dispatch({ type: Actions.CHANGE, payload: target });

const setValues =
  <T extends Record<string, unknown>>(dispatch: React.Dispatch<Action<T>>) =>
  (values: T) =>
    dispatch({ type: Actions.VALUES, payload: values });

const initialize = <T extends Record<string, unknown>>(
  dispatch: React.Dispatch<Action<T>>,
  values: T
) => dispatch({ type: Actions.RESET, payload: values });

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
}: UseFormProps<T, S>): UseFormResult<T> => {
  const [state, dispatch] = React.useReducer(
    reducer<T>(),
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

export { useForm, createChangeEvent };
export * from 'tiny-validation';
