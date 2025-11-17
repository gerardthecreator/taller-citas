// Archivo: api/telegram-webhook.js

const admin = require('firebase-admin');
const fetch = require('node-fetch');

// Reutilizamos la misma configuración de Firebase Admin.
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

module.exports = async (req, res) => {
 const { callback_query } = req.body;
 
 // Verificamos que la solicitud viene de un botón de Telegram.
 if (callback_query) {
  const [accion, citaId] = callback_query.data.split('_'); // Ej: "aceptar_12345"
  const chatId = callback_query.message.chat.id;
  const messageId = callback_query.message.message_id;
  
  const nuevoEstado = accion === 'aceptar' ? 'aceptada' : 'denegada';
  
  try {
   // 1. Actualizar el estado de la cita en Firebase.
   await db.ref(`citas/${citaId}`).update({ estado: nuevoEstado });
   
   // 2. (Opcional pero recomendado) Editar el mensaje original en Telegram para quitar los botones.
   const textoOriginal = callback_query.message.text;
   const nuevoTextoMensaje = `${textoOriginal}\n\n*--- ESTADO: ${nuevoEstado.toUpperCase()} ---*`;
   
   await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
     chat_id: chatId,
     message_id: messageId,
     text: nuevoTextoMensaje,
     parse_mode: 'Markdown',
    }),
   });
   
  } catch (error) {
   console.error('Error al procesar la respuesta de Telegram:', error);
  }
 }
 
 // Siempre respondemos a Telegram con un "OK" para que sepa que recibimos la señal.
 res.status(200).send('OK');
};
