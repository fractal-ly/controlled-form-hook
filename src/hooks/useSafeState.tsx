import * as React from 'react';

export type SafeStateDispatch<T> = (newState: React.SetStateAction<T>) => void;

export const useSafeState = <S,>(
  initialState: S | (() => S)
): [S, (newState: React.SetStateAction<S>) => void] => {
  const cancelRef = React.useRef(false);
  const [state, unsafeSetState] = React.useState(initialState);

  React.useEffect(() => {
    return () => {
      cancelRef.current = true;
    };
  }, []);

  const safeSetState: SafeStateDispatch<S> = React.useCallback((newState) => {
    if (!cancelRef.current) unsafeSetState(newState);
  }, []);

  return [state, safeSetState];
};
