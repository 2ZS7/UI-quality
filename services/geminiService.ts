import { GoogleGenAI, Type, Schema } from "@google/genai";
import { StaticAnalysisResult, Severity, AnalysisIssue } from "../types";

export interface AnalysisConfig {
  ignoreCategories: string[];
  ignoreRules: string[];
}

export const KNOWN_RULES = {
  img_alt: 'Отсутствие alt у изображений',
  clickable_role: 'Кликабельные элементы без role',
  console_log: 'Использование console.log',
  any_type: 'Использование типа any',
  inline_function: 'Инлайн-функции в пропсах',
  danger_html: 'dangerouslySetInnerHTML',
  var_usage: 'Использование var',
  target_blank: 'Небезопасный target="_blank"',
  missing_key: 'Отсутствие key в списках'
};

// --- Rule-Based Analysis (Regex) ---

const analyzeWithRules = (code: string, config?: AnalysisConfig): StaticAnalysisResult => {
  const issues: AnalysisIssue[] = [];
  let score = 100;
  const lines = code.split('\n');

  const isCategoryIgnored = (cat: string) => config?.ignoreCategories.includes(cat);
  const isRuleIgnored = (rule: string) => config?.ignoreRules.includes(rule);

  lines.forEach((lineContent, index) => {
    const line = index + 1;

    // 1. Accessibility: <img> without alt
    if (!isCategoryIgnored('ACCESSIBILITY') && !isRuleIgnored('img_alt')) {
      if (/<img\s+(?![^>]*\balt=)[^>]*>/i.test(lineContent)) {
        issues.push({
          id: `a11y-img-${line}`,
          line,
          message: 'Нарушение доступности: изображение без текстового описания (alt).',
          severity: Severity.HIGH,
          suggestion: 'Добавьте атрибут alt="Описание" для скринридеров и SEO, или alt="" для декоративных изображений.',
          category: 'ACCESSIBILITY'
        });
        score -= 10;
      }
    }

    // 2. Accessibility: div/span with onClick but no role
    if (!isCategoryIgnored('ACCESSIBILITY') && !isRuleIgnored('clickable_role')) {
      if (/(<div|<span).*onClick/.test(lineContent) && !/role=/.test(lineContent)) {
        issues.push({
          id: `a11y-click-${line}`,
          line,
          message: 'Проблема доступности: интерактивный элемент не распознается как кнопка.',
          severity: Severity.MEDIUM,
          suggestion: 'Лучшее решение: замените на <button>. Альтернатива: добавьте role="button" и tabindex="0" для управления с клавиатуры.',
          category: 'ACCESSIBILITY'
        });
        score -= 5;
      }
    }

    // 3. Best Practice: console.log
    if (!isCategoryIgnored('BEST_PRACTICE') && !isRuleIgnored('console_log')) {
      if (/console\.log\(/.test(lineContent)) {
        issues.push({
          id: `bp-console-${line}`,
          line,
          message: 'Забытый отладочный вывод в коде.',
          severity: Severity.LOW,
          suggestion: 'Удалите console.log перед деплоем, чтобы не засорять консоль пользователя.',
          category: 'BEST_PRACTICE'
        });
        score -= 2;
      }
    }

    // 4. TypeScript: any type
    if (!isCategoryIgnored('BEST_PRACTICE') && !isRuleIgnored('any_type')) {
      if (/: \s*any\b/.test(lineContent)) {
        issues.push({
          id: `ts-any-${line}`,
          line,
          message: 'Потеря типизации: использование типа any.',
          severity: Severity.MEDIUM,
          suggestion: 'Избегайте any. Используйте конкретный интерфейс, Record<string, unknown> или unknown для повышения надежности кода.',
          category: 'BEST_PRACTICE'
        });
        score -= 5;
      }
    }

    // 5. Performance: Inline functions in props
    if (!isCategoryIgnored('PERFORMANCE') && !isRuleIgnored('inline_function')) {
      if (/=[{\s]*\(\) =>/.test(lineContent) || /=[{\s]*function\s*\(/.test(lineContent)) {
        issues.push({
          id: `perf-inline-${line}`,
          line,
          message: 'Возможная проблема производительности: инлайн-функция в пропсах.',
          severity: Severity.LOW,
          suggestion: 'Оберните функцию в useCallback, чтобы избежать лишних ре-рендеров дочерних компонентов.',
          category: 'PERFORMANCE'
        });
        score -= 3;
      }
    }

    // 6. Security: dangerouslySetInnerHTML
    if (!isCategoryIgnored('LOGIC') && !isRuleIgnored('danger_html')) {
      if (/dangerouslySetInnerHTML/.test(lineContent)) {
        issues.push({
          id: `sec-danger-${line}`,
          line,
          message: 'Критическая уязвимость: риск XSS атак.',
          severity: Severity.CRITICAL,
          suggestion: 'Используйте dangerouslySetInnerHTML только с проверенными данными (библиотеки типа DOMPurify).',
          category: 'LOGIC'
        });
        score -= 15;
      }
    }
    
    // 7. Best Practice: var usage
    if (!isCategoryIgnored('BEST_PRACTICE') && !isRuleIgnored('var_usage')) {
      if (/\bvar\s+/.test(lineContent)) {
         issues.push({
          id: `bp-var-${line}`,
          line,
          message: 'Устаревший синтаксис: использование var.',
          severity: Severity.LOW,
          suggestion: 'Используйте let или const для блочной области видимости.',
          category: 'BEST_PRACTICE'
        });
        score -= 2;
      }
    }

    // 8. Security: target="_blank" without rel="noreferrer"
    if (!isCategoryIgnored('LOGIC') && !isRuleIgnored('target_blank')) {
      if (/target="_blank"/.test(lineContent) && !/rel="[^"]*noreferrer[^"]*"/.test(lineContent)) {
        issues.push({
          id: `sec-target-${line}`,
          line,
          message: 'Уязвимость безопасности: target="_blank" без rel="noreferrer".',
          severity: Severity.MEDIUM,
          suggestion: 'Добавьте rel="noopener noreferrer", чтобы новая вкладка не имела доступа к window.opener.',
          category: 'LOGIC'
        });
        score -= 5;
      }
    }

    // 9. Logic: Missing key in .map (Simplified check)
    if (!isCategoryIgnored('LOGIC') && !isRuleIgnored('missing_key')) {
      // Very basic heuristic: line has .map and following lines have JSX but no key prop nearby
      // Note: This is hard to do perfectly with regex, checking single line generally
      if (/\.map\s*\(/.test(lineContent) && /=>/.test(lineContent) && /<[a-zA-Z]/.test(lineContent) && !/key=/.test(lineContent)) {
        issues.push({
           id: `logic-key-${line}`,
           line,
           message: 'Возможная ошибка React: отсутствие пропа key в списке.',
           severity: Severity.HIGH,
           suggestion: 'Добавьте уникальный prop key={id} для корректного реконсилинга DOM.',
           category: 'LOGIC'
        });
        score -= 5;
      }
    }
  });

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Generate Summary based on score
  let summary = "";
  if (score >= 90) summary = "Отличный код! Статический анализ не выявил критических проблем, но всегда есть что улучшить.";
  else if (score >= 70) summary = "Хороший результат. Найдены потенциальные улучшения в области доступности или типизации.";
  else if (score >= 50) summary = "Код требует внимания. Обнаружены проблемы, влияющие на безопасность или производительность.";
  else summary = "Рекомендуется рефакторинг. Найдены критические ошибки или множественные нарушения стандартов.";

  // Generate simplistic optimized code
  let optimizedCode = undefined;
  if (issues.length > 0) {
      optimizedCode = code.replace(/console\.log/g, '// console.log');
  }

  return {
    score,
    summary,
    issues,
    optimizedCode
  };
};

// --- AI-Based Analysis (Gemini) ---

const analyzeWithGemini = async (code: string, config?: AnalysisConfig): Promise<StaticAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.NUMBER, description: "A score from 0 to 100 representing code quality." },
      summary: { type: Type.STRING, description: "A brief summary of the analysis in Russian." },
      optimizedCode: { type: Type.STRING, description: "Refactored version of the code fixing the issues." },
      issues: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            line: { type: Type.INTEGER, description: "Line number where the issue occurs (approximate)." },
            message: { type: Type.STRING, description: "Short description of the issue in Russian." },
            severity: { type: Type.STRING, enum: [Severity.LOW, Severity.MEDIUM, Severity.HIGH, Severity.CRITICAL] },
            suggestion: { type: Type.STRING, description: "How to fix the issue in Russian." },
            category: { type: Type.STRING, enum: ['ACCESSIBILITY', 'PERFORMANCE', 'BEST_PRACTICE', 'LOGIC'] }
          },
          required: ["id", "message", "severity", "suggestion", "category"]
        }
      }
    },
    required: ["score", "summary", "issues"]
  };

  // Build Ignore Instructions
  let ignoreInstructions = "";
  if (config) {
      const ignores = [];
      if (config.ignoreCategories.length > 0) {
          ignores.push(`Issues in categories: ${config.ignoreCategories.join(', ')}`);
      }
      
      const ruleMap: Record<string, string> = {
          img_alt: 'missing "alt" attribute on images',
          clickable_role: 'clickable non-interactive elements without role',
          console_log: 'console.log usage',
          any_type: 'usage of "any" type in TypeScript',
          inline_function: 'inline functions in JSX props',
          danger_html: 'dangerouslySetInnerHTML usage',
          var_usage: 'usage of "var" keyword',
          target_blank: 'target="_blank" without rel="noreferrer"',
          missing_key: 'missing key prop in lists'
      };
      
      const specificRules = config.ignoreRules.map(r => ruleMap[r]).filter(Boolean);
      if (specificRules.length > 0) {
          ignores.push(`Specific patterns: ${specificRules.join(', ')}`);
      }

      if (ignores.length > 0) {
          ignoreInstructions = `\n\nIMPORTANT IGNORE INSTRUCTIONS:\nDo NOT report or penalize the score for the following:\n- ${ignores.join('\n- ')}`;
      }
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the following React/JS/TS code for code quality, accessibility, performance, security, and best practices. 
      
      IMPORTANT:
      1. Provide all text responses (summary, messages, suggestions) in RUSSIAN language.
      2. Be strict but fair with the score.
      3. Return valid JSON matching the schema.${ignoreInstructions}
      
      CODE TO ANALYZE:
      ${code}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as StaticAnalysisResult;
    }
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Fallback to rules if AI fails or key is missing
    const fallback = analyzeWithRules(code, config);
    fallback.summary = "Ошибка AI анализа (проверьте API ключ). Выполнен анализ по правилам. " + fallback.summary;
    return fallback;
  }
};

// --- Main Export ---

export type AnalysisMode = 'RULES' | 'AI';

export const analyzeCode = async (code: string, mode: AnalysisMode = 'RULES', config?: AnalysisConfig): Promise<StaticAnalysisResult> => {
  if (mode === 'AI') {
    return await analyzeWithGemini(code, config);
  } else {
    // Artificial small delay for UX consistency in rules mode
    await new Promise(resolve => setTimeout(resolve, 600)); 
    return analyzeWithRules(code, config);
  }
};