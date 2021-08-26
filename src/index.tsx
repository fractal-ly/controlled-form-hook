import * as React from 'react';
import { Schema, validate } from 'tiny-validation';
import { produce, castDraft } from 'immer';

type FormState<T> = {
  values: T;
  errors: Record<string, string[]>;
  visited: Record<string, boolean>;
  hasErrors: boolean;
};

export type UseFormResult<T> = {
  handleFieldChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<any>;
  isSubmitting: boolean;
  isDisabled: boolean;
  setValues: (values: T) => void;
  setErrors: (errors: T) => void;
  reset: (values?: T) => void;
} & FormState<T>;

enum Actions {
  VALUES = 'set_values',
  ERRORS = 'set_errors',
  CHANGE = 'handle_change',
  RESET = 'reset',
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
      payload: EventTarget & HTMLInputElement;
    }
  | {
      type: Actions.RESET;
      payload: T;
    };

function reducer<T>() {
  return produce<FormState<T>, [Action<T>]>((draft, action) => {
    const { type, payload } = action;
    switch (type) {
      case Actions.VALUES:
        draft.values = castDraft(payload as T);
        break;
      case Actions.ERRORS:
        draft.errors = payload as Record<string, string[]>;
        draft.hasErrors = Object.keys(draft.errors).length !== 0;
        break;
      case Actions.CHANGE:
        const { name, type, value, checked } = payload as EventTarget &
          HTMLInputElement;
        draft.values[name] = type === 'checkbox' ? checked : value;
        draft.visited[name] = true;
        break;
      case Actions.RESET:
        draft.visited = {};
        draft.errors = {};
        draft.values = castDraft(payload as T);
        break;
    }
  });
}

const getFormState = <T extends {}>(values: T): FormState<T> => ({
  values,
  errors: {},
  visited: {},
  hasErrors: false,
});

const setErrors =
  <T extends {}>(dispatch: React.Dispatch<Action<T>>) =>
  (value: Record<string, readonly string[]>) =>
    dispatch({ type: Actions.ERRORS, payload: value });

const changeValue = <T extends {}>(
  dispatch: React.Dispatch<Action<T>>,
  target: EventTarget & HTMLInputElement
) => dispatch({ type: Actions.CHANGE, payload: target });

const setValues =
  <T extends {}>(dispatch: React.Dispatch<Action<T>>) =>
  (values: T) =>
    dispatch({ type: Actions.VALUES, payload: values });

const initialize = <T extends {}>(
  dispatch: React.Dispatch<Action<T>>,
  values: T
) => dispatch({ type: Actions.RESET, payload: values });

type UseFormProps<T> = {
  onSubmit: (formValues: T) => Promise<any>;
  schema: Schema;
  initialValues: T;
  disabledOverride?: boolean;
  dependencies?: unknown[];
};

const useForm = <T extends {}>({
  onSubmit,
  schema,
  initialValues,
  disabledOverride = false,
  dependencies = [],
}: UseFormProps<T>): UseFormResult<T> => {
  const stableSchema = React.useMemo(() => schema, dependencies);
  const [state, dispatch] = React.useReducer(
    reducer<T>(),
    getFormState(initialValues)
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    validate(stableSchema, state.values).fold(setErrors(dispatch), () =>
      setErrors(dispatch)({})
    );
  }, [stableSchema, state.values]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();
    setIsSubmitting(true);
    if (Object.keys(state.errors).length == 0) {
      return onSubmit(state.values).finally(() => {
        setIsSubmitting(false);
      });
    } else setIsSubmitting(false);
  };

  const handleFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.persist();
    changeValue(dispatch, event.target);
  };

  const reset = (values = initialValues) => {
    setIsSubmitting(false);
    initialize(dispatch, values);
  };

  const isDisabled = isSubmitting || disabledOverride || state.hasErrors;

  return {
    handleFieldChange,
    handleSubmit,
    isSubmitting,
    ...state,
    isDisabled,
    setValues: setValues(dispatch),
    setErrors: setErrors(dispatch),
    reset,
  };
};

export { useForm };
