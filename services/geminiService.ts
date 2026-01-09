
import { DesignBlueprint } from "../types";

// 使用 OpenAI 兼容的代理配置
const API_KEY = process.env.API_KEY || '';
const BASE_URL = "https://sg.uiuiapi.com/v1";

/**
 * OpenAI 兼容的 API 调用工具函数
 */
async function openAiChat(messages: any[], jsonMode: boolean = false) {
  if (!API_KEY) {
    throw new Error("未检测到 API_KEY。请确保已在环境变量中配置 API_KEY。");
  }

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      // 分析阶段使用快且省的 mini 模型，排版阶段使用能力更强的 o1/4o 模型
      model: jsonMode ? "gpt-4o-mini" : "gpt-4o",
      messages: messages,
      response_format: jsonMode ? { type: "json_object" } : undefined,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `API 请求失败: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export const analyzeDocument = async (text: string, preferredStyle: string = 'Auto'): Promise<DesignBlueprint> => {
  const styleInstruction = preferredStyle === 'Auto' 
    ? "从（学术典雅、现代知识、科技简约、手绘笔记、商务专业）中智能选择最匹配的风格。" 
    : `视觉风格强制指定为：${preferredStyle}。`;

  const systemPrompt = `你是一位顶级视觉设计师和信息架构师。
  任务：将用户提供的文档内容拆解为一系列高颜值的知识卡片蓝图。
  
  要求：
  1. 必须输出严格的 JSON 格式。
  2. cardOutlines 数组的第一张必须是封面卡片。
  3. 卡片必须符合 7:11.6 的黄金比例视觉设计。
  4. 包含明确的主题色、辅助色和字体对建议。
  
  JSON 结构：
  {
    "style": "风格名称",
    "themeColor": "#HEX",
    "secondaryColor": "#HEX",
    "fontPairing": { "heading": "字体名", "body": "字体名" },
    "cardOutlines": [{ "title": "标题", "points": ["要点1", "要点2"] }],
    "description": "设计思路说明"
  }`;

  const userPrompt = `文档内容：\n${text}\n\n${styleInstruction}`;

  const content = await openAiChat([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ], true);

  return JSON.parse(content) as DesignBlueprint;
};

export const generateCardHTML = async (blueprint: DesignBlueprint, cardIndex: number): Promise<string> => {
  const card = blueprint.cardOutlines[cardIndex];
  const isCover = cardIndex === 0;

  const systemPrompt = `你是一个专家级前端排版师，擅长使用 HTML 和 CSS 制作具有高端杂志感的平面设计作品。
  
  严格规范：
  1. 容器尺寸：固定 700px * 1160px，禁止出现滚动条。
  2. 导出兼容：所有样式必须内联或写在 <style> 块内，确保图片导出不报错。
  3. 署名：卡片左下角必须优雅地展示署名：@不想上班计划 AI提效 少工作 多赚钱。
  4. 视觉：使用层叠、几何图形、优雅的排版布局，体现出 ${blueprint.style} 风格。
  5. 只返回 HTML 代码，不要包含 Markdown 代码块标记。`;

  const userPrompt = `
  请为以下内容进行高保真排版：
  类型：${isCover ? '封面卡片' : '内容卡片'}
  主题：${card.title}
  要点：${card.points.join('；')}
  
  设计蓝图：
  - 风格：${blueprint.style}
  - 主题色：${blueprint.themeColor}
  - 辅助色：${blueprint.secondaryColor}
  - 字体建议：标题 ${blueprint.fontPairing.heading}，正文 ${blueprint.fontPairing.body}
  `;

  const html = await openAiChat([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ], false);

  // 格式化处理：移除 AI 可能返回的 ```html 代码块标签
  let cleanHtml = html;
  if (cleanHtml.includes('```html')) {
    cleanHtml = cleanHtml.split('```html')[1].split('```')[0];
  } else if (cleanHtml.includes('```')) {
    cleanHtml = cleanHtml.split('```')[1].split('```')[0];
  }
  
  return cleanHtml.trim();
};
