// Archivo: api/crear-cita.js

// Estas son las "dependencias" o herramientas que nuestra función necesita.
// Vercel las instalará automáticamente por nosotros.
const admin = require('firebase-admin');
const fetch = require('node-fetch');

// --- Configuración de Firebase Admin ---
// Usamos variables de entorno para mantener seguras nuestras claves.
// Las configuraremos en Vercel más adelante.
try {
 if (!admin.apps.length) {
  admin.initializeApp({
   credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
   }),
   databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
 }
} catch (error) {
 console.error('Error de inicialización de Firebase Admin:', error);
}

const db = admin.database();
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Esta es la función principal que Vercel ejecutará.
module.exports = async (req, res) => {
 // Solo permitimos que esta función se llame con el método POST.
 if (req.method !== 'POST') {
  return res.status(405).send({ message: 'Método no permitido' });
 }
 
 const { nombre, vehiculo, fecha } = req.body;
 
 // Verificación simple de que los datos llegaron.
 if (!nombre || !vehiculo || !fecha) {
  return res.status(400).send({ message: 'Faltan datos en la solicitud.' });
 }
 
 try {
  // 1. Guardar la nueva cita en la base de datos de Firebase.
  const nuevaCitaRef = db.ref('citas').push();
  const citaId = nuevaCitaRef.key;
  await nuevaCitaRef.set({
   id: citaId,
   nombre,
   vehiculo,
   fecha,
   estado: 'pendiente', // Todas las citas nuevas empiezan como pendientes.
  });
  
  // 2. Preparar y enviar el mensaje a Telegram.
  const textoMensaje = `Nueva solicitud de cita:\n\n*ID:* \`${citaId}\`\n*Nombre:* ${nombre}\n*Vehículo:* ${vehiculo}\n*Fecha:* ${new Date(fecha).toLocaleString('es-ES')}`;
  
  // Creamos los botones de "Aceptar" y "Rechazar".
  const tecladoTelegram = {
   inline_keyboard: [
    [
     { text: '✅ Aceptar', callback_data: `aceptar_${citaId}` },
     { text: '❌ Rechazar', callback_data: `rechazar_${citaId}` },
    ],
   ],
  };
  
  const urlTelegram = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  
  await fetch(urlTelegram, {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify({
    chat_id: CHAT_ID,
    text: textoMensaje,
    parse_mode: 'Markdown',
    reply_markup: tecladoTelegram,
   }),
  });
  
  // 3. Enviar una respuesta de éxito a la página web.
  res.status(200).json({ message: '¡Solicitud enviada! Recibirás la confirmación en el calendario.' });
  
 } catch (error) {
  console.error('Error al procesar la cita:', error);
  res.status(500).json({ message: 'Error interno del servidor.' });
 }
};
