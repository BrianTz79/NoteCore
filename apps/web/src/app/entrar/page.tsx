'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { loginSchema, toFormErrors, type FormErrors } from '@notecore/shared';
import { useAuth } from '@/lib/auth-context';
import { Button, Field, FormError } from '@/components/ui';

export default function EntrarPage() {
  const router = useRouter();
  const { login, user, loading: checkingSession } = useAuth();

  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({ fields: {} });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!checkingSession && user) router.replace('/');
  }, [checkingSession, user, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({ fields: {} });

    const parsed = loginSchema.safeParse(values);
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
      await login(parsed.data);
      router.replace('/');
    } catch (error) {
      setErrors(toFormErrors(error));
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-nc-xl px-nc-lg py-nc-3xl">
      <header className="space-y-nc-xs">
        <h1 className="text-3xl font-semibold tracking-tight">Bienvenido de vuelta</h1>
        <p className="text-tinta2">Entra para ver tu horario y tu agenda.</p>
      </header>

      <form onSubmit={onSubmit} noValidate className="space-y-nc-md">
        <FormError message={errors.general} />

        <Field
          label="Correo electrónico"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="ana@ejemplo.mx"
          value={values.email}
          onChange={(event) => setValues((c) => ({ ...c, email: event.target.value }))}
          error={errors.fields.email}
        />

        <Field
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={(event) => setValues((c) => ({ ...c, password: event.target.value }))}
          error={errors.fields.password}
        />

        <Button type="submit" loading={submitting} className="w-full">
          Entrar
        </Button>
      </form>

      <p className="text-center text-sm text-tinta2">
        ¿Aún no tienes cuenta?{' '}
        <Link href="/registro" className="font-medium text-acento hover:text-foco">
          Crea una
        </Link>
      </p>
    </main>
  );
}
