# Integração do Serviço de Junção Inteligente de Saídas

## Como usar o serviço de junção automática

O serviço `junta-saidas-service.js` detecta automaticamente quando saídas podem ser juntadas baseado em:
- Mesmo motorista e viatura
- Proximidade geográfica (até 10 km)
- Mesma cidade

## Passo 1: Incluir o script

Adicione o script antes do fechamento do `</body>` ou no `<head>`:

```html
<script src="junta-saidas-service.js"></script>
```

## Passo 2: Integrar no formulário de cadastro de saídas

### Exemplo para Saídas Administrativas:

```javascript
// No formulário de cadastro de saída administrativa
document.getElementById('btnSalvar').addEventListener('click', async function() {
    // ... código existente para coletar dados do formulário ...
    
    const novaSaida = {
        motorista_id: document.getElementById('motorista').value,
        viatura_id: document.getElementById('viatura').value,
        cidade: document.getElementById('cidade').value,
        bairro: document.getElementById('bairro').value,
        horario: document.getElementById('horario').value,
        motivo: document.getElementById('motivo').value,
        // ... outros campos ...
    };
    
    // ANTES de salvar, verificar se há saídas para juntar
    try {
        // Buscar todas as saídas existentes
        const todasSaidas = await dataService.getSaidasAdministrativas();
        
                // Verificar se há possibilidade de junção
                // Agora verifica todas as saídas independente de motorista/viatura
                const resultado = await juntaSaidasService.verificarAposCadastro(
                    novaSaida,
                    todasSaidas
                    // Não precisa mais passar motorista_id e viatura_id
                );
        
        if (resultado.aceitar && resultado.sugestao) {
            // Usuário aceitou juntar as saídas
            const saidaJunta = juntaSaidasService.juntarSaidas(
                resultado.sugestao.saida1,
                resultado.sugestao.saida2
            );
            
            // Salvar a saída juntada
            await dataService.saveSaidaAdministrativa(saidaJunta);
            
            // Remover as saídas originais (se necessário)
            // await dataService.deleteSaidaAdministrativa(saida1.id);
            // await dataService.deleteSaidaAdministrativa(saida2.id);
            
            alert('Saídas juntadas com sucesso!');
        } else {
            // Salvar normalmente a nova saída
            await dataService.saveSaidaAdministrativa(novaSaida);
        }
    } catch (error) {
        console.error('Erro ao verificar junção:', error);
        // Salvar normalmente mesmo se houver erro na verificação
        await dataService.saveSaidaAdministrativa(novaSaida);
    }
});
```

### Exemplo para Saídas de Ambulâncias:

```javascript
// Similar ao exemplo acima, mas usando getSaidasAmbulancias()
const todasSaidas = await dataService.getSaidasAmbulancias();
```

## Passo 3: Verificar manualmente ao carregar lista de saídas

Você também pode verificar todas as saídas existentes e sugerir junções:

```javascript
async function verificarTodasSaidas() {
    const todasSaidas = await dataService.getSaidasAdministrativas();
    
    // Agrupar por motorista e viatura
    const grupos = {};
    todasSaidas.forEach(saida => {
        const key = `${saida.motorista_id}_${saida.viatura_id}`;
        if (!grupos[key]) grupos[key] = [];
        grupos[key].push(saida);
    });
    
                // Verificar todas as saídas (sem filtro de motorista/viatura)
                // Agora o serviço verifica apenas por proximidade geográfica
                const sugestoes = await juntaSaidasService.verificarJuntasPossiveis(
                    todasSaidas,
                    null, // Sem filtro de motorista
                    null  // Sem filtro de viatura
                );
        
                if (sugestoes.length > 0) {
                    // Mostrar notificação ou lista de sugestões
                    console.log(`Encontradas ${sugestoes.length} sugestões de junção`);
                    
                    // Mostrar modal para cada sugestão
                    for (const sugestao of sugestoes) {
                const aceitar = await juntaSaidasService.exibirModalJuntar(sugestao);
                if (aceitar) {
                    const saidaJunta = juntaSaidasService.juntarSaidas(
                        sugestao.saida1,
                        sugestao.saida2
                    );
                    await dataService.saveSaidaAdministrativa(saidaJunta);
                }
            }
        }
    }
}
```

## Passo 4: Customizar distância máxima

Se quiser alterar a distância máxima para consideração de proximidade:

```javascript
juntaSaidasService.distanciaMaxima = 15; // 15 km em vez de 10 km
```

## Estrutura de Dados Esperada

O serviço espera que as saídas tenham os seguintes campos:

```javascript
{
    id: number,                    // ID único da saída
    motorista_id: number,          // ID do motorista
    viatura_id: number,            // ID da viatura
    cidade: string,                // Nome da cidade (ex: "Rio de Janeiro")
    bairro: string,                // Nome do bairro (ex: "Saúde", "Centro")
    // OU
    endereco_cidade: string,       // Alternativa para cidade
    endereco_bairro: string,       // Alternativa para bairro
    horario: string,               // Horário no formato "HH:mm"
    // OU
    hora: number,                  // Hora (0-23)
    minuto: number,                // Minuto (0-59)
    motivo: string,                // Motivo da saída
    observacao: string             // Observações adicionais
}
```

## Funcionalidades do Serviço

1. **Detecção Automática**: Verifica automaticamente se destinos estão próximos
2. **Sem Restrição de Motorista/Viatura**: Agora verifica apenas por proximidade geográfica
3. **Detecção de Dias Próximos**: Detecta saídas do mesmo dia ou dia seguinte para o mesmo local
4. **Mesmo Caminho**: Detecta saídas que estão no mesmo caminho considerando origem fixa (Lins de Vasconcelos, RJ)
5. **Cálculo de Distância**: Usa coordenadas geográficas para calcular distância real
6. **Fallback para Nomes**: Se não encontrar coordenadas, compara similaridade de nomes
7. **Modal Interativo**: Exibe modal bonito e informativo para o usuário decidir
8. **Geocoding**: Busca coordenadas via OpenStreetMap se bairro não estiver no cache
9. **Cache Inteligente**: Armazena coordenadas para consultas futuras mais rápidas

## Critérios de Sugestão

O serviço sugere junção quando:

1. **Mesmo Endereço Exato**: Mesmo bairro e cidade em dias próximos
2. **Destinos Próximos (até 10km)**: Mesmo dia ou dia seguinte
3. **Mesmo Caminho (até 20km)**: Destinos no mesmo trajeto a partir da origem fixa
4. **Destinos Muito Próximos (até 5km)**: Mesmo com dias diferentes
5. **Dias Próximos**: Saída do dia seguinte para local próximo ou igual

**Importante**: Todas as viaturas partem de **Lins de Vasconcelos, Rio de Janeiro**

## Bairros Pré-Cadastrados

O serviço já possui coordenadas de mais de 150 bairros do Rio de Janeiro. Para outras cidades, o serviço tentará buscar coordenadas via API de geocoding.

## Notas Importantes

- O serviço funciona mesmo com horários diferentes
- Considera apenas saídas com mesmo motorista e viatura
- Requer campos de cidade e bairro preenchidos
- Funciona offline para bairros já cadastrados no cache
- Para bairros novos, requer conexão com internet para geocoding

