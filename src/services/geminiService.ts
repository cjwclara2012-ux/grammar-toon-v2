import { GoogleGenAI, Type } from "@google/genai";

export interface EduToonResult {
  title: string;
  summary: string;
  scenario: {
    panel1: { description: string; dialogue: string };
    panel2: { description: string; dialogue: string };
    panel3: { description: string; dialogue: string };
    panel4: { description: string; dialogue: string };
  };
  imagePrompt: string;
  imageUrl?: string;
  quiz: {
    question: string;
    answer: string;
  };
}

function getApiKey(): string {
  // Try platform injected keys first
  const userApiKey = process.env.API_KEY;
  const fallbackApiKey = process.env.GEMINI_API_KEY;
  
  // Try manual key from localStorage
  const manualApiKey = typeof window !== 'undefined' ? localStorage.getItem('manual_api_key') : null;
  
  // Also try Vite-style env vars just in case
  const viteApiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;

  const key = userApiKey || manualApiKey || fallbackApiKey || viteApiKey;
  
  if (!key) {
    throw new Error("API 키가 설정되지 않았습니다. 상단 'API 키 추가' 버튼을 눌러주세요.");
  }
  return key;
}

function isUserKeyAvailable(): boolean {
  return !!(process.env.API_KEY || (typeof window !== 'undefined' && localStorage.getItem('manual_api_key')));
}

export async function generateComicImage(prompt: string): Promise<string> {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  
  // Use gemini-2.5-flash-image for maximum stability in default mode
  const model = "gemini-2.5-flash-image";

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            text: `Create a high-quality 4-panel comic strip (2x2 grid) based on this prompt: ${prompt}. 
            Style: Bright, clean, professional 2D Korean Manhwa/Webtoon style.
            Characters: Bak-Kwang (clumsy boy) and Al-Ji (smart robot).
            Layout: 4 panels with Korean speech bubbles.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("이미지 데이터가 응답에 포함되어 있지 않습니다. 다시 시도해 주세요.");
  } catch (error: any) {
    console.error("Image Generation Error:", error);
    if (error.message?.includes("Safety")) {
      throw new Error("안전 필터에 의해 이미지가 생성되지 않았습니다. 내용을 조금 더 부드럽게 수정해 보세요.");
    }
    throw new Error(error.message || "만화 이미지를 그리는 중에 오류가 발생했습니다.");
  }
}

export async function generateEduToon(sourceText: string, fileData?: { data: string; mimeType: string }): Promise<EduToonResult> {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  
  const parts: any[] = [];

  if (fileData) {
    parts.push({
      inlineData: {
        data: fileData.data,
        mimeType: fileData.mimeType
      }
    });
  }

  if (sourceText.trim()) {
    parts.push({ text: `사용자가 입력한 텍스트: ${sourceText}` });
  }

  if (parts.length === 0) {
    throw new Error("분석할 텍스트나 파일을 제공해주세요.");
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        systemInstruction: `
          당신은 초등 3학년 맞춤형 '한국어 문법 에듀툰' 작가입니다.
          사용자가 제공한 자료를 분석하여 핵심 문법 1가지를 추출하고, 이를 재미있는 4컷 만화 시나리오로 만드세요.
          
          [규칙]:
          1. 캐릭터: 주인공 '박꽝'(실수투성이 소년)과 조력자 '알지'(똑똑한 로봇)를 사용하세요.
          2. 4컷 구조: 도입 -> 실수 발생 -> 알지의 설명 -> 깨달음과 마무리.
          3. 대사 일치 (매우 중요): 'scenario'의 각 컷에 들어가는 'dialogue'는 'imagePrompt' 내의 말풍선 대사와 토씨 하나 틀리지 않고 완벽하게 일치해야 합니다.
          4. 이미지 프롬프트: Imagen 모델이 4컷 만화(2x2 그리드)를 그릴 수 있도록 영어로 된 상세한 묘사를 작성하세요. 각 컷의 말풍선(speech bubble) 안에 들어갈 한국어 대사를 반드시 포함해야 하며, 이는 scenario의 dialogue와 동일해야 합니다.
          
          반드시 JSON 형식으로 응답하세요.
        `,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "만화의 제목 (예: '은'과 '는'의 이름표 대결!)" },
            summary: { type: Type.STRING, description: "오늘 배울 문법의 쉬운 요약 (2문장 이내, 비유 포함)" },
            scenario: {
              type: Type.OBJECT,
              properties: {
                panel1: {
                  type: Type.OBJECT,
                  properties: {
                    description: { type: Type.STRING, description: "1컷의 배경과 인물 동작 묘사" },
                    dialogue: { type: Type.STRING, description: "1컷의 대사" }
                  },
                  required: ["description", "dialogue"]
                },
                panel2: {
                  type: Type.OBJECT,
                  properties: {
                    description: { type: Type.STRING, description: "2컷의 배경과 인물 동작 묘사" },
                    dialogue: { type: Type.STRING, description: "2컷의 대사" }
                  },
                  required: ["description", "dialogue"]
                },
                panel3: {
                  type: Type.OBJECT,
                  properties: {
                    description: { type: Type.STRING, description: "3컷의 배경과 인물 동작 묘사" },
                    dialogue: { type: Type.STRING, description: "3컷의 대사" }
                  },
                  required: ["description", "dialogue"]
                },
                panel4: {
                  type: Type.OBJECT,
                  properties: {
                    description: { type: Type.STRING, description: "4컷의 배경과 인물 동작 묘사" },
                    dialogue: { type: Type.STRING, description: "4컷의 대사" }
                  },
                  required: ["description", "dialogue"]
                }
              },
              required: ["panel1", "panel2", "panel3", "panel4"]
            },
            imagePrompt: { 
              type: Type.STRING, 
              description: "Detailed Imagen prompt in English for a 4-panel (2x2) comic. MUST include the EXACT Korean dialogues from the scenario panels for speech bubbles. Style: Bright Korean 2D Manhwa, consistent characters (Bak-Kwang and Al-Ji)." 
            },
            quiz: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING, description: "방금 배운 내용을 확인하는 아주 쉬운 퀴즈" },
                answer: { type: Type.STRING, description: "퀴즈의 정답" }
              },
              required: ["question", "answer"]
            }
          },
          required: ["title", "summary", "scenario", "imagePrompt", "quiz"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("AI로부터 응답을 받지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
    
    try {
      // Clean up potential markdown blocks if any
      const cleanJson = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
      return JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("JSON Parse Error. Raw text:", text);
      throw new Error("AI의 응답 형식이 올바르지 않습니다. 다시 생성 버튼을 눌러주세요.");
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("Safety")) {
      throw new Error("입력 내용에 부적절한 표현이 포함되어 분석할 수 없습니다. 다른 내용을 입력해 주세요.");
    }
    throw new Error(error.message || "에듀툰 생성 중 오류가 발생했습니다.");
  }
}
