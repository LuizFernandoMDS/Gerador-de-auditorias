let parsedGlobalData = null;

function parseInputText(text) {
    let data = {
        cliente: "Não informado",
        primeiro_nome_cliente: "Cliente",
        cnpj: "Não informado",
        cnpj_digitos: "00",
        responsavel: "Não informado",
        qualificacao: "Gestor",
        cpf: "Não informado",
        cpf_digitos: "00",
        contato: "Não informado",
        email: "Não informado",
        cep: "Não informado",
        endereco: "Não informado",
        obs_endereco: "",
        produtos: [],
        valor_total: "Não informado",
        data_venda: new Date().toLocaleDateString('pt-BR')
    };

    try {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);

        lines.forEach((line, index) => {
            let m;
            const lower = line.toLowerCase();
            const digitsOnly = line.replace(/[^\d]/g, '');

            // 1. Rótulos Explícitos
            if (m = line.match(/(?:Cliente|Raz[ãa]o Social|Empresa):\s*(.*)/i)) {
                data.cliente = m[1].trim();
            }
            if (m = line.match(/(?:Respons[aá]vel|Nome):\s*(.*)/i)) {
                data.responsavel = m[1].trim();
            }
            if (m = line.match(/Qualifica[çc][ãa]o:\s*(.*)/i)) {
                data.qualificacao = m[1].trim();
            }
            if (m = line.match(/(?:Contato|Telefone|Celular|WhatsApp):\s*(.*)/i)) {
                data.contato = m[1].trim();
            }
            if (m = line.match(/(?:E-mail|Email):\s*(.*)/i)) {
                data.email = m[1].trim();
            }
            if (m = line.match(/CEP:\s*([\d\-]+)/i)) {
                data.cep = m[1].trim();
            }
            if (m = line.match(/(?:Rua|Endere[çc]o|Logradouro|Av\.|Avenida):\s*(.*)/i)) {
                data.endereco = line.trim();
            }
            if (m = line.match(/(?:Obs|Observa[çc][ãa]o):\s*(.*)/i)) {
                data.obs_endereco = m[1].trim();
            }
            if (m = line.match(/Valor total.*:\s*(.*)/i)) {
                data.valor_total = m[1].trim();
            }

            // 2. Valores / Mensalidades implícitas
            if (line.match(/(?:R\$)?\s*\d+[\.,]\d{2}\s*(?:\/m[êe]s|mensal)?/i) && (lower.includes('mês') || lower.includes('mes') || lower.includes('r$'))) {
                const matchVal = line.match(/(?:R\$)?\s*(\d+[\.,]\d{2})/);
                if (matchVal) {
                    data.valor_total = "R$ " + matchVal[1];
                }
            }

            // 3. CNPJ (14 dígitos)
            if (line.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/) || (digitsOnly.length === 14 && !lower.includes('@'))) {
                data.cnpj = line.trim();
                data.cnpj_digitos = digitsOnly.slice(-2);
            }

            // 4. CPF (11 dígitos)
            const isExplicitCPF = lower.includes('cpf') || line.includes('.') || line.includes('-');
            if (line.match(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/) || (digitsOnly.length === 11 && !lower.includes('@') && !lower.includes('cep') && (isExplicitCPF || !line.match(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/)))) {
                if (data.cpf === "Não informado") {
                    data.cpf = line.trim();
                    data.cpf_digitos = digitsOnly.slice(-2);
                }
            }

            // 5. Contato / Telefone
            if (line.match(/^(\+?55\s?)?\(?\d{2}\)?\s?\d{4,5}-?\d{4}/) || (digitsOnly.length >= 10 && digitsOnly.length <= 13 && digitsOnly.length !== 11 && digitsOnly.length !== 14 && !lower.includes('@') && !lower.includes('cep'))) {
                if (data.contato === "Não informado") {
                    data.contato = line.trim();
                }
            }

            // 6. Dicionário Nacional de Logradouros para Captura Automática (Mantém a linha inteira)
            if (data.endereco === "Não informado") {
                const logradourosNacionais = [
                    'rua', 'r.', 'av.', 'avenida', 'alameda', 'al.', 'qd.', 'qd', 'quadra', 
                    'lt.', 'lt', 'lote', 'setor', 'st.', 'st', 'travessa', 'tv.', 'rodovia', 
                    'rod.', 'estrada', 'est.', 'conjunto', 'cj.', 'praça', 'pc.'
                ];
                
                const contemLogradouro = logradourosNacionais.some(termo => {
                    const regex = new RegExp(`(^|\\s)${termo}(\\s|$)`, 'i');
                    return regex.test(lower);
                });

                if (contemLogradouro && !lower.includes('@') && !lower.includes('e-mail') && !lower.includes('responsável')) {
                    data.endereco = line.trim();
                }
            }

            // 7. Produtos / Serviços
            if (['portabilidade', 'banda-larga', 'banda larga', 'fibra', 'linha', 'gb', 'mb', 'plano', 'migração', 'wifi', '700mb', '25gb'].some(kw => lower.includes(kw))) {
                if (!lower.startsWith('produtos') && !lower.startsWith('dados')) {
                    data.produtos.push(line.replace(/^[-*•]\s*/, '').trim());
                }
            }

            // 8. Fallback para Responsável/Cliente na primeira linha
            if (index === 0 && data.responsavel === "Não informado" && digitsOnly.length < 10) {
                data.responsavel = line.trim();
                if (data.cliente === "Não informado") {
                    data.cliente = line.trim() + " LTDA";
                }
            }
        });

        if (data.endereco === "Não informado" && data.cep !== "Não informado") {
            const cepIndex = lines.findIndex(l => l.includes(data.cep));
            if (cepIndex > 0) {
                const linhaCandidata = lines[cepIndex - 1];
                const digitsCandidata = linhaCandidata.replace(/[^\d]/g, '');
                if (digitsCandidata.length < 8 && !linhaCandidata.toLowerCase().includes('responsável')) {
                    data.endereco = linhaCandidata;
                }
            }
        }

        if (data.cliente !== "Não informado") {
            const palavras = data.cliente.replace(/[^\w\s]/gi, '').trim().split(/\s+/);
            if (palavras.length > 0 && palavras[0]) {
                data.primeiro_nome_cliente = palavras[0];
            }
        }

        if (data.produtos.length === 0) {
            data.produtos.push("Planos e Serviços Corporativos conforme solicitação.");
        }
    } catch (err) {
        console.error("Erro ao analisar dados:", err);
    }

    return data;
}

function processData() {
    const inputElement = document.getElementById('rawInput');
    if (!inputElement) {
        alert("Campo de entrada não encontrado.");
        return;
    }

    const rawText = inputElement.value.trim();
    if (!rawText) {
        alert("Por favor, cole os dados do cliente na caixa de texto.");
        return;
    }

    const data = parseInputText(rawText);
    parsedGlobalData = data;

    let html = `
        <div class="border-b border-slate-200 pb-3 mb-3 pdf-block">
            <h3 class="font-bold text-slate-900 text-sm tracking-tight">SCRIPT DE AUDITORIA E CONFIRMAÇÃO DE PEDIDO</h3>
            <p class="text-[11px] text-slate-500">DCK Base • Automação de Auditoria Corporativa</p>
        </div>

        <div class="space-y-4 text-slate-700 text-xs leading-relaxed">
            <div class="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs pdf-block">
                <span class="font-bold text-blue-600 block mb-1">1. Saudação e Apresentação</span>
                <p class="italic bg-slate-50 p-2.5 rounded-lg border-l-3 border-blue-600">
                    "Bom dia/boa tarde, meu nome é <strong>Luiz Fernando</strong>, falo da MS Connect, parceiro Vivo Empresas. Tudo bem? Falo com o Sr(a). <strong>${data.responsavel}</strong>?"<br><br>
                    "O motivo do meu contato é para fazer a confirmação da sua compra realizada com operadora VIVO no dia <strong>${data.data_venda}</strong> pela empresa <strong>${data.cliente}</strong>. Podemos prosseguir com a confirmação?"<br><br>
                    <span class="text-red-600 font-semibold">⚠️ AVISO DE GRAVAÇÃO:</span> "Informo que por medida de segurança essa ligação é gravada, e estará disponível caso queira."
                </p>
            </div>

            <div class="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs pdf-block">
                <span class="font-bold text-blue-600 block mb-1">2. Detalhes dos Planos e Contrato</span>
                <p class="mb-1">O plano contratado possui os seguintes benefícios:</p>
                <ul class="list-disc list-inside space-y-1 mb-2 font-medium text-slate-800">
                    ${data.produtos.map(p => `<li>${p}</li>`).join('')}
                </ul>
                <p>• <strong>Valor da Mensalidade:</strong> ${data.valor_total} (primeira parcela cobrada de forma proporcional).</p>
                <p>• <strong>Validade do Contrato (Fidelidade):</strong> 24 meses.</p>
            </div>

            <div class="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs pdf-block">
                <span class="font-bold text-blue-600 block mb-1">3. Endereço e Internet Ativa Prévia</span>
                <p class="mb-1"><strong>Endereço de Instalação:</strong> ${data.endereco} ${data.obs_endereco ? `(${data.obs_endereco})` : ''} - CEP: ${data.cep}</p>
                <p class="italic bg-slate-50 p-2.5 rounded-lg border-l-3 border-blue-600 mt-2">
                    "Nesse endereço já possui internet ativa da VIVO vinculado ao seu CNPJ ou no CPF seu ou dos sócios? Se sim, o Sr(a). vai realizar o cancelamento ou permanecer com as duas?"
                </p>
            </div>

            <div class="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs pdf-block">
                <span class="font-bold text-blue-600 block mb-1">4. Validação de Representação e Documentos</span>
                <p class="mb-2">"O Senhor(a) é representante legal da empresa? Caso não, qual é sua função?" <em>(O aceite de voz/digital é exclusivo do representante legal).</em></p>
                <div class="grid grid-cols-2 gap-2 mb-2 bg-slate-50 p-2.5 rounded-lg">
                    <div><strong>Nome:</strong> ${data.responsavel}</div>
                    <div><strong>Contato:</strong> ${data.contato}</div>
                    <div><strong>CNPJ:</strong> ${data.cnpj} <span class="bg-blue-100 text-blue-900 font-bold px-1.5 py-0.5 rounded">Finais: ${data.cnpj_digitos}</span></div>
                    <div><strong>CPF:</strong> ${data.cpf} <span class="bg-blue-100 text-blue-900 font-bold px-1.5 py-0.5 rounded">Finais: ${data.cpf_digitos}</span></div>
                    <div class="col-span-2"><strong>E-mail:</strong> ${data.email}</div>
                </div>
                <p class="text-red-600 font-medium">⚠️ <strong>Em caso de divergência:</strong> "Os dados informados divergem do nosso sistema. Por segurança, vou devolver o pedido para a área comercial para correção e eles entrarão em contato novamente, tudo bem?"</p>
            </div>

            <div class="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs pdf-block">
                <span class="font-bold text-blue-600 block mb-1">5. Débito Automático e Instalação</span>
                <p class="mb-1">"O Sr(a). poderia me informar em qual conta prefere cadastrar o débito automático? Nome do Banco, Agência e Conta."</p>
                <p class="text-red-600 font-semibold mb-2">⚠️ Restrição: NÃO pode ser banco digital.</p>
                <p class="text-slate-600 mb-2"><em>Se questionar benefícios:</em> "Facilita o seu dia a dia a obter os benefícios de manter as suas faturas sempre em dia evitando juros e multas por atraso e é um serviço totalmente gratuito oferecido pelos bancos."</p>
                <p><strong>Agendamento:</strong> "Prefere que a instalação ocorra no período da Manhã ou da Tarde? Teria disponibilidade aos finais de semana?"</p>
            </div>

            <div class="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs pdf-block">
                <span class="font-bold text-blue-600 block mb-1">6. Encerramento, AURA e Pós-Vendas</span>
                <p class="font-semibold text-emerald-700 mb-1">SEU PEDIDO FOI CONFIRMADO E A PREVISÃO DE INSTALAÇÃO É DE ATÉ 3 DIAS!</p>
                <p class="mb-2">📱 <strong>Aviso da AURA (WhatsApp):</strong> Para garantir a visita técnica, a AURA (Central da Vivo) enviará uma mensagem no WhatsApp através do número <strong>(11) 99915-1515</strong>. É fundamental responder <strong>'SIM'</strong> confirmando o agendamento no prazo, senão o sistema cancelará a visita técnica automaticamente.</p>
                <p>📞 <strong>Pós-Vendas:</strong> Dúvidas referentes ao serviço adquirido, ligar no <strong>0800 007 9700</strong>.</p>
                <p class="italic text-blue-600 mt-2">"A MS CONNECT AGRADECE SUA ATENÇÃO, TENHA UM ÓTIMO DIA!"</p>
            </div>
        </div>
    `;

    document.getElementById('previewContainer').innerHTML = html;
}

function clearInput() {
    document.getElementById('rawInput').value = '';
    document.getElementById('previewContainer').innerHTML = `
        <div class="text-center py-20 text-slate-400">
            <p class="font-medium text-sm">Nenhum dado processado ainda.</p>
            <p class="text-xs mt-1">Cole as informações ao lado e clique em <strong>"Emitir auditoria"</strong>.</p>
        </div>
    `;
    parsedGlobalData = null;
}

function exportToPDF() {
    if (!parsedGlobalData) {
        alert("Processe os dados do cliente antes de gerar o PDF.");
        return;
    }

    const element = document.getElementById('previewContainer');
    const nomeArquivo = `Auditoria: ${parsedGlobalData.primeiro_nome_cliente}.pdf`;

    const btn = document.getElementById('btnDownloadPDF');
    btn.innerHTML = `
        <svg class="w-4 h-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <span>Gerando PDF...</span>
    `;
    btn.disabled = true;

    const opt = {
        margin:       [12, 12, 12, 12],
        filename:     nomeArquivo,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        btn.innerHTML = `
            <svg class="w-4 h-4 fill-current text-white shrink-0" viewBox="0 0 24 24">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
            <span>Baixar em PDF</span>
        `;
        btn.disabled = false;
    }).catch(err => {
        console.error("Erro ao gerar PDF:", err);
        btn.innerHTML = `
            <svg class="w-4 h-4 fill-current text-white shrink-0" viewBox="0 0 24 24">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
            <span>Baixar em PDF</span>
        `;
        btn.disabled = false;
        alert("Houve um erro ao baixar o PDF. Tente novamente.");
    });
}