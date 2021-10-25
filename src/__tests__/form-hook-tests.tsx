import { renderHook, act } from '@testing-library/react-hooks';
import '@testing-library/jest-dom/extend-expect';
import {
  useForm,
  Validators,
  Schema,
  createChangeEvent,
  CustomTarget,
} from '../index';

const { isPresent, isEmail, isTrue, minChars } = Validators;

type Target = {
  name: string;
  value?: string | number | boolean;
  checked?: boolean;
  type?: string;
};

const fakeEvent = (target: Target) =>
  ({
    target,
    persist: () => null,
  } as unknown as React.ChangeEvent<HTMLInputElement>);

const DateOne = new Date();
const DateTwo = new Date('1/1/1980');

type FormValues = {
  name: string;
  password: string;
  email: string;
  tos: boolean;
  todaysDate: Date | undefined;
};

const ERRORS = [
  'ERROR_NAME_NOT_PRESENT',
  'ERROR_EMAIL_NOT_PRESENT',
  'ERROR_EMAIL_BAD_FORMAT',
  'ERROR_PWD_NOT_PRESENT',
  'ERROR_PWD_TOO_SHORT',
  'ERROR_TOS_UNCHECKED',
];

const schema: Schema = {
  name: [isPresent(ERRORS[0])],
  email: [isPresent(ERRORS[1]), isEmail(ERRORS[2])],
  password: [isPresent(ERRORS[3]), minChars(8, ERRORS[4])],
  tos: [isTrue(ERRORS[5])],
};

const onSubmit = async (values: FormValues) => {
  console.log({ values });
  return true;
};

const initialValues: FormValues = {
  name: 'Filiberto',
  email: '',
  password: '',
  todaysDate: undefined,
  tos: false,
};

const initialErrors = {
  email: ['ERROR_EMAIL_NOT_PRESENT', 'ERROR_EMAIL_BAD_FORMAT'],
  password: ['ERROR_PWD_NOT_PRESENT', 'ERROR_PWD_TOO_SHORT'],
  tos: ['ERROR_TOS_UNCHECKED'],
};

test('Form initializes correctly', async () => {
  const { result } = renderHook(useForm, {
    initialProps: {
      onSubmit,
      schema,
      initialValues,
    },
  });

  const errorState: Partial<typeof initialErrors> = {
    ...initialErrors,
  };

  expect(result.current.isDisabled).toBe(true);
  expect(result.current.isSubmitting).toBe(false);
  expect(result.current.values).toEqual(initialValues);
  expect(result.current.errors).toEqual(errorState);
  expect(result.current.visited).toEqual({});

  act(() =>
    result.current.handleFieldChange(
      fakeEvent({ name: 'name', value: 'gustavo' })
    )
  );

  expect(result.current.values).toEqual({ ...initialValues, name: 'gustavo' });
  expect(result.current.errors).toEqual(initialErrors);
  expect(result.current.visited).toEqual({ name: true });
  expect(result.current.isDisabled).toBe(true);
  expect(result.current.isSubmitting).toBe(false);

  act(() =>
    result.current.handleFieldChange(
      fakeEvent({ name: 'email', value: 'email@here.com' })
    )
  );

  expect(result.current.values).toEqual({
    ...initialValues,
    name: 'gustavo',
    email: 'email@here.com',
  });

  delete errorState.email;
  expect(result.current.errors).toEqual(errorState);
  expect(result.current.visited).toEqual({ name: true, email: true });
  expect(result.current.isDisabled).toBe(true);
  expect(result.current.isSubmitting).toBe(false);

  act(() =>
    result.current.handleFieldChange(
      fakeEvent({ name: 'password', value: '12' })
    )
  );

  errorState.password = ['ERROR_PWD_TOO_SHORT'];
  expect(result.current.errors).toEqual(errorState);
  expect(result.current.visited).toEqual({
    name: true,
    email: true,
    password: true,
  });
  expect(result.current.isDisabled).toBe(true);
  expect(result.current.isSubmitting).toBe(false);

  act(() =>
    result.current.handleFieldChange(
      fakeEvent({ name: 'password', value: '12312312122' })
    )
  );

  act(() =>
    result.current.handleFieldChange(
      fakeEvent({ type: 'checkbox', name: 'tos', checked: true })
    )
  );

  act(() =>
    result.current.handleFieldChange(
      createChangeEvent<CustomTarget>({
        name: 'todaysDate',
        value: DateTwo,
        type: 'datepicker',
      })
    )
  );

  expect(result.current.errors).toEqual({});
  expect(result.current.visited).toEqual({
    name: true,
    email: true,
    password: true,
    todaysDate: true,
    tos: true,
  });
  expect(result.current.isDisabled).toBe(false);
  expect(result.current.isSubmitting).toBe(false);
  expect(result.current.values).toEqual({
    name: 'gustavo',
    password: '12312312122',
    tos: true,
    email: 'email@here.com',
    todaysDate: DateTwo,
  });
});

test('user can set form values', async () => {
  const { result } = renderHook(useForm, {
    initialProps: {
      onSubmit,
      schema,
      initialValues,
    },
  });

  act(() =>
    result.current.setValues({
      name: 'gustavo',
      password: '12312312122',
      tos: true,
      email: 'email@here.com',
      todaysDate: DateOne,
    })
  );

  expect(result.current.errors).toEqual({});
  expect(result.current.isDisabled).toBe(false);
  expect(result.current.isSubmitting).toBe(false);
  expect(result.current.values).toEqual({
    name: 'gustavo',
    password: '12312312122',
    tos: true,
    todaysDate: DateOne,
    email: 'email@here.com',
  });
});

test('user can successfuly submitform', async () => {
  const submit = jest.fn();
  const onSubmit = async (values: FormValues) => {
    submit(values);
    return true;
  };

  const { result } = renderHook(useForm, {
    initialProps: {
      onSubmit,
      schema,
      initialValues: {
        name: 'gustavo',
        password: '12312312122',
        tos: true,
        email: 'email@here.com',
        todaysDate: DateOne,
      },
    },
  });

  await act(() =>
    result.current.handleSubmit({
      preventDefault: () => null,
    } as unknown as React.FormEvent<HTMLFormElement>)
  );

  expect(result.current.errors).toEqual({});
  expect(result.current.isDisabled).toBe(false);
  expect(result.current.isSubmitting).toBe(false);
  expect(result.current.values).toEqual({
    name: 'gustavo',
    password: '12312312122',
    todaysDate: DateOne,
    tos: true,
    email: 'email@here.com',
  });
  expect(submit).toBeCalledTimes(1);
  expect(submit).toBeCalledWith({
    name: 'gustavo',
    password: '12312312122',
    tos: true,
    todaysDate: DateOne,
    email: 'email@here.com',
  });
});

test('user can reset form to initial values', async () => {
  const submit = jest.fn();
  const onSubmit = async (values: FormValues) => {
    submit(values);
    return true;
  };

  const { result } = renderHook(useForm, {
    initialProps: {
      onSubmit,
      schema,
      initialValues: {
        name: 'gustavo',
        password: '12312312122',
        tos: true,
        email: 'email@here.com',
        todaysDate: DateOne,
      } as FormValues,
    },
  });

  act(() => result.current.setValues(initialValues));

  expect(result.current.errors).toEqual(initialErrors);
  expect(result.current.values).toEqual(initialValues);
  expect(result.current.isDisabled).toBe(true);

  act(() => result.current.reset());

  expect(result.current.errors).toEqual({});
  expect(result.current.values).toEqual({
    name: 'gustavo',
    password: '12312312122',
    tos: true,
    todaysDate: DateOne,
    email: 'email@here.com',
  });
  expect(result.current.isDisabled).toBe(false);
});

test('user can reset form to new values', async () => {
  const submit = jest.fn();
  const onSubmit = async (values: FormValues) => {
    submit(values);
    return true;
  };

  const { result } = renderHook(useForm, {
    initialProps: {
      onSubmit,
      schema,
      initialValues,
    },
  });

  act(() =>
    result.current.reset({
      name: 'gustavo',
      password: '12312312122',
      tos: true,
      email: 'email@here.com',
      todaysDate: DateTwo,
    })
  );

  expect(result.current.errors).toEqual({});
  expect(result.current.values).toEqual({
    name: 'gustavo',
    password: '12312312122',
    tos: true,
    email: 'email@here.com',
    todaysDate: DateTwo,
  });
  expect(result.current.isDisabled).toBe(false);
});
