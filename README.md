# controlled-form-hook

> React hook for handling forms with controlled components and validation.

[![NPM](https://img.shields.io/npm/v/controlled-form-hook.svg)](https://www.npmjs.com/package/controlled-form-hook) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save controlled-form-hook
```

```bash
yarn add controlled-form-hook
```

## Usage

```tsx
import * as React from 'react'

import { useForm } from 'controlled-form-hook';
import { Validators } from 'tiny-validation';
const { isPresent, isEmail, isTrue, maxChars } = Validators;

type FormValues = {
  name: string;
  email: string;
  password: string;
  tos: false;
};


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
      name: 'User McUserson',
      email: '',
      password: '',
      tos: false,
    },
  });
```

See the example folder in the repo for a full working example.

## License

MIT © [fractal-ly](https://github.com/fractal-ly)

---

This hook is created using [create-react-hook](https://github.com/hermanya/create-react-hook).
