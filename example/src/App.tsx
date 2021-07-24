import React from 'react';

import { useForm } from 'controlled-form-hook';
import { Validators } from 'tiny-validation';
const { isPresent, isEmail, isTrue, maxChars } = Validators;

type FormValues = {
  name: string;
  email: string;
  password: string;
  tos: false;
};

// simulate server roundtrip
const chuggachugga = (delay: number) =>
  new Promise((resolve) => {
    setTimeout(() => resolve(1), delay);
  });

// Simulates a submit function.
const submit = async <T extends {}>(values: T) => {
  console.log('Submit was called with', { values });
  await chuggachugga(4000);
  return 'This is your sumit result';
};

const App = () => {
  const {
    handleSubmit,
    handleFieldChange,
    isSubmitting,
    isDisabled,
    values,
    visited,
    errors,
    reset,
  } = useForm<FormValues>({
    onSubmit: submit,
    schema: {
      name: [isPresent()],
      email: [isPresent(), isEmail()],
      password: [isPresent(), maxChars(30)],
      tos: [isTrue()],
    },
    initialValues: {
      name: 'Gustavo',
      email: '',
      password: '',
      tos: false,
    },
  });
  return (
    <div className="main">
      <div className="wrap">
        <form onSubmit={handleSubmit}>
          <div className="formbody">
            <div className="inputfield">
              <label htmlFor="name" className="inputlabel">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={values['name']}
                onChange={handleFieldChange}
              />
            </div>
            {visited['name'] && <Error errors={errors['name']} />}
            <div className="inputfield">
              <label htmlFor="password" className="inputlabel">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="text"
                value={values['password']}
                onChange={handleFieldChange}
              />
            </div>
            {visited['password'] && <Error errors={errors['password']} />}

            <div className="inputfield">
              <label htmlFor="email" className="inputlabel">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="text"
                value={values['email']}
                onChange={handleFieldChange}
              />
            </div>
            {visited['email'] && <Error errors={errors['email']} />}

            <div className="tos">
              <input
                id="tos"
                name="tos"
                type="checkbox"
                checked={values['tos']}
                onChange={handleFieldChange}
              />
              <label htmlFor="tos" className="toslabel">
                I agree to provide my first born child
              </label>
            </div>
            {visited['tos'] && <Error errors={errors['tos']} />}
          </div>
          <div className="buttons">
            <button className="reset" onClick={() => reset()}>
              Reset
            </button>
            <button className="ok" type="submit" disabled={isDisabled}>
              {isSubmitting ? 'Loading...' : 'OK'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

type ErrorProps = {
  errors: string[];
};
const Error = ({ errors = [] }: ErrorProps) => (
  <>
    {errors.map((error) => (
      <div className="error">{error}</div>
    ))}
  </>
);

export default App;
