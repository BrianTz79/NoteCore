import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

// Get all absences for the authenticated user
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ar.*, s.nombre as materia_nombre, s.color as materia_color
     FROM absence_records ar
     JOIN subjects s ON s.id = ar.subject_id
     WHERE s.user_id = $1
     ORDER BY ar.fecha DESC`,
    [req.userId]
  );
  res.json(rows);
});

// Stats per subject: total sessions, absences, limit
router.get('/stats', async (req, res) => {
  const { rows } = await pool.query(
    `WITH user_data AS (
      SELECT porcentaje_faltas FROM users WHERE id = $1
    ),
    session_counts AS (
      SELECT s.id, s.nombre, s.color, s.paquete,
        COUNT(sb.id) AS sesiones_semanales,
        (SELECT porcentaje_faltas FROM user_data) AS porcentaje_faltas
      FROM subjects s
      LEFT JOIN schedule_blocks sb ON sb.subject_id = s.id
      WHERE s.user_id = $1
      GROUP BY s.id, s.nombre, s.color, s.paquete
    ),
    absence_counts AS (
      SELECT ar.subject_id,
        COUNT(*) FILTER (WHERE NOT ar.justificada) AS faltas,
        COUNT(*) FILTER (WHERE ar.justificada) AS justificadas
      FROM absence_records ar
      JOIN subjects s ON s.id = ar.subject_id
      WHERE s.user_id = $1
      GROUP BY ar.subject_id
    )
    SELECT sc.*,
      COALESCE(ac.faltas, 0) AS faltas,
      COALESCE(ac.justificadas, 0) AS justificadas,
      ROUND(sc.sesiones_semanales * 16 * (sc.porcentaje_faltas / 100)) AS limite_faltas
    FROM session_counts sc
    LEFT JOIN absence_counts ac ON ac.subject_id = sc.id`,
    [req.userId]
  );
  res.json(rows);
});

// Register an absence
router.post('/', async (req, res) => {
  const { subject_id, schedule_block_id, fecha, notas } = req.body;
  // verify subject belongs to user
  const check = await pool.query('SELECT id FROM subjects WHERE id = $1 AND user_id = $2', [subject_id, req.userId]);
  if (!check.rows[0]) return res.status(403).json({ error: 'Materia no encontrada' });

  try {
    const { rows } = await pool.query(
      'INSERT INTO absence_records (subject_id, schedule_block_id, fecha, notas) VALUES ($1,$2,$3,$4) RETURNING *',
      [subject_id, schedule_block_id || null, fecha, notas || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Falta ya registrada para esa sesión y fecha' });
    throw err;
  }
});

// Toggle justificada
router.patch('/:id/justificar', async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE absence_records ar SET justificada = NOT ar.justificada
     FROM subjects s
     WHERE ar.subject_id = s.id AND s.user_id = $1 AND ar.id = $2
     RETURNING ar.*`,
    [req.userId, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
  res.json(rows[0]);
});

// Delete an absence
router.delete('/:id', async (req, res) => {
  await pool.query(
    `DELETE FROM absence_records ar USING subjects s
     WHERE ar.subject_id = s.id AND s.user_id = $1 AND ar.id = $2`,
    [req.userId, req.params.id]
  );
  res.status(204).end();
});

export default router;
