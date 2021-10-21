import * as React from 'react';
import { Schema, validate } from 'tiny-validation';
import { produce, castDraft } from 'immer';

type InputTarget = EventTarget & HTMLInputElement;

export type DatePickerTarget = {
  name: string;
  type: 'datepicker';
  value: Date;
};

type DateRange = {
    from: Date | undefined;
    to?: Date | undefined;
}

export type DateRangePickerTarget = {
  name: string;
  type: 'daterangepicker';
  value: DateRange;
};

type Target = InputTarget | DatePickerTarget | DateRangePickerTarget;

export type SimulatedChangeEvent<T extends Target> = {
  target: T;
  persist: undefined;
};

type ChangeEvent = SimulatedChangeEvent<DatePickerTarget>;
export type DatePickerChangeEvent = SimulatedChangeEvent<DatePickerTarget>;

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
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<any>;
  isSubmitting: boolean;
  isDisabled: boolean;
  setValues: (values: T) => void;
  setErrors: (errors: Record<string, string[]>) => void;
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
    } else if (action.type === Actions.CHANGE) {
      const { name } = action.payload;
      if (action.payload.type === 'checkbox') {
        draft.values[name] = action.payload.checked;
      } else {
        draft.values[name] = action.payload.value;
      }
      draft.visited[name] = true;
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
  target: Target
) => dispatch({ type: Actions.CHANGE, payload: target });

const setValues =
  <T extends {}>(dispatch: React.Dispatch<Action<T>>) =>
  (values: T) =>
    dispatch({ type: Actions.VALUES, payload: values });

const initialize = <T extends {}>(
  dispatch: React.Dispatch<Action<T>>,
  values: T
) => dispatch({ type: Actions.RESET, payload: values });

type UseFormProps<T, S> = {
  onSubmit: (formValues: T) => Promise<S>;
  schema: Schema;
  initialValues: T;
  disabledOverride?: boolean;
  dependencies?: unknown[];
};

const useForm = <T extends {}, S = unknown>({
  onSubmit,
  schema,
  initialValues,
  disabledOverride = false,
  dependencies = [],
}: UseFormProps<T, S>): UseFormResult<T> => {
  const stableSchema = React.useMemo(() => schema, dependencies);
  const [state, dispatch] = React.useReducer(
    reducer<T>(),
    getFormState(initialValues)
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const cancelRef = React.useRef(false);

  React.useEffect(
    () => () => {
      cancelRef.current = true;
    },
    []
  );

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
        if (!cancelRef.current) setIsSubmitting(false);
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
    initialize(dispatch, values);
  };

  const isDisabled = isSubmitting || disabledOverride || state.hasErrors;

  return {
    handleFieldChange,
    handleSubmit,
    isSubmitting,
    ...state,
    isDisabled,
    setValues: setValues<T>(dispatch),
    setErrors: setErrors<T>(dispatch),
    reset,
  };
};

const createChangeEvent = <T extends Target>(
  target: T
): SimulatedChangeEvent<T> => ({
  persist: undefined,
  target,
});

export { useForm, createChangeEvent };
export * from 'tiny-validation';
