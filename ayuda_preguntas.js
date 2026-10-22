// ayuda_preguntas.js — preguntas frecuentes de la app (datos puros). Expone window.TB.preguntas.
// Cada entrada: [icono, pregunta, respuesta, destino opcional].
(function () {
  'use strict';
  window.TB = window.TB || {};
  window.TB.preguntas = [
    ['⛪', '¿Cómo me uno a mi iglesia?', 'Pídele a tu pastor el código de 6 letras o números. Toca «Mi código» (el ícono de la iglesia, arriba en Mi iglesia), escríbelo, pon tu nombre y espera: tu pastor aprueba la solicitud y listo.'],
    ['📲', '¿Cómo uso mi cuenta en otro teléfono o en el computador?', 'Entra con el mismo correo y contraseña. Tu iglesia y tus avances te siguen solos. Si no tienes cuenta, créala en «Entrar con mi correo y contraseña».'],
    ['🔒', '¿Qué ve mi pastor de mí?', 'Tu nombre, tus peticiones de oración y tus pedidos de visita. Tu diario, tu crecimiento y tus avances no los ve nadie de tu iglesia.', 'privacidad'],
    ['📴', '¿Qué sirve sin internet?', 'La Biblia que ya abriste, el versículo, tu diario, tu crecimiento y los cursos que ya viste. Pedir oración o visita y el muro necesitan internet.'],
    ['🔑', 'Olvidé mi contraseña', 'En «Entrar con mi correo» toca «¿Olvidaste tu contraseña?». Te llega un correo con un enlace; revisa también «spam».'],
    ['🛠️', 'No puedo entrar o crear mi cuenta', 'En esa pantalla toca «¿No funciona? Revisar la conexión»: te dice qué falla. Si el correo de confirmación no llega, usa «Reenviar el correo de confirmación».'],
    ['🗑️', '¿Cómo borro mis datos?', 'En «Mi privacidad» puedes descargarlos, apagar y borrar la copia de tu cuenta, o salir de la iglesia para borrar tu nombre de su lista.', 'privacidad'],
    ['🌳', '¿Qué es el Inicio y cómo crece mi árbol?', 'Es tu lugar tranquilo. Al empezar eliges un lugar (bosque nativo, desierto florido o costa del Pacífico) y su árbol crece mientras lees y vives la Palabra: madura en 10 días, uno por cada día que entras a '+
      'Inicio. El lugar se completa también en 10 días, con detalles nuevos que van apareciendo en el camino. Verás siempre cuántos días faltan. Si pasas varios días sin entrar, puede aparecer maleza en tu jardín.'],
    ['💧', '¿Qué son las gotas de rocío y cómo las gano?', 'Las ganas al leer un capítulo, al hacer un paso de «Hoy lo hago», al avanzar un día de un plan, al jugar (con 6 '+
      'aciertos de cada 10) y con la trivia diaria. Hay un máximo por día. No vencen, no se compran con dinero y las usas en tu Inicio.'],
    ['📖', '¿Cómo cambio la versión de la Biblia?', 'En Palabra toca «Leer la Biblia» y elige la versión que prefieras. Los libros que vas leyendo quedan guardados para leer sin internet.'],
    ['🗓', '¿Cómo sigo un plan de lectura?', 'En Palabra toca «Plan de lectura», elige uno y marca cada día cuando lo leas. Mientras tengas uno en curso, esa tarjeta dice «Mi plan» y te lleva al día que toca.'],
    ['🙏', '¿Dónde pido ayuda si lo necesito hoy?', 'En Vida toca «Ayuda y contactos»: ahí están las emergencias, las líneas de apoyo en Chile y a quién acudir en tu iglesia. Si hay peligro inmediato, llama primero.'],
    ['📲', '¿Cómo instalo la app en mi teléfono?', 'Toca «Instalar la app» en el aviso de Palabra o en el menú y sigue los pasos que aparecen. Así se abre como cualquier otra app, desde tu pantalla de inicio.'],
    ['🗑', '¿Puedo descargar o borrar mis datos?', 'Sí. En «Mi privacidad» puedes descargar tus datos o eliminar tu cuenta y todo lo guardado. Se llega desde Perfil, en la sección Cuenta.', 'privacidad']
  ];
})();
