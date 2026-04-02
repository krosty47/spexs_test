Test para Desarrollador Fullstack — Workflow Manager
Construye una aplicación fullstack usando NestJS (backend), tRPC (capa API) y Next.js
(frontend) que permita crear y gestionar workflows de alertas.
Configuración de un workflow
• Nombre y tipo de disparo: umbral o varianza
• Para umbral: nombre de la métrica, operador (>, <, >=, etc.) y valor numérico
• Para varianza: valor base y porcentaje de desviación
• Mensaje de salida en texto libre o con variables del tipo {{metrica}} y {{valor}}
• Uno o más destinatarios por canal: notificación in-app o email
Gestión y activación
• Cada workflow puede activarse o desactivarse
• El disparo puede simularse con un botón manual en la UI
• Al dispararse, se crea una entrada en el historial con timestamp, valores que lo causaron y
estado (abierto/resuelto)
• Si ya existe un evento abierto para ese workflow, no se debe crear un duplicado hasta que
se resuelva
Historial
• El usuario puede resolver un evento abierto desde la vista de historial
• El historial debe estar paginado y filtrable por workflow y por estado
Requisitos técnicos
• Toda la API a través de tRPC con validación de inputs usando Zod
• Frontend en Next.js con App Router
• ORM a elección con script de seed e instrucciones claras de setup
Funcionalidad extra (elige minimo 1)
• Snooze de eventos: posponer un evento abierto por X minutos, sin generar duplicados ni
notificaciones durante ese período
• Resumen diario: tarea programada que genera un resumen de eventos del día agrupados
por workflow y estado
• Comentarios en eventos: los usuarios pueden dejar notas al resolver un evento,
registradas en el historial
La evaluación se centrará en seguridad de tipos end-to-end, separación de responsabilidades,
manejo de errores y estructura de la capa tRPC. El pulido visual es secundario frente a la
correctitud y la arquitectura.
