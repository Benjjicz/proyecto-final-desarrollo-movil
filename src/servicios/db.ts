import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('miciudad.db');

export const inicializarBaseDeDatos = () => {
  try {
    db.execSync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS visitas (
        id TEXT PRIMARY KEY NOT NULL,
        usuarioId TEXT NOT NULL,
        lugarId TEXT NOT NULL,
        fechaHora TEXT NOT NULL,
        origen TEXT NOT NULL,
        fotoUri TEXT,
        nota TEXT,
        sincronizada INTEGER NOT NULL DEFAULT 0
      );
    `);
    console.log("-> Base de datos SQLite inicializada.");
  } catch (error) {
    console.error("-> Error al inicializar SQLite:", error);
  }
};

inicializarBaseDeDatos();