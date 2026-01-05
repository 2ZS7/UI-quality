import { GoogleGenAI, Type, Schema } from "@google/genai";
import { StaticAnalysisResult, Severity, AnalysisIssue } from "../types";

// --- Rule-Based Analysis (Regex) ---

const analyzeWithRules = (code: string): StaticAnalysisResult => {
  const issues: AnalysisIssue[] = [];
  let score = 100;
  const lines = code.split('\n');

  lines.forEach((lineContent, index) => {
    const line = index + 1;

    // 1. Accessibility: <img> without alt
    if (/<img\s+(?![^>]*\balt=)[^>]*>/i.test(lineContent)) {
      issues.push({
        id: `a11y-img-${line}`,
        line,
        message: 'Тег <img> должен содержать атрибут alt.',
        severity: Severity.HIGH,
        suggestion: 'Добавьте alt="Описание изображения"',
        category: 'ACCESSIBILITY'
      });
      score -= 10;
    }

    // 2. Accessibility: div/span with onClick but no role
    if (/(<div|<span).*onClick/.test(lineContent) && !/role=/.test(lineContent)) {
      issues.push({
        id: `a11y-click-${line}`,
        line,
        message: 'Кликабельный элемент должен иметь роль.',
        severity: Severity.MEDIUM,
        suggestion: 'Добавьте role="button" или используйте тег <button>',
        category: 'ACCESSIBILITY'
      });
      score -= 5;
    }

    // 3. Best Practice: console.log
    if (/console\.log\(/.test(lineContent)) {
      issues.push({
        id: `bp-console-${line}`,
        line,
        message: 'Обнаружен console.log.',
        severity: Severity.LOW,
        suggestion: 'Удалите отладочный вывод.',
        category: 'BEST_PRACTICE'
      });
      score -= 2;
    }

    // 4. TypeScript: any type
    if (/: \s*any\b/.test(lineContent)) {
      issues.push({
        id: `ts-any-${line}`,
        line,
        message: 'Использование типа any.',
        severity: Severity.MEDIUM,
        suggestion: 'Замените any на конкретный тип или unknown.',
        category: 'BEST_PRACTICE'
      });
      score -= 5;
    }

    // 5. Performance: Inline functions in props
    if (/=[{\s]*\(\) =>/.test(lineContent) || /=[{\s]*function\s*\(/.test(lineContent)) {
      issues.push({
        id: `perf-inline-${line}`,
        line,
        message: 'Инлайн-функция в пропсах.',
        severity: Severity.LOW,
        suggestion: 'Используйте useCallback для стабильности ссылок.',
        category: 'PERFORMANCE'
      });
      score -= 3;
    }

    // 6. Security: dangerouslySetInnerHTML
    if (/dangerouslySetInnerHTML/.test(lineContent)) {
      issues.push({
        id: `sec-danger-${line}`,
        line,
        message: 'Опасное использование HTML.',
        severity: Severity.CRITICAL,
        suggestion: 'Убедитесь в санации данных перед вставкой.',
        category: 'LOGIC'
      });
      score -= 15;
    }
    
    // 7. Best Practice: var usage
    if (/\bvar\s+/.test(lineContent)) {
       issues.push({
        id: `bp-var-${line}`,
        line,
        message: 'Использование var устарело.',
        severity: Severity.LOW,
        suggestion: 'Используйте let или const.',
        category: 'BEST_PRACTICE'
      });
      score -= 2;
    }
  });

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Generate Summary based on score
  let summary = "";
  if (score >= 90) summary = "Отличный код! Критических проблем не обнаружено (Анализ правил).";
  else if (score >= 70) summary = "Хороший код, но есть возможности для улучшения (Анализ правил).";
  else if (score >= 50) summary = "Качество кода среднее, требуется внимание (Анализ правил).";
  else summary = "Код требует рефакторинга (Анализ правил).";

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

const analyzeWithGemini = async (code: string): Promise<StaticAnalysisResult> => {
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

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the following React/JS/TS code for code quality, accessibility, performance, security, and best practices. 
      
      IMPORTANT:
      1. Provide all text responses (summary, messages, suggestions) in RUSSIAN language.
      2. Be strict but fair with the score.
      3. Return valid JSON matching the schema.
      
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
    const fallback = analyzeWithRules(code);
    fallback.summary = "Ошибка AI анализа (проверьте API ключ). Выполнен анализ по правилам. " + fallback.summary;
    return fallback;
  }
};

// --- Main Export ---

export type AnalysisMode = 'RULES' | 'AI';

export const analyzeCode = async (code: string, mode: AnalysisMode = 'RULES'): Promise<StaticAnalysisResult> => {
  if (mode === 'AI') {
    return await analyzeWithGemini(code);
  } else {
    // Artificial small delay for UX consistency in rules mode
    await new Promise(resolve => setTimeout(resolve, 600)); 
    return analyzeWithRules(code);
  }
};