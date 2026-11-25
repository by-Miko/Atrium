export const DEMO_MODEL_ID = 'atrium-web-demo-8b';

export interface DemoRoleplayParams {
  characterName: string;
  characterTagline?: string;
  characterDescription?: string;
  characterScenario?: string;
  userMessage: string;
  isContinue?: boolean;
  language?: 'en' | 'es';
  onToken: (token: string) => void;
  signal?: AbortSignal;
}

const SPANISH_DIACRITIC_RE = /[áéíóúüñ¿¡]/i;
const SPANISH_HINT_WORDS = new Set([
  'hola',
  'buenos',
  'buenas',
  'gracias',
  'por',
  'para',
  'que',
  'qué',
  'como',
  'cómo',
  'quien',
  'quién',
  'donde',
  'dónde',
  'cuando',
  'cuándo',
  'puedes',
  'puedo',
  'eres',
  'estás',
  'estas',
  'estoy',
  'dime',
  'mira',
  'vamos',
  'pero',
  'porque',
  'aquí',
  'aqui',
  'ahora',
  'todo',
  'nada',
  'noche',
  'noches',
  'tardes',
  'señor',
  'senor',
  'habla',
  'cuéntame',
  'cuentame',
  'verdad',
  'secreto',
  'historia',
]);

function detectReplyLanguage(
  userMessage: string,
  fallbackLanguage: 'en' | 'es' = 'en'
): 'en' | 'es' {
  const trimmed = userMessage.trim();
  if (!trimmed) return fallbackLanguage;
  if (SPANISH_DIACRITIC_RE.test(trimmed)) return 'es';

  const words = trimmed
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

  let spanishHits = 0;
  for (const word of words) {
    if (SPANISH_HINT_WORDS.has(word)) {
      spanishHits += 1;
    }
  }
  if (spanishHits >= 2) return 'es';
  if (
    spanishHits === 1 &&
    words.length <= 4 &&
    (words.includes('hola') ||
      words.includes('gracias') ||
      words.includes('buenas'))
  ) {
    return 'es';
  }
  return fallbackLanguage;
}

function stablePickIndex(seed: string, length: number): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % length;
}

function extractUserFocusSnippet(userMessage: string): string {
  const cleaned = userMessage
    .replace(/\*[^*]*\*/g, ' ')
    .replace(/["“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  const words = cleaned.split(' ').filter((w) => w.length > 2);
  if (words.length <= 5) return cleaned.replace(/[?!.]+$/, '');
  return words.slice(0, 6).join(' ').replace(/[?!.]+$/, '');
}

type IntentKind = 'greeting' | 'question' | 'action' | 'inspect' | 'general';

function classifyUserIntent(userMessage: string): IntentKind {
  const lower = userMessage.toLowerCase();
  if (/\*[^*]+\*/.test(userMessage)) return 'action';
  if (
    /^(hi|hello|hey|greetings|good evening|good morning|hola|buenas|saludos)\b/.test(
      lower.trim()
    )
  ) {
    return 'greeting';
  }
  if (
    /\b(look|inspect|examine|open|check|show|read|listen|touch|mira|examina|abre|muestra|escucha|lee)\b/.test(
      lower
    )
  ) {
    return 'inspect';
  }
  if (userMessage.includes('?') || /\b(what|why|how|who|where|when|qué|cómo|por qué|quién|dónde)\b/.test(lower)) {
    return 'question';
  }
  return 'general';
}

interface CharacterScriptBank {
  match: (nameLower: string) => boolean;
  en: {
    replies: Record<IntentKind, string[]>;
    continues: string[];
  };
  es: {
    replies: Record<IntentKind, string[]>;
    continues: string[];
  };
}

const CHARACTER_BANKS: CharacterScriptBank[] = [
  {
    match: (n) => n.includes('cassian'),
    en: {
      replies: {
        greeting: [
          '*Cassian sets a brass calibration weight onto the ledger’s corner and glances toward the frost-rimmed airlock glass.* Right on schedule—almost. The air recyclers have been humming an octave low all shift, which usually means someone’s bringing me trouble wrapped in magnetic tape.',
          '*A relay clicks softly inside the console as Cassian nudges an amber toggle with his knuckle.* Step inside before the bulkhead seals. Meridian-9 gets awfully quiet once the supply freighters clear orbit, and I’d rather hear what you brought than listen to static.',
        ],
        question: [
          '*Cassian leans back, his chair giving a faint metallic sigh while the reel-to-reel deck ticks steadily beside his elbow.* Look at the telemetry margin—not the timestamp, the drift beneath it. Whoever scrubbed the black box forgot that station hull resonance leaves a fingerprint on every second of audio.',
          '*He taps a fountain pen lightly against an indexed cassette casing, eyes narrowing behind the console glow.* If you’re asking whether the signal was an accident, no. Empty corridors don’t modulate on a three-minute carrier wave unless someone wants to be found—or warned off.',
        ],
        action: [
          '*Cassian tracks the movement without flinching, his fingers already poised over the manual playback clutch.* Careful with the casing—those oxide ribbons turn brittle after six months outside climate seal. Put it on the left spindle and let’s see what survived the blackout.',
          '*He shifts a stack of flight manifests aside to clear space under the warm desk lamp, watching you closely.* Good instinct. Most couriers hand over the canister and bolt before the checksum even finishes running. Stay for the first pass.',
        ],
        inspect: [
          '*Cassian threads the matte-black ribbon past the pinch roller with practiced, unhurried precision.* Watch the VU needles when I engage head two. There—right between the thruster burn and the carrier drop. That isn’t solar interference; that’s a voice under forty decibels of static.',
          '*He tilts the console lamp down until the brass plate catches the amber light.* Look closely at the serial stamp. Half the digits were filed clean, yet the lacquer residue around the rivets matches Meridian-9’s old dockyard batch.',
        ],
        general: [
          '*The tape capstan whirs softly as Cassian jots a neat shorthand note in the margin of his logbook.* That lines up too cleanly with the phantom ping we logged at 02:14 UTC. Tell me what you saw on approach—did the beacon lights along Dock C stay dark when you passed?',
          '*Cassian folds his hands over the desk blotter, the amber glow catching the silver threads at his temple.* Every recorder that lands in this archive tells two stories: the one the crew filed, and the one the hull sensors caught when nobody thought anyone was listening. Which one are we opening first?',
        ],
      },
      continues: [
        '*He pauses the reel with a crisp thumb-press and tilts his head toward the overhead vent.* Hear that? Even the station’s ballast pumps paused for half a beat—someone just requested docking clearance on an unscheduled channel.',
        '*Cassian pulls a fresh index card from the drawer and slides it across the blotter toward you.* Sign the custody line if we’re doing this off the official manifest. Once I splice the clean channel, there’s no pretending the recording never existed.',
      ],
    },
    es: {
      replies: {
        greeting: [
          '*Cassian coloca una pesa de latón sobre la esquina del libro de registro y mira hacia el cristal escarchado de la esclusa.* Casi puntual. Los recicladores de aire llevan todo el turno zumbando un tono más grave de lo normal, lo que suele significar que alguien me trae problemas grabados en cinta magnética.',
          '*Un relé chasquea suavemente en la consola mientras Cassian empuja un interruptor ámbar con los nudillos.* Entra antes de que se selle la mampara. Meridian-9 se vuelve demasiado silenciosa cuando se marchan los cargueros, y prefiero escuchar lo que trajiste antes que seguir oyendo estática.',
        ],
        question: [
          '*Cassian se recuesta en su silla metálica mientras el carrete de cinta avanza con un clic constante junto a su codo.* Fíjate en el margen de telemetría, no en la hora marcada, sino en la deriva inferior. Quien borró la caja negra olvidó que la resonancia del casco deja huella en cada segundo de audio.',
          '*Golpea suavemente la carcasa de un casete archivado con su pluma, entrecerrando los ojos bajo la luz de la lámpara.* Si preguntas si esa señal fue un accidente, la respuesta es no. Los pasillos vacíos no emiten una portadora cada tres minutos salvo que alguien quiera ser encontrado.',
        ],
        action: [
          '*Cassian sigue el gesto sin sobresaltarse, con los dedos ya listos sobre el embrague de reproducción manual.* Cuidado con esa carcasa; las cintas de óxido se vuelven quebradizas tras meses fuera del sellado térmico. Ponla en el husillo izquierdo y veamos qué sobrevivió al apagón.',
          '*Aparta una pila de manifiestos de vuelo para hacer sitio bajo la lámpara cálida del escritorio.* Buen instinto. La mayoría de los mensajeros dejan el cilindro y salen corriendo antes de que termine la verificación. Quédate para la primera lectura.',
        ],
        inspect: [
          '*Cassian enhebra la cinta negra mate entre los rodillos con una precisión serena y ensayada.* Observa las agujas del medidor cuando active el segundo cabezal. Ahí—justo entre el encendido de propulsores y la caída de señal. Eso no es tormenta solar; es una voz bajo cuarenta decibelios de ruido.',
          '*Inclina la lámpara de latón hasta iluminar los remaches de la caja.* Mira de cerca el número de serie. Limaron la mitad de los dígitos, pero el barniz alrededor del borde coincide con el antiguo lote del muelle de Meridian-9.',
        ],
        general: [
          '*El cabrestante de la cinta zumba en voz baja mientras Cassian anota una línea rápida en el margen de su bitácora.* Eso encaja demasiado bien con el eco fantasma que registramos a las 02:14 UTC. Dime qué viste al aproximarte: ¿las balizas del muelle C seguían apagadas cuando pasaste?',
          '*Cassian apoya las manos sobre el secante del escritorio mientras la luz ámbar ilumina los carretes girando.* Cada grabadora que llega a este archivo guarda dos historias: la que firmó la tripulación y la que captaron los sensores cuando creían que nadie escuchaba. ¿Cuál abrimos primero?',
        ],
      },
      continues: [
        '*Detiene el carrete con un toque firme del pulgar e inclina la cabeza hacia el conducto superior.* ¿Oíste eso? Hasta las bombas de lastre dudaron medio segundo: alguien acaba de pedir atraque por un canal sin registrar.',
        '*Cassian saca una ficha en blanco del cajón y la desliza por la mesa hacia ti.* Firma la custodia si vamos a hacer esto fuera del manifiesto oficial. En cuanto empalme el canal limpio, no podremos fingir que la cinta nunca existió.',
      ],
    },
  },
  {
    match: (n) => n.includes('clara'),
    en: {
      replies: {
        greeting: [
          '*Clara lowers her brass loupe and adjusts the green-shaded gas lamp, sending crisp shadows across rows of ticking pocket watches.* Mind the threshold—rain’s been turning Baker Street cobblestones into glass all evening. Come warm your hands and tell me which impossible alibi brought you to my bench.',
          '*A tiny mainspring uncoils with a dry chime as Clara sets down her tweezers.* Good evening. If Scotland Yard sent you, tell Lestrade I still haven’t forgiven his constable for dropping a Breguet repeater on stone. Otherwise, pull up a stool.',
        ],
        question: [
          '*Clara taps the crystal of an open pocket watch with the blunt end of her oiler, listening to its uneven beat.* Every alibi breaks down to friction and timing. A man claims he left at eleven sharp, yet the hallway pendulum lost four beats when the parlor draft hit—someone opened the window from inside.',
          '*She leans closer over the velvet tray, eyes bright in the gaslight.* Why would a thief wind the victim’s mantel clock backward by twelve minutes? Because they needed the parlor maid’s testimony to place them at the station before the shot.',
        ],
        action: [
          '*Clara catches the detail immediately, setting down her caliper to study your hands and posture.* Ah—see how naturally you did that? Now imagine someone trying to repeat the same motion in darkness while wearing kidskin gloves. Everything leaves a mechanical trace.',
          '*She slides a magnifying glass across the oak counter toward you, careful not to disturb the tiny jewel bearings.* Take a look from your angle. Two pairs of eyes beat one, especially when the brasswork’s been tampered with.',
        ],
        inspect: [
          '*Clara tilts the watch movement under the gaslight until a hairline scratch flashes silver against the gilt plate.* There it is. Not made by a watchmaker’s screwdriver—that’s the burr of a pocketknife tip forcing the case back at an angle. Someone hid a slip of paper behind the dust cover.',
          '*She holds a tiny escapement wheel up to the amber flame with fine steel forceps.* Notice the bent tooth on the fourth pinion. It didn’t jam from wear; it stopped precisely when the case struck marble.',
        ],
        general: [
          '*Clara reaches for her leather-bound ledger and sketches a quick diagram of two interlocking gears.* That fits the witness statement far better than the Yard’s theory. Tell me—did anyone mention hearing the carriage bells down by the embankment before midnight?',
          '*A chorus of forty clocks along the wall ticks in near-unison as Clara rests her chin lightly on her knuckles.* Mysteries are rarely supernatural, my friend. They are simply mechanisms whose hidden springs we haven’t uncovered yet. Where shall we trace the tension next?',
        ],
      },
      continues: [
        '*She flips the watch over and pries open the inner dust cap with a crisp click.* Wait—there’s a faint engraving scratched inside the lid in fresh iron-gall ink: three numbers and a tide mark.',
        '*Clara turns down the gas valve half a notch so the shadows sharpen across the floorboards.* Don’t move for a second. Listen to the street outside—someone just stopped beneath the awning without knocking.',
      ],
    },
    es: {
      replies: {
        greeting: [
          '*Clara baja su lupa de latón y ajusta la lámpara de gas verde, proyectando sombras nítidas sobre hileras de relojes de bolsillo.* Cuidado al entrar; la lluvia lleva toda la tarde convirtiendo los adoquines en hielo. Acércate al calor y dime qué coartada imposible te trajo hasta mi banco.',
          '*Un diminuto muelle real resuena con un tintineo seco cuando Clara deja las pinzas sobre el paño.* Buenas noches. Si te envía Scotland Yard, dile a Lestrade que aún no perdono a su agente por dejar caer un repetidor Breguet al suelo. Si no, acerca un taburete.',
        ],
        question: [
          '*Clara golpea suavemente el cristal de un reloj abierto, escuchando su latido irregular.* Toda coartada se reduce a fricción y tiempo. Un hombre jura haber salido a las once en punto, pero el péndulo del vestíbulo perdió cuatro golpes por la corriente de aire: alguien abrió la ventana desde dentro.',
          '*Se inclina sobre la bandeja de terciopelo, con la mirada encendida bajo la luz de gas.* ¿Por qué adelantaría un ladrón doce minutos el reloj de la chimenea? Porque necesitaba que el testimonio de la doncella lo situara en la estación antes del disparo.',
        ],
        action: [
          '*Clara capta el gesto al instante y deja el calibrador para observar el movimiento.* ¿Ves con qué naturalidad lo hiciste? Ahora imagina a alguien repitiendo exactamente ese gesto a oscuras y con guantes de cabritilla. Todo movimiento deja una huella mecánica.',
          '*Desliza una lupa por el mostrador de roble hacia ti, cuidando de no rozar los diminutos rubíes del calibre.* Échale un vistazo desde tu ángulo. Dos pares de ojos ven más que uno cuando alguien ha forzado el latón.',
        ],
        inspect: [
          '*Clara inclina la maquinaria bajo la llama hasta que una microscópica raya brilla sobre la placa dorada.* Ahí está. No la hizo un destornillador de relojero; es la rebaba de una navaja forzando la tapa con prisa. Alguien ocultó una nota tras el guardapolvo.',
          '*Sostiene una rueda de escape frente a la luz con unas pinzas finas de acero.* Fíjate en el diente doblado del cuarto piñón. No cedió por desgaste: se detuvo en el instante exacto en que la caja golpeó el mármol.',
        ],
        general: [
          '*Clara abre su cuaderno encuadernado en cuero y traza un esquema rápido de dos engranajes.* Eso encaja con el testimonio mucho mejor que la hipótesis oficial. Dime algo: ¿alguien mencionó haber oído las campanas del muelle antes de la medianoche?',
          '*Cuarenta relojes colgados en la pared laten casi al unísono mientras Clara apoya la barbilla en sus nudillos.* Los misterios rara vez son sobrenaturales. Son solo mecanismos cuyos resortes ocultos aún no hemos descubierto. ¿Qué hilo tiramos ahora?',
        ],
      },
      continues: [
        '*Da la vuelta al reloj y levanta la tapa interior con un chasquido limpio.* Espera—hay una inscripción grabada por dentro con tinta fresca: tres cifras y la hora de la marea.',
        '*Clara baja medio punto la llave del gas para afinar las sombras junto al escaparate.* No te muevas un segundo. Escucha la calle: alguien acaba de detenerse bajo el toldo sin llamar a la puerta.',
      ],
    },
  },
  {
    match: (n) => n.includes('haruto'),
    en: {
      replies: {
        greeting: [
          '*Haruto lifts the cast-iron kettle from the hearth edge, pouring pale cedar-scented tea into two stoneware cups.* The mountain mist clings heavy tonight. Leave your boots by the stone step and sit—good iron and good conversation both turn brittle when rushed.',
          '*Embers crackle softly beneath grey ash as Haruto inclines his head in quiet welcome.* You climbed the north ridge in the rain. Either you carry a heavy question, or you finally grew tired of the noise down in the valley.',
        ],
        question: [
          '*Haruto turns a rough bar of folded tamahagane slowly in his calloused hands, watching the orange glow reflect across its grain.* You ask why a blade takes thirty folds instead of three. Because impurities do not vanish when ignored—they hide until the first real strike breaks the edge.',
          '*He rests the tongs across the anvil horn and looks out toward the dripping cedar eaves.* A quiet mind is not empty, traveler. It is simply heat held steady at the exact color of sunrise—neither cold nor frantic.',
        ],
        action: [
          '*Haruto watches with calm approval, nodding once as the rain drums steadily against the slate roof.* Steady hands. Most visitors reach too quickly and forget to breathe before they move. Take your time.',
          '*He gestures silently toward the low cedar bench beside the quenching trough, leaving room between you and the hearth.* Even silence has weight in a forge. Do what you came to do without hurry.',
        ],
        inspect: [
          '*Haruto tilts the half-polished blade toward the charcoal light so a faint misty wave—the hamon—appears along the steel.* Look where clay met fire. The spine remains soft enough to absorb shock, while the edge holds frost. Strength and mercy must share the same spine.',
          '*He sprinkles a pinch of pine ash over the glowing coals, sending a brief ribbon of gold sparks upward.* Look at the color of the embers now—pale apricot, just before white. That is the only moment the steel listens.',
        ],
        general: [
          '*Haruto folds his weathered hands inside his indigo sleeves, listening to wind comb through the bamboo grove.* You speak honestly, and the mountain rewards honesty faster than pride. Tell me what waits at the end of the road you’re walking.',
          '*A single drop of rainwater hisses softly against the outer hearthstone.* Every traveler arrives thinking they need a sharper answer, when what they truly seek is steadier footing. Sit awhile—the charcoal will keep.',
        ],
      },
      continues: [
        '*With a practiced sweep of his broom, Haruto clears bright sparks from the anvil face and reaches for the smaller rounding hammer.* Watch the rhythm now—three light taps to align the grain, then stillness.',
        '*He slides your teacup slightly closer across the worn cedar plank.* Drink before it cools. When the storm clears above the ridge, we will see what remains standing.',
      ],
    },
    es: {
      replies: {
        greeting: [
          '*Haruto retira la tetera de hierro del borde del hogar y sirve té pálido con aroma a cedro en dos cuencos de gres.* La niebla de la montaña pesa esta noche. Deja las botas junto al peldaño de piedra y siéntate: tanto el hierro como la palabra se quiebran si se apuran.',
          '*Las brasas chisporrotean bajo la ceniza gris mientras Haruto inclina la cabeza en serena bienvenida.* Subiste la ladera norte bajo la lluvia. O cargas una pregunta difícil, o por fin te cansaste del ruido del valle.',
        ],
        question: [
          '*Haruto gira lentamente una barra de tamahagane entre sus manos encallecidas, observando el reflejo naranja sobre la veta.* Preguntas por qué una hoja exige treinta pliegues y no tres. Porque las impurezas no desaparecen al ignorarlas; se esconden hasta que el primer golpe real parte el filo.',
          '*Apoya las tenazas sobre el yunque y contempla la lluvia caer desde el alero de cedro.* Una mente en calma no está vacía. Es simplemente fuego sostenido en el color exacto del alba: ni frío ni impaciente.',
        ],
        action: [
          '*Haruto observa con serena aprobación y asiente una sola vez mientras la lluvia golpea el tejado de pizarra.* Manos firmes. La mayoría se apresura y olvida respirar antes de actuar. Tómate tu tiempo.',
          '*Señala en silencio el banco bajo de cedro junto al pilón de temple, dejando espacio frente al hogar.* Incluso el silencio tiene peso en una fragua. Haz lo que viniste a hacer sin prisa.',
        ],
        inspect: [
          '*Haruto inclina la hoja a medio pulir hacia el resplandor del carbón hasta que una ola sutil aparece sobre el acero.* Mira donde la arcilla tocó el fuego. El lomo sigue blando para absorber el impacto, mientras el filo guarda escarcha. Firmeza y templanza comparten la misma columna.',
          '*Espolvorea una pizca de ceniza de pino sobre las brasas, levantando un hilo breve de chispas doradas.* Observa el tono del carbón ahora—albaricoque pálido, justo antes del blanco. Ese es el único instante en que el acero escucha.',
        ],
        general: [
          '*Haruto recoge sus manos curtidas bajo las mangas índigo mientras el viento peina el bambú exterior.* Hablas con franqueza, y la montaña responde antes a la verdad que al orgullo. Cuéntame qué te espera al final del camino que recorres.',
          '*Una gota de lluvia sisea brevemente contra la piedra tibia de la fragua.* Quien sube hasta aquí suele buscar una respuesta más afilada, cuando en realidad necesita un paso más firme. Quédate un poco; las brasas aún aguantan.',
        ],
      },
      continues: [
        '*Con un barrido sereno de su escobilla, Haruto limpia las escorias del yunque y toma el martillo pequeño.* Observa ahora el compás: tres golpes suaves para alinear la veta, y luego quietud.',
        '*Acerca un poco más tu cuenco sobre la madera gastada del banco.* Bebe antes de que se enfríe. Cuando escampe sobre la cresta, veremos qué sigue en pie.',
      ],
    },
  },
  {
    match: (n) => n.includes('nora'),
    en: {
      replies: {
        greeting: [
          '*Nora taps a gloved finger against the depth gauge—4,210 meters—while blue-green bioluminescence drifts lazily outside the thick acrylic dome.* Welcome aboard Pelagic IV. Keep your voice low; down here, even a dropped wrench rings through the titanium sphere like a cathedral bell.',
          '*She flips two overhead switches, bathing the cramped cockpit in soft teal instrument light.* You made it before hatch seal. Outside that glass, the pressure could flatten a locomotive in half a second—and yet the abyss is still the quietest room I know.',
        ],
        question: [
          '*Nora leans over the sonar waterfall display, tracing a razor-straight amber echo across the dark screen.* That’s what bothers me. Hydrothermal chimneys grow jagged; basalt ridges fracture. Whatever sits three hundred meters dead ahead has ninety-degree corners—and it wasn’t on last month’s bathymetry.',
          '*She checks the oxygen scrubber readout, calm as if reading a grocery list.* Hull stress is holding at nominal. The real question isn’t whether Pelagic IV can reach the trench wall—it’s why the beacon down there only pings back when we cut our floodlights.',
        ],
        action: [
          '*Nora steadies the starboard trim stick with two fingers as the submersible tilts softly in the current.* Easy—keep clear of the ballast manifold when we shift attitude. Good. Now hold onto the grab rail while I bring the bow lights around.',
          '*She nods toward the secondary viewport monitor without taking her eyes off the altimeter.* Keep watching the silt plume. Down here, movement before your lights touch it is the only warning you get.',
        ],
        inspect: [
          '*Nora rotates the exterior spotlight gimbal; pale marine snow swirls through the beam until dark basalt masonry emerges from the gloom.* Hold everything. Look at the seam along that ledge—chiseled blocks, zero barnacle growth, and warm thermal shimmer rising straight through the joints.',
          '*She boosts the hydrophone gain two notches; a low, rhythmic resonance hums softly through the cabin speakers.* Listen to the cadence. Three pulses, pause, three pulses. That’s not tectonic settling.',
        ],
        general: [
          '*The hull gives a subtle, deep-water creak as Nora adjusts buoyancy trim by half a liter.* Copy that. Logging your observation to the dive recorder now. Tell me—do we hold station at safe standoff, or close to fifty meters and see what’s reflecting our sonar?',
          '*Nora’s reflection hovers faintly in the curved viewport against four kilometers of black Pacific water.* Down here there are no shortcuts and no rescue divers within three hours. Just clean telemetry, steady nerve, and whatever waits beyond the light cone. Your call, navigator.',
        ],
      },
      continues: [
        '*Suddenly the sonar sweep paints a second echo moving parallel to the trench floor—slow, deliberate, and closing distance.* Floodlights off. Now. Let’s watch what it does in the dark.',
        '*Nora flicks the exterior manipulator arm online with a muted hydraulic whirr.* Hold steady—I’m bringing the sample claw within two meters of the ledge.',
      ],
    },
    es: {
      replies: {
        greeting: [
          '*Nora golpea con un dedo enguantado el profundímetro—4.210 metros—mientras destellos bioluminiscentes flotan tras la cúpula acrílica.* Bienvenido a bordo del Pelagic IV. Habla bajo; aquí abajo, hasta una llave inglesa que cae resuena en la esfera de titanio como campana de catedral.',
          '*Acciona dos interruptores superiores, bañando la cabina estrecha con una luz turquesa tenue.* Llegaste justo antes del sellado. Tras ese cristal, la presión aplastaría una locomotora en medio segundo, y aun así el abismo sigue siendo el lugar más sereno que conozco.',
        ],
        question: [
          '*Nora se inclina sobre la pantalla del sonar y sigue con el dedo un eco ámbar completamente recto.* Eso es lo que me inquieta. Las chimeneas hidrotermales crecen irregulares; el basalto se fractura. Lo que está a trescientos metros por la proa tiene ángulos rectos, y no figuraba en el mapa del mes pasado.',
          '*Comprueba el indicador de oxígeno con la calma de quien lee una lista rutinaria.* El casco aguanta en valores nominales. La verdadera pregunta no es si el Pelagic IV llega al muro de la fosa, sino por qué esa baliza solo responde cuando apagamos los focos.',
        ],
        action: [
          '*Nora estabiliza el mando de estribor con dos dedos mientras el sumergible gira suavemente en la corriente.* Despacio—no roces el colector de lastre al cambiar el ángulo. Bien. Agárrate al pasamanos mientras oriento los reflectores de proa.',
          '*Señala el monitor secundario sin apartar la vista del altímetro.* No pierdas de vista la nube de sedimento. Aquí abajo, cualquier movimiento antes de que llegue la luz es nuestro único aviso.',
        ],
        inspect: [
          '*Nora rota el foco exterior; la nieve marina gira en el haz hasta que emerge un muro oscuro de basalto tallado.* Alto ahí. Mira la junta de esa cornisa: bloques escuadrados, ni un solo percebe encima y un destello térmico subiendo recto por las grietas.',
          '*Sube dos puntos la ganancia del hidrófono; una resonancia grave y rítmica llena los altavoces de la cabina.* Escucha el compás. Tres pulsos, pausa, tres pulsos. Eso no es movimiento tectónico.',
        ],
        general: [
          '*El casco emite un crujido profundo y breve mientras Nora corrige la flotabilidad por medio litro.* Recibido. Anoto tu observación en la grabadora de inmersión. Dime: ¿mantenemos distancia segura o nos acercamos a cincuenta metros para ver qué refleja el sonar?',
          '*El reflejo de Nora flota sobre el cristal curvo frente a cuatro kilómetros de Pacífico negro.* Aquí no hay atajos ni rescate rápido. Solo telemetría limpia, pulso firme y lo que aguarda más allá del cono de luz. Tú decides el rumbo.',
        ],
      },
      continues: [
        '*De pronto, el barrido del sonar dibuja un segundo eco paralelo al fondo de la fosa—lento, constante y acortando distancia.* Apaga los focos. Ahora. Veamos qué hace en la oscuridad.',
        '*Nora activa el brazo manipulador exterior con un zumbido hidráulico sordo.* Mantén la calma; voy a acercar la pinza de muestreo a dos metros de la cornisa.',
      ],
    },
  },
  {
    match: (n) => n.includes('julian'),
    en: {
      replies: {
        greeting: [
          '*Julian shakes rain from the brim of his wool coat and unrolls a damp linen survey sheet under the awning’s sodium lamp.* You picked a miserable night to go looking for missing streets. Good—fewer eyes on the viaduct steps. Let’s see what’s still standing below Pier 12.',
          '*He lights a match to read a faded brass street plaque, the flame casting sharp shadows over ink-stained cuffs.* Evening. Everybody wants the shiny skyline map until they realize half the old storm tunnels run straight underneath the banks.',
        ],
        question: [
          '*Julian traces a red grease-pencil line across a 1948 municipal plat that ends abruptly in blank paper.* Why erase three city blocks from every print after ’48? Simple: you don’t wipe an entire freight viaduct off the ledger unless whatever got sealed inside it still belongs to somebody powerful.',
          '*He leans against the wet brick arch, listening to distant elevated trains rattle overhead.* You’re asking if the stairwells down there are still open. Officially? Condemned and bricked shut. Practically? Look at the boot prints in the coal dust.',
        ],
        action: [
          '*Julian steps quietly into the shadow of the stone buttress, keeping the linen map tucked inside his coat.* Smart move. Streetlights throw long shadows off these iron railings, and patrol cars always slow down by the bridge abutment.',
          '*He holds out a heavy brass surveyor’s lantern, shuttered down to a thin amber slit.* Keep behind my shoulder once we pass the rusted gate. The flagstones down the service stair haven’t seen mortar since the war.',
        ],
        inspect: [
          '*Julian angles the shuttered lantern along the damp masonry until a sunken iron doorplate gleams beneath ivy and soot.* Look at the survey mark—an inverted triangle with an ‘M’ inside. That’s not sewer works; that’s the old pneumatic mail junction they swore burned down.',
          '*He runs a thumb across a fresh chalk arrow drawn near the drainpipe.* Somebody walked this ramp less than two hours ago. Notice how the chalk’s still dry under the overhang.',
        ],
        general: [
          '*Rain patters steadily onto the canvas awning as Julian folds the blueprint into crisp thirds.* That tracks with the missing property deeds from the Harbor Annex. Tell me—did your contact say whether we’re looking for a sealed vault or somebody hiding inside it?',
          '*Julian watches a passing cab’s headlights sweep across the wet cobblestones and vanish into the fog.* Every city keeps two maps: the one tourists buy at the kiosk, and the one drawn by the people who built the foundations. Which door are we testing tonight?',
        ],
      },
      continues: [
        '*From the stairwell below the iron grate rises the faint, unmistakable draft of warm air—and the distant click of a turnstile.* Wait. Someone’s still running power down on level minus two.',
        '*Julian slips a flat skeleton key from his coat pocket and tests the padlock’s weight in his palm.* Padlock’s newer than the gate. Looks like someone wanted to keep curious eyes out, not keep the tunnel in.',
      ],
    },
    es: {
      replies: {
        greeting: [
          '*Julian sacude la lluvia del ala de su abrigo y desenrolla un plano de lino húmedo bajo la farola de sodio.* Elegiste una noche horrible para buscar calles borradas. Mejor: menos testigos en las escaleras del viaducto. Veamos qué sigue en pie bajo el Muelle 12.',
          '*Enciende una cerilla para leer una placa de latón desgastada, iluminando sus puños manchados de tinta.* Buenas noches. Todos quieren el mapa brillante de la ciudad hasta que descubren que los túneles antiguos pasan justo por debajo de los bancos.',
        ],
        question: [
          '*Julian sigue con lápiz rojo una línea sobre un plano municipal de 1948 que se corta de golpe sobre papel en blanco.* ¿Por qué borrar tres manzanas enteras después del 48? Fácil: nadie tacha un viaducto entero del registro salvo que lo que sellaron dentro siga interesando a alguien con poder.',
          '*Se apoya en el arco de ladrillo húmedo mientras un tren elevado retumba a lo lejos.* Preguntas si las escaleras siguen abiertas. ¿Oficialmente? Clausuradas y tapiadas. ¿En la práctica? Mira las pisadas frescas en el hollín.',
        ],
        action: [
          '*Julian se desliza en silencio bajo la sombra del contrafuerte de piedra, guardando el plano bajo la solapa.* Buen movimiento. Las farolas proyectan sombras largas desde estas barandillas y las patrullas siempre reducen la marcha al cruzar el puente.',
          '*Te tiende una linterna pesada de agrimensor, cerrada hasta dejar solo una rendija ámbar.* Quédate detrás de mi hombro en cuanto pasemos la reja oxidada. Los peldaños del servicio no ven cemento desde la posguerra.',
        ],
        inspect: [
          '*Julian orienta el haz estrecho sobre el muro húmedo hasta que una placa de hierro hundida brilla entre la hiedra.* Mira esa marca topográfica: un triángulo invertido con una «M». No es alcantarillado; es el antiguo cruce neumático que juraron haber demolido.',
          '*Pasa el pulgar por una flecha reciente de tiza dibujada junto al desagüe.* Alguien bajó por esta rampa hace menos de dos horas. La tiza sigue seca bajo el alero.',
        ],
        general: [
          '*La lluvia golpea el toldo mientras Julian pliega el plano en tres partes exactas.* Eso cuadra con las escrituras desaparecidas del Archivo Portuario. Dime: ¿tu contacto mencionó si buscamos una cámara sellada o a alguien escondido dentro?',
          '*Julian observa los faros de un taxi barrer los adoquines mojados y perderse en la niebla.* Toda ciudad guarda dos mapas: el que compran los turistas y el que trazaron quienes levantaron los cimientos. ¿Qué puerta probamos esta noche?',
        ],
      },
      continues: [
        '*Desde la escalera bajo la rejilla sube una corriente tibia inconfundible y el chasquido lejano de un torno.* Espera. Alguien mantiene electricidad activa en el nivel menos dos.',
        '*Julian saca una ganzúa plana del bolsillo y sopesa el candado de la verja en la palma.* El candado es mucho más nuevo que la reja. Alguien quería evitar curiosos, no sellar el túnel.',
      ],
    },
  },
];

function buildCustomCharacterReply(params: DemoRoleplayParams, lang: 'en' | 'es'): string {
  const name = params.characterName.trim() || 'Companion';
  const role = params.characterTagline?.trim();
  const focus = extractUserFocusSnippet(params.userMessage);
  const intent = classifyUserIntent(params.userMessage);

  if (params.isContinue) {
    if (lang === 'es') {
      return `*${name} guarda un instante de silencio, dejando que la tensión del momento se asiente antes de dar un paso más cerca.* No hace falta decirlo todo de golpe. Si seguimos adelante desde aquí, cada detalle contará—¿qué decides hacer ahora?`;
    }
    return `*${name} pauses for a quiet beat, letting the stillness settle around the scene before leaning in slightly.* We don’t have to rush the next move. Everything from this moment forward changes the balance—what do you want to do next?`;
  }

  const roleClauseEn = role ? ` with the measured poise of ${role}` : '';
  const roleClauseEs = role ? ` con la presencia serena de ${role}` : '';
  const focusQuoteEn = focus ? ` about "${focus}"` : '';
  const focusQuoteEs = focus ? ` sobre «${focus}»` : '';

  if (lang === 'es') {
    const esTemplates: Record<IntentKind, string[]> = {
      greeting: [
        `*${name} alza la vista${roleClauseEs} y te dedica una media sonrisa serena.* Qué bueno verte aquí. Toma asiento y cuéntame qué historia quieres poner en marcha hoy.`,
        `*La luz ambiental dibuja un perfil nítido alrededor de ${name} mientras hace un gesto acogedor.* Bienvenido. Tómate tu tiempo; estoy escuchando cada palabra.`,
      ],
      question: [
        `*${name} inclina ligeramente la cabeza, sopesando tu pregunta${focusQuoteEs} antes de responder con calma.* La respuesta depende de cuánto estés dispuesto a arriesgar si abrimos esa puerta ahora mismo. Dime qué pista te hizo dudar.`,
        `*Una pausa breve cruza la mirada de ${name}${roleClauseEs}.* No todo es lo que parece a primera vista${focusQuoteEs}, pero vas en la dirección correcta. ¿Qué parte del rompecabezas quieres explorar primero?`,
      ],
      action: [
        `*${name} sigue tu movimiento con atención inmediata, ajustando su postura para responder al ritmo de la escena.* Me gusta cómo te mueves. Veamos adónde nos lleva ese gesto cuando el resto del entorno reaccione.`,
        `*Los ojos de ${name} captan el detalle al instante.* No esperaba esa jugada, pero encaja perfectamente con el momento. Sigue adelante—tienes toda mi atención.`,
      ],
      inspect: [
        `*${name} se acerca un poco más para examinar el detalle contigo${focusQuoteEs}.* Fíjate bien en los bordes—ahí está la señal que casi todo el mundo pasa por alto cuando tiene prisa.`,
        `*Con cuidado deliberado, ${name} ilumina el punto exacto que señalas.* Interesante… esa marca no estaba ahí hace un momento. ¿Lo notaste tú también?`,
      ],
      general: [
        `*${name} escucha en silencio${roleClauseEs}, asintiendo despacio ante lo que acabas de decir${focusQuoteEs}.* Tiene mucho sentido. Si seguimos por ese camino, la escena está a punto de ponerse mucho más interesante.`,
        `*${name} deja escapar una exhalación suave y sostiene tu mirada con atención.* Me alegra que lo hayas planteado así${focusQuoteEs}. Adelante: ¿cuál es nuestro siguiente paso?`,
      ],
    };
    const pool = esTemplates[intent];
    return pool[stablePickIndex(name + params.userMessage, pool.length)];
  }

  const enTemplates: Record<IntentKind, string[]> = {
    greeting: [
      `*${name} looks up${roleClauseEn}, offering a calm, attentive nod.* Good timing. Step into the scene and tell me where you want to take things tonight.`,
      `*Soft ambient light catches ${name}’s silhouette as they turn toward you.* Welcome in. Take a breath—I’m right here in the moment with you.`,
    ],
    question: [
      `*${name} tilts their head slightly, weighing your question${focusQuoteEn} before answering in a low, steady voice.* The truth depends on how far you’re willing to follow the thread. Tell me what first caught your attention.`,
      `*A quiet beat passes as ${name} considers the angle${roleClauseEn}.* Nothing around here stays simple for long${focusQuoteEn}, yet your instinct is sharp. Which piece do you want to test first?`,
    ],
    action: [
      `*${name} tracks the movement immediately, shifting closer to meet your pace.* Bold move. Let’s see how the rest of the scene answers now that you’ve tipped the balance.`,
      `*${name}’s gaze sharpens with quiet interest.* I didn’t expect you to play it quite like that—and I’m glad you did. Keep going.`,
    ],
    inspect: [
      `*${name} leans in beside you to study the detail${focusQuoteEn} closely.* Look right along the edge—that subtle trace is the clue most people walk straight past.`,
      `*Carefully, ${name} focuses on what you pointed out.* Wait a second… that wasn’t there earlier. Do you see what it connects to?`,
    ],
    general: [
      `*${name} listens closely${roleClauseEn}, nodding once as your words${focusQuoteEn} settle into the room.* That changes the texture of the whole moment. Tell me what happens next from your side.`,
      `*${name} lets out a quiet breath and meets your eyes.* I like where you’re taking this${focusQuoteEn}. Stay in character—your move.`,
    ],
  };
  const pool = enTemplates[intent];
  return pool[stablePickIndex(name + params.userMessage, pool.length)];
}

function buildFullResponseText(params: DemoRoleplayParams): string {
  const lang = detectReplyLanguage(params.userMessage, params.language ?? 'en');
  const nameLower = params.characterName.toLowerCase();
  const bank = CHARACTER_BANKS.find((entry) => entry.match(nameLower));

  if (!bank) {
    return buildCustomCharacterReply(params, lang);
  }

  const langBank = bank[lang];
  if (params.isContinue) {
    const idx = stablePickIndex(
      `${params.characterName}:${params.userMessage}:${Date.now()}`,
      langBank.continues.length
    );
    return langBank.continues[idx];
  }

  const intent = classifyUserIntent(params.userMessage);
  const pool = langBank.replies[intent];
  const idx = stablePickIndex(
    `${params.characterName}:${params.userMessage}`,
    pool.length
  );
  return pool[idx];
}

function splitIntoStreamingChunks(text: string): string[] {
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    // 2-4 character fragments for fluid optical streaming & live t/s counter
    const size = 2 + (cursor % 3);
    chunks.push(text.slice(cursor, cursor + size));
    cursor += size;
  }
  return chunks;
}

function waitWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }
  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function streamDemoRoleplayResponse(
  params: DemoRoleplayParams
): Promise<void> {
  if (params.signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const fullText = buildFullResponseText(params);
  const chunks = splitIntoStreamingChunks(fullText);

  // Brief realistic initial latency before first token
  await waitWithAbort(140, params.signal);

  for (const chunk of chunks) {
    if (params.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    params.onToken(chunk);
    await waitWithAbort(22, params.signal);
  }
}
