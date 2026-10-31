# Reglas de afinidad

El matching separa la compatibilidad de cada criterio, expresada de 0 a 100, de su importancia. Si el estudiante no guarda una configuración se usan los pesos históricos. Si la guarda, sus valores se normalizan proporcionalmente para sumar 100. El resultado se redondea al entero más próximo entre 0 y 100. La IA no calcula el porcentaje y las explicaciones nacen de las mismas reglas que calculan cada compatibilidad.

| Componente | Peso recomendado | Regla de compatibilidad |
| :--- | ---: | :--- |
| Área de interés | 25% | Coincidencia completa: 100. Coincidencia parcial: 50. Sin coincidencia: 0. |
| Skills e idiomas | 30% | Habilidades coincidentes / habilidades requeridas × 100. |
| Formación | 15% | Carrera y etapa formativa se combinan conservando la lógica histórica. |
| Jornada | 10% | Compara horas semanales con jornada parcial o completa. |
| Horario | 10% | Intervalo contenido: 100. Superposición parcial: 50. Incompatible: 0. |
| Modalidad | 10% | Coincidencia exacta normalizada: 100. Distinta o sin preferencia: 0. |
| Salario | 0% | Preparado para datos estructurados comparables; inactivo en el catálogo actual. |

La contribución de un criterio es `compatibilidad × peso efectivo / 100`. Cuando una oferta no permite evaluar un criterio, ese criterio queda fuera y los pesos evaluables se redistribuyen proporcionalmente hasta sumar 100. La ausencia de horario o salario no se interpreta como incompatibilidad.

Jornada y horario se mantienen separados. En el catálogo actual, 107 de 111 ofertas informan jornada y 77 informan horario. La jornada compara carga semanal; el horario compara franjas concretas. Unirlos daría la misma penalización a dos datos con distinta cobertura y significado.

## Auditoría salarial

La tabla `ofertas_laborales` no tiene columnas de salario. Quince ofertas mencionan salario o remuneración en texto y cinco mencionan USD, pero ninguna informa un monto o rango numérico comparable. Tampoco hay periodicidad mensual, anual o por hora asociada a un monto. Por eso salario permanece con peso cero, no aparece como control activo y nunca penaliza una oferta. La arquitectura admite en el futuro `salario_min`, `salario_max`, moneda y periodicidad cuando existan datos reales.

## Supuestos y límites

1. El catálogo y sus aliases normalizan acentos, mayúsculas y variantes. La búsqueda textual solo se usa cuando una oferta no tiene clasificación estructurada. Cada habilidad cuenta una vez.
2. Cuando no se identifican habilidades requeridas, el criterio se excluye y se explica. El respaldo textual no distingue de forma exhaustiva requisitos excluyentes, deseables o negados.
3. La facultad nunca excluye ofertas. Una carrera relacionada recibe crédito parcial. No se infiere que un estudiante esté graduado ni que cumpla “avanzado” sin evidencia suficiente.
4. Las horas de jornada son umbrales documentados del MVP, no una interpretación contractual. El horario acepta intervalos como `09:00 a 18:00`; los días especiales y turnos ambiguos deben revisarse.
5. Las explicaciones incluyen habilidades faltantes, información no identificada y requisitos de experiencia que deben contrastarse manualmente.
6. El orden se calcula sobre todas las ofertas que cumplen búsqueda y filtros antes de dividirlas en páginas. Las descartadas se excluyen de recomendadas y pueden recuperarse.
7. El porcentaje no certifica aptitud ni elegibilidad. Los ejemplos y límites están cubiertos por pruebas unitarias.

# Extracción del CV

El análisis del CV solo propone datos de perfil. El porcentaje continúa siendo determinístico. Para skills, el backend usa primero las relaciones normalizadas de perfil y oferta. La búsqueda en requisitos queda como respaldo para ofertas sin filas en `oferta_skills` ni `oferta_idiomas`.
