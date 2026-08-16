import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { email, password, nombre } = req.body;
  if (!email || !password || !nombre) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }
  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash, nombre) VALUES ($1, $2, $3) RETURNING id, email, nombre, porcentaje_faltas',
      [email.toLowerCase(), hash, nombre]
    );
    const token = jwt.sign({ sub: rows[0].id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El correo ya está registrado' });
    throw err;
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email?.toLowerCase()]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }
  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

router.get('/me', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, email, nombre, porcentaje_faltas, created_at FROM users WHERE id = $1',
    [req.userId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(rows[0]);
});

router.patch('/me', async (req, res) => {
  const { porcentaje_faltas } = req.body;
  const { rows } = await pool.query(
    'UPDATE users SET porcentaje_faltas = $1 WHERE id = $2 RETURNING id, email, nombre, porcentaje_faltas',
    [porcentaje_faltas, req.userId]
  );
  res.json(rows[0]);
});

export default router;
