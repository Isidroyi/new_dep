import { RequirementDetail, ComplianceResult, Status } from '../types';

const SPREADSHEET_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv'
]);

const SPREADSHEET_EXTENSIONS = new Set(['xlsx', 'xls', 'csv']);

const fileToDataUrl = async (file: File) => {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error("Failed to read file as data URL."));
      }
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(file);
  });
  const mime = file.type || 'application/octet-stream';
  return `data:${mime};base64,${base64}`;
};

const isSpreadsheetFile = (file: File) => {
  const lowerType = (file.type || '').toLowerCase();
  if (SPREADSHEET_MIME_TYPES.has(lowerType)) {
    return true;
  }
  const extension = file.name?.split('.').pop()?.toLowerCase();
  return extension ? SPREADSHEET_EXTENSIONS.has(extension) : false;
};

const buildSpreadsheetPrompt = async (file: File, limit?: number) => {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  const sections: string[] = [];
  let remaining = typeof limit === 'number' ? limit : Number.POSITIVE_INFINITY;

  for (const sheetName of workbook.SheetNames) {
    if (remaining <= 0) {
      break;
    }
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      raw: false,
      defval: '',
      blankrows: false
    }) as (string | number)[][];

    if (!rows.length) continue;
    const headers = rows[0]?.map((header, idx) => {
      const title = (header ?? '').toString().trim();
      return title || `Колонка ${idx + 1}`;
    }) ?? [];

    const dataRows = rows.slice(1).filter((row) => row.some((cell) => (cell ?? '').toString().trim().length > 0));
    if (!dataRows.length) continue;

    const formattedRows: string[] = [];
    for (let i = 0; i < dataRows.length && remaining > 0; i += 1) {
      const row = dataRows[i];
      const cells = headers.map((header, idx) => {
        const value = (row?.[idx] ?? '').toString().trim();
        return value ? `${header}: ${value}` : null;
      }).filter((cell): cell is string => Boolean(cell));

      if (cells.length === 0) continue;
      formattedRows.push(`Строка ${i + 1}: ${cells.join(' | ')}`);
      remaining -= 1;
    }

    if (formattedRows.length > 0) {
      sections.push(`Лист "${sheetName}":\n${formattedRows.join('\n')}`);
    }
  }

  return sections.join('\n\n');
};

export const extractEntities = async (
  documentFile: File,
  limit?: number
): Promise<RequirementDetail[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }

  const dataUrl = await fileToDataUrl(documentFile);
  const isImage = (documentFile.type || '').startsWith('image/');
  const isSpreadsheet = isSpreadsheetFile(documentFile);
  const spreadsheetText = isSpreadsheet ? await buildSpreadsheetPrompt(documentFile, limit) : null;

  const textPrompt = `
    You are an expert system for analyzing technical documents. Your task is to process a document with technical requirements and extract entities.

    INSTRUCTIONS:
   1. Проходите таблицу ПОСТРОЧНО. Каждая строка (позиций товара/условия) должна соответствовать ОДНОМУ объекту 'requirement'. Не создавайте отдельные записи для каждой ячейки.
   2. Формируйте поля так:
     • 'id' — уникальный номер, инкрементируйте от 1 без пропусков.
     • 'parameter' — краткое наименование позиции/условия из строки (например, товар, услуга или тип условия).
     • 'requirement' — объедините все остальные значимые столбцы строки в единый текст. Используйте формат "Кол-во: 100; Ед. изм.: шт; ...". Сохраняйте исходные формулировки, единицы и валюту.
     • 'source' — укажите лист/страницу и номер строки, например "Строка 4" или "Лист 1, строка 4", либо конкретный раздел документа.
     • 'notes' — кратко поясните отсутствующие значения или дополнительные комментарии; если ничего добавить, напишите "Значение присутствует".
   3. Обязательно сохраняйте параметры по условиям (например, "Условия поставки", "Срок поставки", "Условия оплаты"), техническим характеристикам и ценам. Передавайте текст дословно, с оригинальной пунктуацией и единицами измерения.
   4. Если строка содержит несколько подхарактеристик (например, несколько цен/условий), перечислите их в 'requirement' через точку с запятой.
   5. If the file is a spreadsheet, use the converted tabular text that accompanies this prompt to understand each row. Preserve numerical values (especially currency) exactly as they appear.
   6. Output a single JSON object with an array named 'requirements'. Adhere to the provided JSON schema.
   7. Ensure all text is extracted in Russian и придерживайтесь исходных единиц/денежных обозначений.
    ${limit ? `IMPORTANT: Process only the first ${limit} rows supplied.` : ''}
  `;

  const userContent: any[] = [{ type: 'text', text: textPrompt }];

  if (isSpreadsheet) {
    userContent.push({ type: 'file', file: { filename: documentFile.name || 'document.xlsx', file_data: dataUrl } });
    if (spreadsheetText) {
      userContent.push({ type: 'text', text: `Ниже содержится табличное представление строк:
${spreadsheetText}` });
    }
  } else {
    userContent.push(
      isImage
        ? { type: 'image_url', image_url: { url: dataUrl } }
        : { type: 'file', file: { filename: documentFile.name || 'document', file_data: dataUrl } }
    );
  }

  const response = await fetch('https://api.aitunnel.ru/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: userContent
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'requirements_schema',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              requirements: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    parameter: { type: 'string' },
                    requirement: { type: 'string' },
                    source: { type: 'string' },
                    notes: { type: 'string' }
                  },
                  required: ['id', 'parameter', 'requirement', 'source', 'notes'],
                  additionalProperties: false
                }
              }
            },
            required: ['requirements'],
            additionalProperties: false
          }
        }
      }
    })
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    console.error("API Error in extraction:", response.status, JSON.stringify(data, null, 2));
    let userMessage = `Ошибка API: ${data.error?.message || response.statusText}`;
     if (data.error?.code === 400 && data.error?.message === "Provider returned error") {
      userMessage = "Ошибка обработки документа (400). Пожалуйста, попробуйте другой файл. Возможно, документ поврежден, имеет слишком сложную структуру или его контент был заблокирован системой безопасности провайдера AI.";
    }
    throw new Error(userMessage);
  }

  const content = data.choices?.[0]?.message?.content;
  const jsonString = typeof content === 'string' ? content : JSON.stringify(content ?? '');
  try {
    const parsedJson = JSON.parse(jsonString);
    return (parsedJson.requirements || []).map((item: any) => ({
      ...item,
      id: parseInt(item.id, 10),
    })) as RequirementDetail[];
  } catch (error) {
    console.error("Failed to parse JSON from extraction:", jsonString);
    throw new Error("API вернул неверный формат JSON при извлечении.");
  }
};


export const verifyRequirements = async (
  verificationFiles: File[],
  requirements: RequirementDetail[]
): Promise<ComplianceResult[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }
  if (!verificationFiles || verificationFiles.length === 0) {
    throw new Error('Не переданы документы для верификации.');
  }

  const fileContents = await Promise.all(
    verificationFiles.map(async (file) => {
      const dataUrl = await fileToDataUrl(file);
      const isImage = (file.type || '').startsWith('image/');
      return {
        file,
        content: isImage
          ? { type: 'image_url', image_url: { url: dataUrl } }
          : { type: 'file', file: { filename: file.name || 'document', file_data: dataUrl } }
      };
    })
  );

  const normalized = (value: string) => value.toLowerCase();
  const hasTarget = (list: RequirementDetail[], matcher: string[]) =>
    list.some((item) => {
      const parameter = normalized(item.parameter || '');
      const requirementText = normalized(item.requirement || '');
      return matcher.some((token) => parameter.includes(token) || requirementText.includes(token));
    });

  const additionalTargets: Array<{ parameter: string; requirement: string; matchTokens: string[] }> = [
    {
      parameter: 'Условия поставки',
      requirement: 'Определите условия поставки из каждого коммерческого предложения. Сохраните формулировку дословно.',
      matchTokens: ['условия поставк']
    },
    {
      parameter: 'Срок поставки',
      requirement: 'Определите сроки поставки (конкретные даты, диапазоны или SLA) из каждого коммерческого предложения. Сохраните формулировку дословно.',
      matchTokens: ['срок поставк', 'срок достав']
    },
    {
      parameter: 'Условия оплаты',
      requirement: 'Определите условия оплаты (предоплата, отсрочка, проценты) из каждого коммерческого предложения. Сохраните формулировку дословно.',
      matchTokens: ['условия оплат', 'оплат']
    }
  ];

  const maxExistingId = requirements.reduce((max, item) => Math.max(max, item.id || 0), 0);
  let nextId = maxExistingId + 1;

  const extendedRequirements = [...requirements];

  additionalTargets.forEach((target) => {
    if (!hasTarget(requirements, target.matchTokens)) {
      extendedRequirements.push({
        id: nextId++,
        parameter: target.parameter,
        requirement: target.requirement,
        source: 'Системная проверка',
        notes: 'Добавлено автоматически для анализа условий'
      });
    }
  });

  const requirementsJson = JSON.stringify(extendedRequirements);
  const suppliersList = verificationFiles
    .map((file, index) => `${index + 1}. ${file.name || `document-${index + 1}`}`)
    .join('\n');

  const textPrompt = `
    You are a meticulous compliance verification expert. Your task is to analyze MULTIPLE supplier proposal documents against a provided list of requirements and highlight the best offer.

    INSTRUCTIONS:
    For EACH requirement in the provided JSON data:
    1.  Review EVERY supplier document listed below. Locate relevant details for the current requirement in each file, включая текстовые условия (пример: "Условия поставки", "Срок поставки", "Условия оплаты").
  2.  Для каждого поставщика определите, удовлетворяет ли его предложение требованию, и извлеките точное значение. ОБЯЗАТЕЛЬНО обрабатывайте:
    • Цены и коммерческие показатели (стоимость, скидки, валюта).
    • Условия поставки (Инкотермс, склад, доставка и т.д.).
    • Сроки поставки (конкретные даты или диапазоны).
    • Условия оплаты (проценты предоплаты, отсрочка, график).
   Сохраняйте текст дословно без сокращений. Если нужного параметра нет в документе, установите actualValue = "Не указано в документе", статус = "Не найдено" и поясните это в notes/explanation.
   Для товарных позиций ОБЯЗАТЕЛЬНО включайте в actualValue цену (за единицу или общую) вместе с количеством и валютой. Если цена отсутствует, прямо укажите "Цена не указана".
    3.  Choose the single best offer ('bestDocument') that удовлетворяет требованию и имеет наилучшие условия. Для цен — самая низкая стоимость при соответствии; для сроков — самый короткий разумный срок; для условий оплаты/поставки — наилучшие условия для заказчика. Если нет полного соответствия, выберите наиболее подходящее предложение и отметьте статус "Частичное соответствие" или "Не соответствует".
    4.  Set 'actualValue' to the value from the bestDocument. Preserve units, currency symbols, и формулировки без изменений.
  5.  Provide 'comparisons' array that covers EVERY supplier document. Всегда указывайте цену (и количество, если применимо) в actualValue для каждого поставщика. В 'notes' кратко поясните ключевые отличия (например, дороже на X ₽, срок длиннее, условия оплаты хуже и т.д.).
    6.  Determine the overall compliance 'status' for the best offer using exact Russian strings: "Соответствует", "Не соответствует", "Частичное соответствие", "Не найдено".
    7.  Write a concise 'explanation' in Russian summarizing почему выбран bestDocument, сравните цены/сроки/условия с остальными.
    8.  Set 'pageNumber' to the page where the best offer найден (0 если недоступно).
    9.  Ensure 'bestDocument' EXACTLY matches one of the filenames below.
    10. Keep numbers formatted as in источниках; не округляйте.

    Supplier files:
    ${suppliersList}
  `;

  const messageContent = [
    { type: 'text', text: textPrompt },
    ...fileContents.map(({ content }) => content),
    { type: 'text', text: `Here are the requirements to verify: ${requirementsJson}` }
  ];

  const response = await fetch('https://api.aitunnel.ru/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: messageContent
        }
      ],
      tool_choice: {"type": "function", "function": {"name": "save_verification_results"}},
      tools: [{
        type: 'function',
        function: {
          name: 'save_verification_results',
          description: 'Saves the results of the compliance verification.',
          parameters: {
            type: 'object',
            properties: {
              verificationResults: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    parameter: { type: 'string' },
                    requirement: { type: 'string' },
                    source: { type: 'string' },
                    notes: { type: 'string' },
                    actualValue: { type: 'string' },
                    status: { type: 'string', enum: [
                      'Соответствует',
                      'Не соответствует',
                      'Частичное соответствие',
                      'Не найдено'
                    ] },
                    explanation: { type: 'string' },
                    pageNumber: { type: 'number', description: 'The page number where the information was found. 0 if not applicable.' },
                    bestDocument: { type: 'string', description: 'Exact filename of the supplier document that offers the best match.' },
                    comparisons: {
                      type: 'array',
                      minItems: 1,
                      items: {
                        type: 'object',
                        properties: {
                          documentName: { type: 'string' },
                          actualValue: { type: 'string' },
                          status: { type: 'string', enum: [
                            'Соответствует',
                            'Не соответствует',
                            'Частичное соответствие',
                            'Не найдено'
                          ] },
                          pageNumber: { type: 'number' },
                          notes: { type: 'string' }
                        },
                        required: ['documentName', 'actualValue', 'status', 'pageNumber'],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ['id', 'parameter', 'requirement', 'source', 'notes', 'actualValue', 'status', 'explanation', 'pageNumber', 'bestDocument', 'comparisons'],
                  additionalProperties: false
                }
              }
            },
            required: ['verificationResults'],
          }
        }
      }]
    })
  });
  
  const data = await response.json();

  if (!response.ok || data.error) {
    console.error("API Error in verification:", response.status, JSON.stringify(data, null, 2));
    let userMessage = `Ошибка API: ${data.error?.message || response.statusText}`;
    if (data.error?.code === 400 && data.error?.message === "Provider returned error") {
      userMessage = "Ошибка обработки документа (400). Пожалуйста, попробуйте другой файл. Возможно, документ поврежден, имеет слишком сложную структуру или его контент был заблокирован системой безопасности провайдера AI.";
    }
    throw new Error(userMessage);
  }

  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  const jsonString = toolCall?.function?.arguments;

  if (!jsonString) {
      console.error("API response did not contain tool_calls:", JSON.stringify(data, null, 2));
      throw new Error("API не вернул ожидаемый результат в формате tool_calls. Возможно, модель не смогла обработать запрос. Проверьте консоль для деталей.");
  }

  try {
    const parsedJson = JSON.parse(jsonString);
    return (parsedJson.verificationResults || []).map((item: any) => ({
        ...item,
        id: parseInt(item.id, 10),
        pageNumber: typeof item.pageNumber === 'string' ? parseInt(item.pageNumber, 10) : item.pageNumber,
        comparisons: Array.isArray(item.comparisons)
          ? item.comparisons.map((offer: any) => ({
              ...offer,
              pageNumber: typeof offer.pageNumber === 'string' ? parseInt(offer.pageNumber, 10) : offer.pageNumber
            }))
          : undefined
    })) as ComplianceResult[];
  } catch (error) {
    console.error("Failed to parse JSON from verification tool_calls:", jsonString);
    throw new Error("API вернул неверный формат JSON при верификации.");
  }
};