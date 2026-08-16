import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

const COLORS = [
  '#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6',
  '#8b5cf6','#ef4444','#14b8a6','#f97316','#84cc16',
];

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT s.*,
      json_agg(
        json_build_object(
          'id', sb.id, 'dia_semana', sb.dia_semana,
          'hora_inicio', sb.hora_inicio, 'hora_fin', sb.hora_fin, 'aula', sb.aula
        ) ORDER BY sb.dia_semana, sb.hora_inicio
      ) FILTER (WHERE sb.id IS NOT NULL) AS bloques
     FROM subjects s
     LEFT JOIN schedule_blocks sb ON sb.subject_id = s.id
     WHERE s.user_id = $1
     GROUP BY s.id ORDER BY s.nombre`,
    [req.userId]
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { nombre, paquete, color, bloques } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const countRes = await client.query('SELECT COUNT(*) FROM subjects WHERE user_id = $1', [req.userId]);
    const idx = parseInt(countRes.rows[0].count) % COLORS.length;
    const finalColor = color || COLORS[idx];

    const { rows } = await client.query(
      'INSERT INTO subjects (user_id, nombre, paquete, color) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.userId, nombre, paquete, finalColor]
    );
    const subject = rows[0];

    if (Array.isArray(bloques) && bloques.length > 0) {
      for (const b of bloques) {
        await client.query(
          'INSERT INTO schedule_blocks (subject_id, dia_semana, hora_inicio, hora_fin, aula) VALUES ($1,$2,$3,$4,$5)',
          [subject.id, b.dia_semana, b.hora_inicio, b.hora_fin, b.aula]
        );
      }
    }
    await client.query('COMMIT');
    res.status(201).json(subject);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

// Import via JSON from AI
router.post('/importar', async (req, res) => {
  const { materias } = req.body; // array from AI JSON
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const countRes = await client.query('SELECT COUNT(*) FROM subjects WHERE user_id = $1', [req.userId]);
    let baseIdx = parseInt(countRes.rows[0].count);
    const inserted = [];

    for (const m of materias) {
      const color = COLORS[baseIdx % COLORS.length];
      baseIdx++;
      const { rows } = await client.query(
        'INSERT INTO subjects (user_id, nombre, paquete, color) VALUES ($1,$2,$3,$4) RETURNING *',
        [req.userId, m.materia, m.paquete, color]
      );
      const subj = rows[0];
      const DIAS = { Lunes:1, Martes:2, Miércoles:3, Miercoles:3, Jueves:4, Viernes:5, Sábado:6, Sabado:6 };
      for (const s of (m.sesiones || [])) {
        const dia = typeof s.dia === 'number' ? s.dia : (DIAS[s.dia] || 1);
        await client.query(
          'INSERT INTO schedule_blocks (subject_id, dia_semana, hora_inicio, hora_fin, aula) VALUES ($1,$2,$3,$4,$5)',
          [subj.id, dia, s.hora_inicio, s.hora_fin, s.aula]
        );
      }
      inserted.push(subj);
    }
    await client.query('COMMIT');
    res.status(201).json({ importadas: inserted.length, materias: inserted });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

router.put('/:id', async (req, res) => {
  const { nombre, paquete, color, bloques } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'UPDATE subjects SET nombre=$1, paquete=$2, color=$3 WHERE id=$4 AND user_id=$5 RETURNING *',
      [nombre, paquete, color, req.params.id, req.userId]
    );
    if (!rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'No encontrado' }); }

    await client.query('DELETE FROM schedule_blocks WHERE subject_id = $1', [req.params.id]);
    if (Array.isArray(bloques) && bloques.length > 0) {
      for (const b of bloques) {
        await client.query(
          'INSERT INTO schedule_blocks (subject_id, dia_semana, hora_inicio, hora_fin, aula) VALUES ($1,$2,$3,$4,$5)',
          [req.params.id, b.dia_semana, b.hora_inicio, b.hora_fin, b.aula]
        );
      }
    }
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

router.delete('/all', async (req, res) => {
  await pool.query('DELETE FROM subjects WHERE user_id = $1', [req.userId]);
  res.status(204).end();
});

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM subjects WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  res.status(204).end();
});

export default router;
