# 🎤 Comando: Melhor Data para Saída

## 📋 Descrição

Comando de voz que **analisa os próximos 7 dias** e sugere a melhor data para agendar uma saída administrativa, baseado no sistema de cores (verde, laranja, vermelho).

## 🗣️ Comandos Disponíveis

### Para Saídas pela Manhã (00:00 - 11:59):
```
"Melhor data para saída pela manhã"
"Melhor dia pela manhã"
"Melhor data manhã"
```

### Para Saídas pela Tarde (12:00 - 23:59):
```
"Melhor data para saída pela tarde"
"Melhor dia pela tarde"
"Melhor data tarde"
```

## 🎯 Como Funciona

### 1. **Análise dos Próximos 7 Dias**
O sistema analisa cada um dos próximos 7 dias e:
- Conta quantas saídas já estão agendadas para aquele período
- Classifica o dia em: 🟢 Verde, 🟠 Laranja ou 🔴 Vermelho
- Usa os mesmos limites configurados na aba Saídas Administrativas

### 2. **Prioridade de Seleção**
O sistema escolhe o melhor dia seguindo esta ordem:

1. **🟢 Prioridade 1: Dias Verdes**
   - Dias com disponibilidade normal
   - Número de saídas ≤ limite verde

2. **🟠 Prioridade 2: Dias Laranjas**
   - Se não houver dias verdes
   - Dias com demanda moderada
   - Número de saídas ≤ limite laranja

3. **🔴 Prioridade 3: Dias Vermelhos**
   - Se não houver verdes nem laranjas
   - Escolhe o dia vermelho com **menos saídas**

### 3. **Resposta do Sistema**

**Sistema fala:**
```
"Melhor data para saída pela manhã: 
 Quarta-feira, dia 23/10/2024. 
 Status: disponibilidade normal. 
 2 saídas previstas."
```

**Balão de status mostra:**
```
🟢 23/10/2024 (Quarta-feira)
```

## 📊 Exemplo de Análise

### Cenário: Procurando melhor dia para saída pela manhã

**Limites configurados:**
- 🟢 Verde: até 1 saída
- 🟠 Laranja: até 2 saídas
- 🔴 Vermelho: 3+ saídas

**Análise dos próximos 7 dias:**

| Data | Dia da Semana | Saídas Manhã | Status | Escolhido? |
|------|---------------|--------------|--------|------------|
| 22/10 | Terça | 3 | 🔴 Vermelho | ❌ |
| 23/10 | Quarta | 1 | 🟢 Verde | ✅ **SIM** |
| 24/10 | Quinta | 2 | 🟠 Laranja | ❌ |
| 25/10 | Sexta | 4 | 🔴 Vermelho | ❌ |
| 26/10 | Sábado | 0 | 🟢 Verde | ❌ |
| 27/10 | Domingo | 0 | 🟢 Verde | ❌ |
| 28/10 | Segunda | 2 | 🟠 Laranja | ❌ |

**Resultado:** Dia 23/10 (Quarta-feira) - Primeiro dia verde encontrado

## 🎨 Lógica de Cores

### Limites Padrão:

**Manhã (00:00 - 11:59):**
- 🟢 Verde: 0-1 saídas
- 🟠 Laranja: 2 saídas
- 🔴 Vermelho: 3+ saídas

**Tarde (12:00 - 23:59):**
- 🟢 Verde: 0-1 saídas
- 🟠 Laranja: 2 saídas
- 🔴 Vermelho: 3+ saídas

*Esses limites podem ser configurados na aba Saídas Administrativas*

## 📝 Logs no Console

Ao executar o comando, você verá:

```javascript
🔍 Buscando melhor data para saída no período: manha

📊 Análise dos próximos 7 dias: [
  {
    date: '2024-10-22',
    count: 3,
    status: 'red',
    dayOfWeek: 'terça-feira'
  },
  {
    date: '2024-10-23',
    count: 1,
    status: 'green',
    dayOfWeek: 'quarta-feira'
  },
  ...
]

✅ Melhor dia encontrado: {
  data: '23/10/2024',
  diaSemana: 'quarta-feira',
  periodo: 'manhã',
  saidas: 1,
  status: 'green',
  statusMsg: 'disponibilidade normal'
}
```

## 🧪 Casos de Uso

### Caso 1: Planejamento de Saída
**Situação:** Precisa agendar uma saída administrativa
**Comando:** "Melhor data para saída pela manhã"
**Resultado:** Sistema sugere o dia com menor demanda

### Caso 2: Todos os Dias Vermelhos
**Situação:** Semana muito movimentada
**Comando:** "Melhor data para saída pela tarde"
**Resultado:** Sistema sugere o dia vermelho com menos saídas

### Caso 3: Comparar Períodos
**Situação:** Flexibilidade de horário
**Ação:** 
1. "Melhor data para saída pela manhã"
2. "Melhor data para saída pela tarde"
**Resultado:** Compara qual período tem melhor disponibilidade

## ⚙️ Configuração

### Ajustar Limites de Cores:

1. Vá em **Saídas Administrativas**
2. Clique no **indicador de status** (bolinhas coloridas)
3. Configure os limites:
   - Limite Verde (Normal)
   - Limite Laranja (Atenção)
   - Acima do Laranja = Vermelho (Crítico)
4. Salve as configurações

O comando usará automaticamente os novos limites!

## 🎯 Dicas de Uso

### ✅ Boas Práticas:

1. **Use no início da semana** para planejar saídas
2. **Compare manhã e tarde** para flexibilidade
3. **Considere o dia da semana** sugerido
4. **Verifique o número de saídas** previstas

### 💡 Dicas:

- Se o sistema sugerir um dia laranja/vermelho, considere **reagendar** se possível
- Use em conjunto com "Número de saídas do dia" para ver detalhes
- Dias de fim de semana geralmente têm menos saídas

## 🔍 Troubleshooting

### Sistema sempre sugere hoje?
- Verifique se há saídas cadastradas nos próximos dias
- Pode ser que hoje seja realmente o melhor dia

### Sugestão não faz sentido?
- Verifique os limites configurados
- Abra o console (F12) para ver a análise completa
- Confirme que as saídas estão com horários corretos

### Comando não é reconhecido?
- Fale claramente: "Melhor data para saída pela manhã"
- Ou simplesmente: "Melhor dia manhã"
- Verifique se o controle de voz está ativo

## 📊 Estatísticas Úteis

Combine com outros comandos:

```
1. "Melhor data para saída pela manhã"
   → Resposta: "23/10/2024"

2. "Número de saídas do dia 23/10"
   → Vê detalhes: Manhã: 1, Tarde: 3

3. Decisão: Agendar para manhã do dia 23/10!
```

## 🚀 Recursos Futuros (Sugestões)

- [ ] Sugerir múltiplas opções (top 3 melhores dias)
- [ ] Considerar feriados e fins de semana
- [ ] Filtrar por setor específico
- [ ] Alertar se todos os dias estão críticos
- [ ] Sugerir horário específico dentro do período
- [ ] Integrar com calendário

---

**Desenvolvido para SOT5 - Sistema de Organização de Transporte**
