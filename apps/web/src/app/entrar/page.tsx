'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { loginSchema, toFormErrors, type FormErrors } from '@notecore/shared';
import { useAuth } from '@/lib/auth-context';
import { Button, Field, FormError } from '@/components/ui';
import { Logo } from '@/components/logo';

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
        <div className="flex items-center gap-nc-xs">
          <Logo size={32} />
          <span className="text-lg font-semibold tracking-tight">NoteCore</span>
        </div>
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

      {/*
        Privacidad (Fase 26). La página ya era pública desde la Fase 19 —el revisor de Play la
        abre sin registrarse—, pero no había forma de llegar a ella desde aquí: los únicos
        enlaces salían de la barra lateral, que exige sesión. Una política alcanzable solo por
        URL escrita a mano es, en la práctica, una política que nadie lee.

        Más tenue que el enlace de registro: crear la cuenta es lo que se viene a hacer.
      */}
      <p className="text-center text-xs text-tinta3">
        <Link href="/privacidad" className="hover:text-tinta2">
          Política de privacidad
        </Link>
      </p>
    </main>
  );
}
