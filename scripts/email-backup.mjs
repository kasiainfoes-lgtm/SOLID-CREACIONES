// Envía un archivo de backup (creado por backup-db.sh) por email a
// BACKUP_EMAIL_TO, usando las mismas variables SMTP_* que ya usa la app
// para las notificaciones a fábrica y las reseñas.
//
// Uso: node scripts/email-backup.mjs /app/backups/facturas-20260921-030001.sql.gz
//
// backup-db.sh llama a esto automáticamente al final de cada backup — no
// hace falta ejecutarlo a mano salvo para probar que el correo llega bien.
import nodemailer from 'nodemailer';
import { basename } from 'node:path';

const [, , filePath] = process.argv;
if (!filePath) {
  console.error('Uso: node scripts/email-backup.mjs /ruta/al/backup.sql.gz');
  process.exit(1);
}

const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM, BACKUP_EMAIL_TO } = process.env;

if (!SMTP_HOST || !BACKUP_EMAIL_TO) {
  // Not an error: the local backup file was already created successfully by
  // backup-db.sh: this step is only the "also send it off the server" extra.
  console.log('SMTP_HOST o BACKUP_EMAIL_TO no están configurados — el backup se quedó solo en el servidor, no se envió por email.');
  process.exit(0);
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 587),
  secure: SMTP_SECURE === 'true',
  auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
});

const fileName = basename(filePath);

try {
  await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to: BACKUP_EMAIL_TO,
    subject: `Copia de seguridad de facturas — ${fileName}`,
    text:
      `Adjunta va la copia de seguridad de la base de datos de facturas (${fileName}).\n\n` +
      'Guárdala en algún sitio seguro (una carpeta en el ordenador, Drive...) — ' +
      'este correo es tu copia fuera del servidor, por si el VPS fallara algún día.',
    attachments: [{ filename: fileName, path: filePath }]
  });
  console.log(`Backup enviado por email a ${BACKUP_EMAIL_TO}`);
} catch (err) {
  console.error('No se pudo enviar el backup por email:', err instanceof Error ? err.message : err);
  // The local file is still safe on disk; only the off-server copy failed.
  process.exit(1);
}
