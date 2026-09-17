// @ts-nocheck
// Motor de geração de questões — 100% portado do protótipo em Artifact.
// Cada questão é calculada matematicamente em tempo real (sem banco fixo
// de 240 perguntas), com distratores baseados em erros reais de raciocínio.
// (ts-nocheck: motor numérico já validado por auditoria em massa no
// protótipo; tipagem completa de 20 templates não compensa o esforço
// agora — as funções exportadas no rodapé têm assinatura tipada.)

export interface QuestionOption {
  text: string;
  correct: boolean;
}
export interface Question {
  statement: string;
  options: QuestionOption[];
  explanation: string;
  difficulty: number;
  moduleId: number;
}

// ===================== HELPERS =====================
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randChoice(arr) { return arr[randInt(0, arr.length - 1)]; }
function round2(n) { return Math.round(n * 100) / 100; }
function roundUnit(n, unit) {
  // peças, caixas, pallets, dias inteiros -> arredonda pra cima quando fizer sentido "precisar produzir"
  if (['peças', 'caixas', 'pallets', 'unidades', 'ordens'].includes(unit)) return Math.round(n);
  return round2(n);
}
function fmtNum(n) {
  let r = Math.round(n * 100) / 100;
  if (Number.isInteger(r)) return r.toLocaleString('pt-BR');
  return r.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildOptions(correctVal, distractorVals, unit) {
  let vals = [correctVal, ...distractorVals].map(v => roundUnit(v, unit));
  for (let i = 1; i < vals.length; i++) {
    let tries = 0;
    while (vals.some((v, idx) => idx !== i && Math.abs(v - vals[i]) < (unit === 'dias' ? 0.05 : 0.5)) && tries < 25) {
      const bump = Math.max(1, Math.abs(correctVal) * 0.02) * (tries + 1);
      vals[i] = roundUnit(vals[i] + bump, unit);
      tries++;
    }
  }
  const texts = vals.map(v => `${fmtNum(v)}${unit ? ' ' + unit : ''}`.trim());
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.map(i => ({ text: texts[i], correct: i === 0 }));
}

function buildTextOptions(correctText, distractorTexts) {
  const texts = [correctText, ...distractorTexts];
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.map(i => ({ text: texts[i], correct: i === 0 }));
}

function makeQuestion({ statement, correctVal, distractorVals, unit, explanation, difficulty, moduleId }) {
  return { statement, options: buildOptions(correctVal, distractorVals, unit), explanation, difficulty, moduleId };
}
function makeConceptual({ statement, correctText, distractorTexts, explanation, difficulty, moduleId }) {
  return { statement, options: buildTextOptions(correctText, distractorTexts), explanation, difficulty, moduleId };
}

function auditQuestion(q) {
  const problems = [];
  const texts = q.options.map(o => o.text);
  if (new Set(texts).size !== 4) problems.push('opções duplicadas: ' + texts.join('|'));
  if (q.options.filter(o => o.correct).length !== 1) problems.push('não há exatamente 1 correta');
  const lens = texts.map(t => t.length);
  if (Math.max(...lens) - Math.min(...lens) > 10) problems.push('desequilíbrio de tamanho: ' + texts.join(' | '));
  return problems;
}

// ===================== MODULE TEMPLATES =====================
// Each entry: array of functions(difficulty) => question

const nomesMassa = ['massa cerâmica', 'barbotina', 'esmalte'];

const TEMPLATES = {
  1: [ // Fundamentos da proporção
    (d) => {
      const a = randInt(2, 5) * (d >= 3 ? randInt(2,4) : 1), b = randInt(2, 5) * (d >= 3 ? randInt(2,4) : 1);
      const k = randInt(2, 6) + (d >= 4 ? randInt(1,3) : 0);
      const A = a * k, B = b * k;
      const correct = B;
      return makeQuestion({
        moduleId: 1, difficulty: d,
        statement: `Em um lote de produção, a razão entre paletes de piso polido (A) e paletes de piso fosco (B) é de ${a} para ${b}. Se foram separados ${A} paletes de piso polido, mantendo essa mesma razão, quantos paletes de piso fosco existem?`,
        correctVal: correct,
        distractorVals: [round2(A - a), round2(A * b / a - 2), round2(B + b)],
        unit: 'paletes',
        explanation: `A razão ${a}:${b} significa que, para cada ${a} unidades de A, existem ${b} de B. Como A = ${A}, o fator multiplicador é ${A}/${a} = ${k}. Logo B = ${b} × ${k} = ${B} paletes.`
      });
    },
    (d) => {
      const total = randInt(20, 60) * (d >= 3 ? 10 : 5);
      const partesA = randInt(2, 5), partesB = randInt(2, 5);
      const unidade = round2(total / (partesA + partesB));
      const correct = round2(unidade * partesA);
      return makeQuestion({
        moduleId: 1, difficulty: d,
        statement: `Um lote de ${total} kg de massa cerâmica deve ser dividido entre dois silos na proporção ${partesA}:${partesB}. Quantos kg vão para o silo com a maior parte da proporção (${partesA})?`,
        correctVal: correct,
        distractorVals: [round2(total / 2), round2(unidade * partesB), round2(total - correct - unidade)],
        unit: 'kg',
        explanation: `Somando as partes: ${partesA} + ${partesB} = ${partesA + partesB} partes. Cada parte vale ${total} ÷ ${partesA + partesB} = ${unidade} kg. O silo com ${partesA} partes recebe ${unidade} × ${partesA} = ${correct} kg.`
      });
    }
  ],
  2: [ // Regra de três do zero (montagem A B C X)
    (d) => {
      const A = randInt(2, 6), B = randInt(10, 40) * (d >= 3 ? 2 : 1), C = A * randInt(2, 4);
      const correct = round2((B * C) / A);
      return makeQuestion({
        moduleId: 2, difficulty: d,
        statement: `Sabendo que ${A} máquinas produzem ${B} peças, e mantendo a mesma taxa por máquina, quantas peças ${C} máquinas produziriam? (identifique corretamente A, B, C e X antes de calcular)`,
        correctVal: correct,
        distractorVals: [round2(B + C), round2((A * C) / B), round2(B * C - A)],
        unit: 'peças',
        explanation: `Montando a tabela: A=${A} máquinas → B=${B} peças; C=${C} máquinas → X=?. Multiplicação cruzada: A × X = B × C → X = (${B} × ${C}) ÷ ${A} = ${correct} peças.`
      });
    },
    (d) => {
      const correctText = 'Multiplicar cruzado e dividir pelo valor restante';
      const distractorTexts = [
        'Somar os valores conhecidos e dividir por dois',
        'Multiplicar valores da mesma coluna sem cruzar',
        'Subtrair o menor valor do maior valor conhecido',
      ];
      return makeConceptual({
        moduleId: 2, difficulty: d,
        statement: `Depois de montar corretamente a tabela de regra de três simples com A, B, C e X, qual é o procedimento correto para encontrar X?`,
        correctText, distractorTexts,
        explanation: `Na regra de três simples, após montar a tabela corretamente, aplicamos a multiplicação cruzada: multiplicamos os dois valores que ficam "cruzados" com X e dividimos pelo valor que sobra na mesma linha de X.`
      });
    }
  ],
  3: [ // Diretamente proporcional
    (d) => {
      const taxa = randInt(15, 40) * 5;
      const hBase = randInt(2, 5), hNova = hBase + randInt(1, 3) + (d >= 4 ? randInt(2,4) : 0);
      const base = taxa * hBase, correct = taxa * hNova;
      return makeQuestion({
        moduleId: 3, difficulty: d,
        statement: `Uma esteira de esmaltação aplica esmalte em ${base} peças a cada ${hBase} horas, em ritmo constante. Quantas peças recebem esmalte em ${hNova} horas?`,
        correctVal: correct,
        distractorVals: [round2(base + (hNova - hBase) * taxa * 0.5), round2(base * hNova / (hBase + 1)), round2(base - taxa)],
        unit: 'peças',
        explanation: `Grandezas diretamente proporcionais: mais tempo, mais peças. Taxa = ${base} ÷ ${hBase} = ${taxa} peças/hora. Em ${hNova} horas: ${taxa} × ${hNova} = ${correct} peças.`
      });
    },
    (d) => {
      const m2porhora = randInt(20, 50) * 2;
      const horas = randInt(3, 8) + (d>=4?randInt(2,4):0);
      const correct = m2porhora * horas;
      return makeQuestion({
        moduleId: 3, difficulty: d,
        statement: `A linha de produção fabrica ${m2porhora} m² de piso por hora, em velocidade constante. Quantos m² são produzidos em um turno de ${horas} horas?`,
        correctVal: correct,
        distractorVals: [round2(correct - m2porhora), round2(m2porhora / horas), round2(correct + horas)],
        unit: 'm²',
        explanation: `Como a relação é direta (mais horas, mais m² produzidos), basta multiplicar: ${m2porhora} m²/hora × ${horas} horas = ${correct} m².`
      });
    }
  ],
  4: [ // Inversamente proporcional
    (d) => {
      const trab = randInt(3, 8), dias = randInt(6, 20) + (d>=4?randInt(4,8):0);
      const trabNovo = trab + randInt(1, 4);
      const correct = round2((trab * dias) / trabNovo);
      return makeQuestion({
        moduleId: 4, difficulty: d,
        statement: `${trab} operadores concluem uma ordem de produção em ${dias} dias, trabalhando no mesmo ritmo. Se a equipe fosse ampliada para ${trabNovo} operadores, em quantos dias a mesma ordem seria concluída?`,
        correctVal: correct,
        distractorVals: [round2((trabNovo * dias) / trab), round2(dias - (trabNovo - trab)), round2(dias / 2)],
        unit: 'dias',
        explanation: `Mais operadores concluem o trabalho em menos tempo: a relação é inversamente proporcional. Por isso multiplicamos cruzado sem inverter a posição: ${trab} × ${dias} = ${trabNovo} × X → X = (${trab} × ${dias}) ÷ ${trabNovo} = ${correct} dias.`
      });
    },
    (d) => {
      const veloc = randInt(4, 10), horas = randInt(8, 20) + (d>=4?randInt(4,8):0);
      const velocNova = veloc + randInt(1, 3);
      const correct = round2((veloc * horas) / velocNova);
      return makeQuestion({
        moduleId: 4, difficulty: d,
        statement: `Operando a ${veloc} m/min, o forno consome ${horas} horas para queimar um lote. Se a velocidade da esteira do forno aumentar para ${velocNova} m/min, quanto tempo levará para queimar o mesmo lote?`,
        correctVal: correct,
        distractorVals: [round2((velocNova * horas) / veloc), round2(horas - velocNova), round2(horas + veloc)],
        unit: 'horas',
        explanation: `Velocidade e tempo são inversamente proporcionais: quanto mais rápido, menos tempo. ${veloc} × ${horas} = ${velocNova} × X → X = ${correct} horas.`
      });
    }
  ],
  5: [ // Identificar direta x inversa
    (d) => {
      const cenarios = [
        { txt: 'Quanto mais horas uma linha funciona, mais m² de piso ela produz', resp: 'Diretamente proporcional' },
        { txt: 'Quanto mais operadores trabalham em uma ordem, menos dias são necessários para concluí-la', resp: 'Inversamente proporcional' },
        { txt: 'Quanto maior a velocidade da esteira do forno, menor o tempo de queima do lote', resp: 'Inversamente proporcional' },
        { txt: 'Quanto mais toneladas de massa entram na prensa, mais peças cruas são formadas', resp: 'Diretamente proporcional' },
      ];
      const c = randChoice(cenarios);
      const opts = ['Diretamente proporcional', 'Inversamente proporcional', 'Proporcionalidade constante', 'Sem relação proporcional'];
      return makeConceptual({
        moduleId: 5, difficulty: d,
        statement: `Situação de PCP: "${c.txt}". Como classificar a relação entre essas duas grandezas?`,
        correctText: c.resp,
        distractorTexts: opts.filter(o => o !== c.resp),
        explanation: `${c.resp === 'Diretamente proporcional' ? 'As duas grandezas crescem ou diminuem juntas' : 'Quando uma grandeza aumenta, a outra diminui na mesma proporção'} — por isso a relação é "${c.resp}".`
      });
    }
  ],
  6: [ // Unidades de medida
    (d) => {
      const kg = randInt(500, 3000) * (d>=3?10:1);
      const ton = round2(kg / 1000);
      return makeQuestion({
        moduleId: 6, difficulty: d,
        statement: `Um pedido de matéria-prima totaliza ${fmtNum(kg)} kg. Quantas toneladas isso representa? (1 tonelada = 1.000 kg)`,
        correctVal: ton, distractorVals: [round2(kg / 100), round2(kg * 1000), round2(kg / 10)], unit: 't',
        explanation: `Para converter kg em toneladas, dividimos por 1.000: ${fmtNum(kg)} ÷ 1.000 = ${ton} t.`
      });
    },
    (d) => {
      const min = randInt(30, 300) * (d>=3?2:1);
      const h = round2(min / 60);
      return makeQuestion({
        moduleId: 6, difficulty: d,
        statement: `Uma parada programada de manutenção durou ${min} minutos. Quantas horas isso representa? (1 hora = 60 minutos)`,
        correctVal: h, distractorVals: [round2(min / 100), round2(min * 60), round2(min / 30)], unit: 'horas',
        explanation: `Para converter minutos em horas, dividimos por 60: ${min} ÷ 60 = ${h} horas.`
      });
    }
  ],
  7: [ // Produção por tempo
    (d) => {
      const taxa = randInt(20, 60) * 5;
      const hB = randInt(2, 6), hN = hB + randInt(1, 3) + (d>=4?randInt(2,5):0);
      const base = taxa * hB, correct = taxa * hN;
      return makeQuestion({
        moduleId: 7, difficulty: d,
        statement: `Uma linha de prensagem produz ${base} peças em ${hB} horas, em ritmo constante. Quantas peças serão produzidas em ${hN} horas?`,
        correctVal: correct,
        distractorVals: [round2(base + (hN - hB) * taxa * 0.5), round2(taxa * hB * hN / (hB + 1)), round2(base - taxa)],
        unit: 'peças',
        explanation: `Taxa = ${base}/${hB} = ${taxa} peças/hora. Em ${hN} horas: ${taxa} × ${hN} = ${correct} peças.`
      });
    }
  ],
  8: [ // Tempo necessário
    (d) => {
      const taxa = randInt(10, 40) * 10;
      const meta = taxa * (randInt(3,8) + (d>=4?randInt(3,6):0));
      const correct = round2(meta / taxa);
      return makeQuestion({
        moduleId: 8, difficulty: d,
        statement: `A linha produz ${taxa} m² de piso por hora. Quanto tempo é necessário para produzir uma meta de ${fmtNum(meta)} m²?`,
        correctVal: correct,
        distractorVals: [round2(meta / (taxa*1.5)), round2(taxa / meta * 100), round2(correct + 2)],
        unit: 'horas',
        explanation: `Tempo = meta ÷ taxa de produção = ${fmtNum(meta)} ÷ ${taxa} = ${correct} horas.`
      });
    }
  ],
  9: [ // Massa e quantidade
    (d) => {
      const kgPorPeca = round2((randInt(15, 40) / 10));
      const qtd = randInt(200, 900) * (d>=3?2:1);
      const correct = round2(kgPorPeca * qtd);
      return makeQuestion({
        moduleId: 9, difficulty: d,
        statement: `Cada peça de piso consome ${fmtNum(kgPorPeca)} kg de massa cerâmica na prensagem. Quantos kg de massa são necessários para produzir ${fmtNum(qtd)} peças?`,
        correctVal: correct,
        distractorVals: [round2(qtd / kgPorPeca), round2(correct - qtd), round2(correct * 0.9)],
        unit: 'kg',
        explanation: `Consumo total = consumo por peça × quantidade de peças = ${fmtNum(kgPorPeca)} × ${fmtNum(qtd)} = ${fmtNum(correct)} kg.`
      });
    }
  ],
  10: [ // Área e produção de pisos
    (d) => {
      const pecasPorM2 = randChoice([4, 5, 6, 8]);
      const m2 = randInt(100, 500) * (d>=3?2:1);
      const correct = pecasPorM2 * m2;
      return makeQuestion({
        moduleId: 10, difficulty: d,
        statement: `Cada m² de piso é formado por ${pecasPorM2} peças (considerando o formato utilizado). Quantas peças são necessárias para revestir ${fmtNum(m2)} m²?`,
        correctVal: correct,
        distractorVals: [round2(m2 / pecasPorM2), round2(correct - pecasPorM2), round2(correct + m2)],
        unit: 'peças',
        explanation: `Peças totais = peças por m² × m² desejados = ${pecasPorM2} × ${fmtNum(m2)} = ${fmtNum(correct)} peças.`
      });
    }
  ],
  11: [ // Rendimento
    (d) => {
      const entradaKg = randInt(800, 3000) * (d>=3?2:1);
      const rendPct = randChoice([82, 85, 88, 90, 92]);
      const correct = round2(entradaKg * rendPct / 100);
      return makeQuestion({
        moduleId: 11, difficulty: d,
        statement: `Um lote de ${fmtNum(entradaKg)} kg de massa entra no processo de prensagem e secagem. O rendimento médio do processo é de ${rendPct}% (parte vira produto aproveitável). Quantos kg viram produto final aproveitável?`,
        correctVal: correct,
        distractorVals: [round2(entradaKg - correct), round2(entradaKg * (100-rendPct) / 100), round2(entradaKg / rendPct * 100)],
        unit: 'kg',
        explanation: `Produto aproveitável = massa de entrada × rendimento = ${fmtNum(entradaKg)} × ${rendPct}% = ${fmtNum(correct)} kg.`
      });
    }
  ],
  12: [ // Perdas e refugos
    (d) => {
      const desejado = randInt(400, 900) * 10 * (d>=3?1.5:1);
      const perdaPct = randChoice([5, 8, 10, 12, 15]);
      const necessario = round2(desejado / (1 - perdaPct / 100));
      return makeQuestion({
        moduleId: 12, difficulty: d,
        statement: `A fábrica precisa entregar ${fmtNum(desejado)} peças boas de piso. Historicamente, ${perdaPct}% da produção é perdida como refugo. Quantas peças a linha deve produzir para garantir a entrega?`,
        correctVal: necessario,
        distractorVals: [round2(desejado * (1 + perdaPct / 100)), round2(desejado / (1 + perdaPct / 100)), round2(desejado + desejado * perdaPct / 100 / 2)],
        unit: 'peças',
        explanation: `Se ${perdaPct}% é perdido, ${100 - perdaPct}% vira peça boa. Produção total × ${(100 - perdaPct) / 100} = ${fmtNum(desejado)} → Produção total = ${fmtNum(desejado)} ÷ ${(100 - perdaPct) / 100} = ${fmtNum(necessario)} peças.`
      });
    }
  ],
  13: [ // Consumo de matéria-prima
    (d) => {
      const consumoPorTon = randInt(950, 1050);
      const producaoTon = randInt(5, 30) + (d>=4?randInt(10,20):0);
      const correct = round2(consumoPorTon * producaoTon);
      return makeQuestion({
        moduleId: 13, difficulty: d,
        statement: `A produção de 1 tonelada de piso consome, em média, ${consumoPorTon} kg de matéria-prima (considerando perdas do processo). Quantos kg de matéria-prima são necessários para produzir ${producaoTon} toneladas de piso?`,
        correctVal: correct,
        distractorVals: [round2(producaoTon / consumoPorTon), round2(correct - consumoPorTon), round2(correct * 0.85)],
        unit: 'kg',
        explanation: `Consumo total = consumo por tonelada × toneladas produzidas = ${consumoPorTon} × ${producaoTon} = ${fmtNum(correct)} kg.`
      });
    }
  ],
  14: [ // Capacidade produtiva
    (d) => {
      const capNominal = randInt(500, 1200) * 10;
      const eficPct = randChoice([70, 75, 80, 85, 90]);
      const correct = round2(capNominal * eficPct / 100);
      return makeQuestion({
        moduleId: 14, difficulty: d,
        statement: `A capacidade nominal de uma linha é de ${fmtNum(capNominal)} m²/dia. Devido a paradas e ajustes, a eficiência real (OEE simplificado) é de ${eficPct}%. Qual é a produção real esperada por dia?`,
        correctVal: correct,
        distractorVals: [round2(capNominal - correct), round2(capNominal * (100-eficPct) / 100), round2(capNominal / eficPct * 100)],
        unit: 'm²',
        explanation: `Produção real = capacidade nominal × eficiência = ${fmtNum(capNominal)} × ${eficPct}% = ${fmtNum(correct)} m²/dia.`
      });
    }
  ],
  15: [ // Turnos e programação
    (d) => {
      const porTurno = randInt(150, 400) * 5;
      const turnos = randChoice([2, 3]);
      const dias = d >= 4 ? randInt(3, 6) : 1;
      const correct = porTurno * turnos * dias;
      return makeQuestion({
        moduleId: 15, difficulty: d,
        statement: `Cada turno produz ${fmtNum(porTurno)} peças. A fábrica opera ${turnos} turnos por dia${dias > 1 ? `, durante ${dias} dias` : ''}. Qual é a produção total ${dias > 1 ? 'no período' : 'no dia'}?`,
        correctVal: correct,
        distractorVals: [round2(porTurno * turnos), round2(correct - porTurno), round2(correct + porTurno * dias)].filter((v,i,a)=>true),
        unit: 'peças',
        explanation: `Produção total = produção por turno × número de turnos${dias>1?' × dias':''} = ${fmtNum(porTurno)} × ${turnos}${dias>1?` × ${dias}`:''} = ${fmtNum(correct)} peças.`
      });
    }
  ],
  16: [ // Estoque e cobertura
    (d) => {
      const estoque = randInt(20, 80) * 100 * (d>=3?2:1);
      const consumo = randInt(3, 12) * 100;
      const dias = round2(estoque / consumo);
      return makeQuestion({
        moduleId: 16, difficulty: d,
        statement: `O estoque atual de esmalte é de ${fmtNum(estoque)} kg. O consumo médio diário da linha é de ${fmtNum(consumo)} kg. Quantos dias de produção esse estoque cobre, mantendo o consumo constante?`,
        correctVal: dias,
        distractorVals: [round2(consumo / estoque), round2(estoque * consumo / 1000), round2(dias + 1)],
        unit: 'dias',
        explanation: `Cobertura = estoque ÷ consumo diário = ${fmtNum(estoque)} ÷ ${fmtNum(consumo)} = ${dias} dias.`
      });
    }
  ],
  17: [ // PCP aplicado — realizado x planejado
    (d) => {
      const planejado = randInt(500, 1500) * 10;
      const percRealizado = randChoice([88, 90, 93, 95, 97]);
      const correct = round2(planejado * percRealizado / 100);
      return makeQuestion({
        moduleId: 17, difficulty: d,
        statement: `Uma ordem de produção planejava ${fmtNum(planejado)} m². Ao final do período, a linha atingiu ${percRealizado}% do planejado. Quantos m² foram efetivamente produzidos?`,
        correctVal: correct,
        distractorVals: [round2(planejado - correct), round2(planejado * (100-percRealizado)/100), round2(planejado / percRealizado * 100)],
        unit: 'm²',
        explanation: `Realizado = planejado × percentual atingido = ${fmtNum(planejado)} × ${percRealizado}% = ${fmtNum(correct)} m².`
      });
    }
  ],
  18: [ // Intermediários — dois passos (produção + perda)
    (d) => {
      const taxa = randInt(20,50)*5, horas = randInt(4,8)+(d>=4?randInt(2,4):0);
      const bruto = taxa*horas;
      const perdaPct = randChoice([5,8,10]);
      const correct = round2(bruto * (1 - perdaPct/100));
      return makeQuestion({
        moduleId: 18, difficulty: d,
        statement: `Uma linha produz ${taxa} peças/hora e opera por ${horas} horas. Do total produzido, ${perdaPct}% é refugado na classificação. Quantas peças boas restam ao final?`,
        correctVal: correct,
        distractorVals: [round2(bruto), round2(bruto*(1+perdaPct/100)), round2(bruto - perdaPct*10)],
        unit: 'peças',
        explanation: `Passo 1: produção bruta = ${taxa} × ${horas} = ${bruto} peças. Passo 2: peças boas = bruto × (1 − ${perdaPct}%) = ${bruto} × ${(100-perdaPct)/100} = ${fmtNum(correct)} peças.`
      });
    }
  ],
  19: [ // Avançados — três passos (produção + conversão + perda)
    (d) => {
      const pecasPorM2 = randChoice([5,6,8]);
      const taxaM2h = randInt(15,35)*2;
      const horas = randInt(4,8)+(d>=4?randInt(2,5):0);
      const perdaPct = randChoice([6,9,12]);
      const m2bruto = taxaM2h*horas;
      const pecasBruto = m2bruto*pecasPorM2;
      const correct = round2(pecasBruto*(1-perdaPct/100));
      return makeQuestion({
        moduleId: 19, difficulty: d,
        statement: `Uma linha produz ${taxaM2h} m²/hora e opera ${horas} horas. Cada m² equivale a ${pecasPorM2} peças. Da produção total em peças, ${perdaPct}% é perdida como refugo. Quantas peças boas restam?`,
        correctVal: correct,
        distractorVals: [round2(pecasBruto), round2(m2bruto*(1-perdaPct/100)), round2(pecasBruto*(1+perdaPct/100))],
        unit: 'peças',
        explanation: `Passo 1: m² totais = ${taxaM2h} × ${horas} = ${m2bruto} m². Passo 2: peças brutas = ${m2bruto} × ${pecasPorM2} = ${pecasBruto} peças. Passo 3: peças boas = ${pecasBruto} × (1 − ${perdaPct}%) = ${fmtNum(correct)} peças.`
      });
    }
  ],
  20: [ // Desafio final — quatro passos (capacidade + turnos + conversão + estoque)
    (d) => {
      const capNominal = randInt(400,900)*5;
      const efic = randChoice([75,80,85,90]);
      const turnos = randChoice([2,3]);
      const consumoDiarioMP = randInt(300,900)*5;
      const producaoDia = round2(capNominal*efic/100);
      const producaoTotalTurnos = round2(producaoDia*turnos);
      const dummy = producaoTotalTurnos; // m2/dia already accounts turnos in this simplified chain
      const estoqueMP = randInt(30,90)*1000;
      const diasCobertura = round2(estoqueMP/consumoDiarioMP);
      const correct = diasCobertura;
      return makeQuestion({
        moduleId: 20, difficulty: d,
        statement: `A fábrica tem capacidade nominal de ${fmtNum(capNominal)} m²/turno e eficiência real de ${efic}%, operando ${turnos} turnos/dia. O consumo de matéria-prima é de ${fmtNum(consumoDiarioMP)} kg/dia e o estoque atual é de ${fmtNum(estoqueMP)} kg. Quantos dias de produção o estoque de matéria-prima cobre?`,
        correctVal: correct,
        distractorVals: [round2(estoqueMP/consumoDiarioMP*efic/100), round2(consumoDiarioMP/estoqueMP), round2(correct+2)],
        unit: 'dias',
        explanation: `A cobertura de estoque depende apenas do consumo diário de matéria-prima, não da produção em m² (que seria usada para outra pergunta, como atendimento de demanda). Cobertura = estoque ÷ consumo diário = ${fmtNum(estoqueMP)} ÷ ${fmtNum(consumoDiarioMP)} = ${correct} dias. (Dado de capacidade e eficiência é informação extra, comum em problemas reais de PCP — parte do desafio é identificar quais dados realmente importam.)`
      });
    }
  ],
};



export function generateExam(moduleId: number): Question[] {
  const templates = (TEMPLATES as Record<number, ((d: number) => Question)[]>)[moduleId];
  const diffMap = [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5];
  const questions: Question[] = [];
  const seen = new Set<string>();
  diffMap.forEach((d) => {
    let q: Question, tries = 0;
    do {
      const tpl = randChoice(templates);
      q = tpl(d);
      tries++;
    } while (seen.has(q.statement) && tries < 8);
    seen.add(q.statement);
    questions.push(q);
  });
  return questions;
}

export function auditQuestionExport(q: Question) { return auditQuestion(q); }
