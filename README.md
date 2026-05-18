

Esta es una suite pedagógica de nivel profesional y altamente interactiva diseñada para la visualización, aprendizaje y análisis del proceso de compilación sintáctica, cubriendo tanto analizadores sintácticos **Top-Down** como **Bottom-Up**.

El proyecto permite ingresar gramáticas personalizadas, calcular conjuntos **FIRST y FOLLOW**, generar tablas de análisis sintáctico detalladas paso a paso, visualizar el árbol de derivación (AST) de forma interactiva y animar la construcción y recorrido del autómata de estados de la gramática.

---

## 🌟 Características Clave

### 🖥️ Interfaz de Usuario (Frontend)
*   **Visualización Dinámica de Autómatas (React Flow + Dagre):**
    *   Migración completa a **React Flow** para soportar arrastrar y soltar (*drag-and-drop*) de los estados de la gramática.
    *   Las transiciones y flechas son inteligentes: se adaptan, estiran y recalculan matemáticamente en tiempo real mientras mueves los nodos por el lienzo.
    *   Diseño y auto-acomodo jerárquico automatizado mediante el motor **Dagre** (dirección izquierda a derecha `LR`).
    *   **Mini-Mapa de Navegación e indicador de cuadrícula:** Ideal para autómatas extensos (LALR/LR1), con soporte nativo de Zoom y Pan.
*   **Animación Pedagógica Paso a Paso:**
    *   Controles de reproducción estilo reproductor multimedia: Reproducir, Pausar, Avanzar, Retroceder y control de velocidad.
    *   Destellos visuales dinámicos (color Cyan y sombras de brillo) sobre el último estado descubierto para rastrear intuitivamente la lógica de construcción del autómata.
*   **Visor de Árboles AST Interactivo:**
    *   Renderiza el árbol de derivación en un canvas interactivo con capacidades de arrastre, zoom nativo y auto-centrado mediante doble clic.
    *   Diferenciación estética explícita entre nodos terminales (círculos verdes esmeralda) y no terminales (rectángulos índigo) con tipografía monospace.
*   **Historial de Consultas Persistente:**
    *   Panel lateral persistente a través de `localStorage` que registra todas tus gramáticas, cadenas ingresadas y el tipo de parser utilizado.
    *   Restauración instantánea con un solo clic.
*   **Teclado Virtual de Símbolos:**
    *   Incluye accesos rápidos para símbolos clave en la teoría de compiladores (`→`, `|`, `ε`, `λ`, `id`, `*`, `+`).

### ⚙️ Motor de Compilación (Backend)
*   **Soporte Multialgoritmo:**
    *   **Top-Down:** Descenso Recursivo y LL(1).
    *   **Bottom-Up:** LR(0), SLR(1), LALR(1) y LR(1).
*   **Detección de Conflictos:** Genera advertencias automáticas en caso de encontrar ambigüedades como conflictos *Shift/Reduce* o *Reduce/Reduce*.
*   **Protección Contra Bucles Infinitos (Recursión por la Izquierda):**
    *   Los parsers Top-Down detienen automáticamente su ejecución al superar las 50 iteraciones si detectan un bucle infinito causado por recursión izquierda en gramáticas no aptas.
    *   Truncado elegante en el frontend: Muestra los primeros 10 pasos indicando el ciclo y agrega una fila especial de aborto (`ABORT / ...`), protegiendo al servidor de caídas por `OutOfMemoryError` y manteniendo limpia la interfaz.
*   **Evitación de Colisión de Símbolos Aumentados:**
    *   Algoritmo inteligente de aumentación de gramática. Si tu gramática utiliza no-terminales con comilla simple (ej. `E'`), el backend detectará la colisión y aumentará el símbolo inicial con marcas únicas (ej. `E''`) para evitar cierres de aceptación prematuros.

---

## 🛠️ Stack Tecnológico

### Frontend
*   **Framework principal:** [React 18](https://react.dev/) con [TypeScript](https://www.typescriptlang.org/)
*   **Compilador/Empaquetador:** [Vite](https://vitejs.dev/)
*   **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
*   **Librería de Diagramas:** [@xyflow/react](https://reactflow.dev/) (React Flow)
*   **Motor de Layout:** [Dagre](https://github.com/dagrejs/dagre)
*   **Iconografía:** [Lucide React](https://lucide.dev/)

### Backend
*   **Framework principal:** [Spring Boot 3.2.5](https://spring.io/projects/spring-boot)
*   **Lenguaje:** [Java 21](https://www.oracle.com/java/technologies/downloads/) (JDK 21)
*   **Gestor de Dependencias:** Maven

---

## 📂 Estructura del Proyecto

```text
Compi_puntos/
├── backend/
│   ├── src/main/java/com/compiladores/parser/
│   │   ├── controller/      # Endpoints REST (Parser, CORS)
│   │   ├── model/           # Modelos de Gramática, Estados y Nodos AST
│   │   └── core/            # Núcleo de algoritmos de parsing
│   │       ├── topdown/     # LL(1) y Descenso Recursivo (con control de ciclos)
│   │       └── bottomup/    # LR(0), SLR(1), LALR(1), LR(1) (con aumentación segura)
│   ├── Dockerfile           # Receta de empaquetado Docker multi-stage
│   └── pom.xml              # Dependencias de Maven
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes UI (React Flow Canvas, ASTViewer, History, Keyboard)
│   │   ├── App.tsx          # Punto de entrada y gestión del estado global
│   │   └── types.ts         # Tipados TypeScript para la API
│   ├── index.html
│   ├── tailwind.config.js
│   └── package.json
└── README.md                # Este archivo de documentación
```

---

## 📝 Ejemplo de Prueba (Gramática de Expresiones)

Para poner a prueba todas las capacidades del analizador, te sugerimos utilizar el siguiente ejemplo:

1.  **Gramática compatible con LL(1):**
    ```text
    E -> T E'
    E' -> + T E' | ε
    T -> F T'
    T' -> * F T' | ε
    F -> ( E ) | id
    ```
2.  **Cadena de Entrada:**
    ```text
    id + id * id
    ```
3.  **Prueba de fallas (Ambigüedad/Recursión por izquierda):**
    Prueba la gramática `E -> E + E | E * E | id`. Selecciona **LL(1)** y verás la detección automática y truncado amigable de bucle infinito sin comprometer la estabilidad del sistema.

---

