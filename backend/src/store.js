const { Pool } = require("pg");
const { randomUUID } = require("crypto");
const { databaseUrl, databaseSsl } = require("./config");

let pool;

if (databaseUrl && databaseUrl.trim()) {
  pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseSsl ? { rejectUnauthorized: false } : false,
  });
} else {
  pool = null;
}

let useInMemoryStore = false;
const memoryStore = {
  users: [],
  predictions: [],
};

const mapUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  passwordHash: row.password_hash,
  createdAt: row.created_at,
});

const initStore = async () => {
  try {
    if (!pool) {
      useInMemoryStore = true;
      // eslint-disable-next-line no-console
      console.warn("No DATABASE_URL configured; using in-memory store for this session.");
      return;
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS predictions (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        model TEXT NOT NULL,
        input JSONB NOT NULL,
        output JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    useInMemoryStore = false;
  } catch (error) {
    useInMemoryStore = true;
    // eslint-disable-next-line no-console
    console.warn("PostgreSQL unavailable; using in-memory store for this session.", error.message);
  }
};

const findUserByEmail = async (email) => {
  if (useInMemoryStore) {
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = memoryStore.users.find((item) => item.email.toLowerCase() === normalizedEmail);
    return user || null;
  }

  const result = await pool.query(
    "SELECT id, name, email, password_hash, created_at FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
    [email]
  );

  return result.rows[0] ? mapUser(result.rows[0]) : null;
};

const findUserById = async (id) => {
  if (useInMemoryStore) {
    const user = memoryStore.users.find((item) => item.id === id);
    return user || null;
  }

  const result = await pool.query(
    "SELECT id, name, email, password_hash, created_at FROM users WHERE id = $1 LIMIT 1",
    [id]
  );

  return result.rows[0] ? mapUser(result.rows[0]) : null;
};

const createUser = async ({ name, email, passwordHash }) => {
  if (useInMemoryStore) {
    const user = {
      id: randomUUID(),
      name,
      email,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    memoryStore.users.push(user);
    return user;
  }

  const result = await pool.query(
    "INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, email, password_hash, created_at",
    [randomUUID(), name, email, passwordHash]
  );

  return mapUser(result.rows[0]);
};

const savePrediction = async ({ userId, model, input, output }) => {
  if (useInMemoryStore) {
    const prediction = {
      id: randomUUID(),
      userId,
      model,
      input,
      output,
      createdAt: new Date().toISOString(),
    };

    memoryStore.predictions.push(prediction);
    return prediction;
  }

  const result = await pool.query(
    "INSERT INTO predictions (id, user_id, model, input, output) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb) RETURNING id, user_id, model, input, output, created_at",
    [randomUUID(), userId, model, JSON.stringify(input), JSON.stringify(output)]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    model: row.model,
    input: row.input,
    output: row.output,
    createdAt: row.created_at,
  };
};

const getPredictionsByUser = async (userId) => {
  if (useInMemoryStore) {
    return memoryStore.predictions
      .filter((item) => item.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const result = await pool.query(
    "SELECT id, user_id, model, input, output, created_at FROM predictions WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    model: row.model,
    input: row.input,
    output: row.output,
    createdAt: row.created_at,
  }));
};

module.exports = {
  initStore,
  findUserByEmail,
  findUserById,
  createUser,
  savePrediction,
  getPredictionsByUser,
};
