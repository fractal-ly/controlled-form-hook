import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { useForm, Schema, Validators } from '../index';

const { isPresent, isEmail, isTrue, minChars } = Validators;

type FormValues = {
  name: string;
  password: string;
  email: string;
  tos: boolean;
};
type FormExampleProps = {
  onSubmit: (values: FormValues) => Promise<boolean>;
};

const ERRORS = [
  'ERROR_NAME_NOT_PRESENT',
  'ERROR_EMAIL_NOT_PRESENT',
  'ERROR_EMAIL_BAD_FORMAT',
  'ERROR_PWD_NOT_PRESENT',
  'ERROR_PWD_TOO_SHORT',
  'ERROR_TOS_UNCHECKED'
];

const stableSchema: Schema = {
  name: [isPresent(ERRORS[0])],
  email: [isPresent(ERRORS[1]), isEmail(ERRORS[2])],
  password: [isPresent(ERRORS[3]), minChars(8, ERRORS[4])],
  tos: [isTrue(ERRORS[5])]
};

function FormExample({ onSubmit }: FormExampleProps) {
  const result = useForm<FormValues, boolean>({
    onSubmit,
    stableSchema,
    initialValues: {
      name: 'Filiberto',
      email: '',
      password: '',
      tos: false
    }
  });

  return (
    <form onSubmit={result.handleSubmit}>
      <label htmlFor="name">Name</label>
      <input
        id="name"
        name="name"
        value={result.values['name']}
        onChange={result.handleFieldChange}
      />

      <label htmlFor="password">password</label>
      <input
        id="password"
        name="password"
        value={result.values['password']}
        onChange={result.handleFieldChange}
      />

      <label htmlFor="email">email</label>
      <input
        id="email"
        name="email"
        value={result.values['email']}
        onChange={result.handleFieldChange}
      />

      <input
        id="tos"
        type="checkbox"
        name="tos"
        onChange={result.handleFieldChange}
      />
      <label htmlFor="tos">terms of service</label>

      {Object.entries(result.errors).map(([_, errors]) =>
        errors.map((error) => <div key={error}>{error}</div>)
      )}

      <button type="submit" disabled={result.isDisabled}>
        Submit
      </button>
      <button onClick={() => result.reset()} disabled={result.isSubmitting}>
        Reset
      </button>
    </form>
  );
}

test('Form initializes correctly', async () => {
  const submit = async (values: FormValues) => {
    console.log({ values });
    return true;
  };
  const { container } = render(<FormExample onSubmit={submit} />);
  const submitButton = screen.getByRole('button', { name: /submit/i });
  const resetButton = screen.getByRole('button', { name: /reset/i });
  const nameInput = screen.getByRole('textbox', {
    name: /name/i
  }) as HTMLInputElement;
  const passwordInput = screen.getByRole('textbox', {
    name: /password/i
  }) as HTMLInputElement;
  const emailInput = screen.getByRole('textbox', {
    name: /email/i
  }) as HTMLInputElement;
  const tosInput = screen.getByRole('checkbox', {
    name: /terms of service/i
  }) as HTMLInputElement;

  expect(submitButton).toBeDisabled();
  expect(resetButton).toBeEnabled();
  expect(nameInput.value).toBe('Filiberto');
  expect(passwordInput.value).toBe('');
  expect(emailInput.value).toBe('');
  expect(tosInput.checked).toBe(false);

  let messages: Array<string | null> = [];
  container.querySelectorAll('div').forEach((div) => {
    messages.push(div.textContent);
  });

  for (const error of [
    'ERROR_EMAIL_NOT_PRESENT',
    'ERROR_EMAIL_BAD_FORMAT',
    'ERROR_PWD_NOT_PRESENT',
    'ERROR_PWD_TOO_SHORT',
    'ERROR_TOS_UNCHECKED'
  ]) {
    expect(messages.includes(error)).toBe(true);
  }
});
