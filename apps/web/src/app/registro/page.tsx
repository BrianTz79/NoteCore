'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { registerSchema, toFormErrors, type FormErrors } from '@notecore/shared';
import { useAuth } from '@/lib/auth-context';
import { Button, Field, FormError } from '@/components/ui';

export default function RegistroPage() {
  const router = useRouter();
  const { register, user, loading: checkingSession } = useAuth();

  const [values, setValues] = useState({
    displayName: '',
    username: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({ fields: {} });
  const [submitting, setSubmitting] = useState(false);

  // Quien ya tiene sesión no necesita registrarse.
  useEffect(() => {
    if (!checkingSession && user) router.replace('/');
  }, [checkingSession, user, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({ fields: {} });

    // Validación local con el MISMO esquema que usa el servidor (Principio VIII): evita
    // un viaje de ida y vuelta, pero la que decide sigue siendo la del servidor.
    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fields[issue.path.join('.')] = issue.message;
      }
      setErrors({ fields });
      setSubmitting(false);
      return;
    }

    try {
      await register(parsed.data);
      router.replace('/');
    } catch (error) {
      setErrors(toFormErrors(error));
      setSubmitting(false);
    }
  }

  function update(field: keyof typeof values) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      setValues((current) => ({ ...current, [field]: event.target.value }));
    };
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-nc-xl px-nc-lg py-nc-3xl">
      <header className="space-y-nc-xs">
        <h1 className="text-3xl font-semibold tracking-tight">Crea tu cuenta</h1>
        <p className="text-tinta2">
          Tu horario, tus faltas y tu agenda en un solo lugar.
        </p>
      </header>

      <form onSubmit={onSubmit} noValidate className="space-y-nc-md">
        <FormError message={errors.general} />

        <Field
          label="Tu nombre"
          name="displayName"
          autoComplete="name"
          placeholder="Ana Pérez"
          value={values.displayName}
          onChange={update('displayName')}
          error={errors.fields.displayName}
        />

        <Field
          label="Nombre de usuario"
          name="username"
          autoComplete="username"
          placeholder="ana_perez"
          value={values.username}
          onChange={update('username')}
          error={errors.fields.username}
          hint="Así te encontrarán tus compañeros: letras, números y guion bajo."
        />

        <Field
          label="Correo electrónico"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="ana@ejemplo.mx"
          value={values.email}
          onChange={update('email')}
          error={errors.fields.email}
        />

        <Field
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={update('password')}
          error={errors.fields.password}
          hint="Al menos 8 caracteres."
        />

        <Button type="submit" loading={submitting} className="w-full">
          Crear cuenta
        </Button>
      </form>

      <p className="text-center text-sm text-tinta2">
        ¿Ya tienes cuenta?{' '}
        <Link href="/entrar" className="font-medium text-acento hover:text-foco">
          Inicia sesión
        </Link>
      </p>
    </main>
  );
}
