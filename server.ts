import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { YoutubeTranscript } from "youtube-transcript";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Helper to extract YouTube video ID
function extractYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

// Define response schema for structured JSON output
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Título do vídeo ou conteúdo analisado." },
    author: { type: Type.STRING, description: "Canal do YouTube, perfil do Instagram ou autor do conteúdo." },
    summary: { type: Type.STRING, description: "Um resumo detalhado de 3 a 5 frases explicativas em português." },
    sentiment: { type: Type.STRING, description: "O tom, clima ou sentimento do vídeo (ex: Educacional, Inspirador, Crítico, Motivador, Humorístico)." },
    keyTakeaways: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Lista de 4 a 6 aprendizados práticos, lições ou conclusões principais em português."
    },
    topics: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Título do tópico discutido" },
          description: { type: Type.STRING, description: "Detalhamento explicativo do que foi falado sobre este tópico em português" },
          importance: { type: Type.STRING, description: "A relevância ou importância deste ponto no contexto geral do vídeo" }
        },
        required: ["title", "description"]
      },
      description: "Lista de tópicos principais divididos de forma lógica em português."
    },
    memorableQuotes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          quote: { type: Type.STRING, description: "Frase de impacto dita ou implícita de extremo valor em português" },
          context: { type: Type.STRING, description: "Quem proferiu ou o contexto em que a frase foi inserida" }
        },
        required: ["quote"]
      },
      description: "3 ou 4 citações ou ideias marcantes extraídas do conteúdo."
    }
  },
  required: ["title", "author", "summary", "sentiment", "keyTakeaways", "topics", "memorableQuotes"]
};

// Helper to generate highly realistic mock/fallback data if Gemini API has quota limits
function generateFallbackData(url: string) {
  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
  const isInstagram = url.includes("instagram.com");
  
  let title = "O Futuro da Tecnologia e Desenvolvimento Web";
  let author = "Educação Tech Brasil";
  let sentiment = "Inspirador e Educativo";
  
  if (url.includes("dQw4w9WgXcQ")) {
    title = "Rick Astley - Never Gonna Give You Up (Official Music Video)";
    author = "Rick Astley";
    sentiment = "Nostálgico e Humorístico";
  } else if (url.includes("kYVsnPiaN2E")) {
    title = "O que é Inteligência Artificial e como funciona na Prática?";
    author = "Ciência Todo Dia";
    sentiment = "Educativo e Informativo";
  } else if (url.includes("C8v9z_8AxKz")) {
    title = "Estratégias de Desenvolvimento de Carreira em Tecnologia";
    author = "DevDicas Reels";
    sentiment = "Prático e Motivador";
  } else {
    try {
      if (isYouTube) {
        title = "Análise Prática de Conceitos de Engenharia de Software";
        author = "Canal de Tecnologia YouTube";
      } else if (isInstagram) {
        title = "Dicas Rápidas de Produtividade para Desenvolvedores";
        author = "Criador de Conteúdo Instagram";
      }
    } catch (e) {}
  }

  return {
    title,
    author,
    summary: `Este conteúdo apresenta reflexões essenciais sobre o avanço tecnológico moderno e seu impacto no fluxo de trabalho contemporâneo. O orador discute que a rápida evolução exige resiliência técnica e um foco implacável em conceitos fundamentais, que permanecem relevantes independente das mudanças de ferramentas ou de frameworks. Além de insights técnicos, são abordadas abordagens práticas para melhorar a produtividade sem comprometer a saúde mental.`,
    sentiment,
    keyTakeaways: [
      "Foco total nos fundamentos conceituais em vez de aprender apenas frameworks do momento.",
      "A importância do design assíncrono para garantir estados profundos de foco e produtividade de alto nível.",
      "Cultivar uma mentalidade de aprendizado contínuo estruturado para absorver novas inovações velozmente.",
      "Reduzir a fadiga de ferramentas limitando a quantidade de canais de comunicação ativos diariamente.",
      "Criar e manter documentação clara como ativo principal para a colaboração sustentável."
    ],
    topics: [
      {
        title: "Fundamentos Técnicos vs. Novidades",
        description: "O autor detalha o perigo de seguir tendências superficiais de tecnologia sem construir uma base conceitual sólida.",
        importance: "Alta - Serve como barreira contra a obsolescência profissional no mercado."
      },
      {
        title: "Trabalho Profundo e Foco de Alta Performance",
        description: "Como a hiperconectividade sabota a nossa atenção e as melhores práticas para desenhar rotinas livres de interrupções.",
        importance: "Média - Essencial para times criativos e de desenvolvimento de software."
      },
      {
        title: "O Papel da Documentação na Colaboração",
        description: "Por que investir tempo escrevendo boas explicações e arquiteturas economiza centenas de horas de reuniões síncronas desnecessárias.",
        importance: "Alta - Reduz o estresse coletivo e aumenta a velocidade de entrega de valor."
      }
    ],
    memorableQuotes: [
      {
        quote: "Os fundamentos técnicos são perpétuos; as ferramentas modernas são apenas conveniências que duram uma temporada.",
        context: "Introdução sobre longevidade de carreira"
      },
      {
        quote: "Se você não dominar sua própria atenção de forma ativa, os algoritmos modernos farão isso por você todos os dias.",
        context: "Seção sobre foco no trabalho contemporâneo"
      },
      {
        quote: "Uma hora escrevendo uma boa documentação técnica evita dez reuniões de alinhamento improdutivas.",
        context: "Reflexão sobre colaboração assíncrona"
      }
    ]
  };
}

// API Endpoint to analyze a video
app.post("/api/analyze", async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Por favor, informe uma URL válida." });
  }

  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
  const isInstagram = url.includes("instagram.com");

  let transcriptText = "";
  let fetchMethod = "search_fallback";

  if (isYouTube) {
    const videoId = extractYouTubeId(url);
    if (videoId) {
      try {
        console.log(`Buscando transcrição para o vídeo do YouTube ID: ${videoId}`);
        const transcriptArray = await YoutubeTranscript.fetchTranscript(videoId, {
          lang: "pt", // Try to request Portuguese first
        }).catch(() => {
          // If Portuguese fails, fetch default
          return YoutubeTranscript.fetchTranscript(videoId);
        });

        if (transcriptArray && transcriptArray.length > 0) {
          transcriptText = transcriptArray.map((t) => t.text).join(" ");
          fetchMethod = "youtube_transcript";
          console.log(`Transcrição obtida com sucesso. Tamanho: ${transcriptText.length} caracteres.`);
        }
      } catch (err: any) {
        console.warn(`Não foi possível obter a transcrição via scrap direto: ${err.message}. Usando fallback de pesquisa.`);
      }
    }
  }

  try {
    let prompt = "";
    let tools: any[] = [];
    let toolConfig: any = undefined;

    if (fetchMethod === "youtube_transcript") {
      prompt = `Você é um analista de mídias de IA experiente.
Analise a transcrição abaixo do vídeo do YouTube para extrair todas as informações solicitadas no esquema de resposta.
O idioma das suas respostas deve ser o português do Brasil.

URL do Vídeo: ${url}
Transcrição do Vídeo:
${transcriptText}

Importante: Se a transcrição estiver em outro idioma, traduza os conceitos e responda em português de forma natural.`;
    } else {
      // Use Google Search grounding for Instagram, other URLs, or YouTube without direct transcript
      tools = [{ googleSearch: {} }];
      toolConfig = { includeServerSideToolInvocations: true };

      const platform = isInstagram ? "Instagram" : isYouTube ? "YouTube" : "Web";
      prompt = `Você é um analista de mídias de IA experiente.
O usuário solicitou a análise deste link do ${platform}: ${url}

Como não foi possível extrair a transcrição diretamente por motivos de segurança ou restrições da plataforma, use a ferramenta de busca do Google (Google Search) para obter informações ricas sobre este link do ${platform}, como:
1. O título real da postagem/vídeo ou do Reel/Shorts.
2. O nome do canal, conta ou criador do vídeo.
3. Resumos, transcrições indexadas, discussões em fóruns, blogs ou artigos que detalham exatamente o que está sendo dito, demonstrado ou discutido neste vídeo.
4. Legenda original do vídeo, descrições oficiais e comentários sobre o tema do vídeo.

Com base nos resultados reais da busca, preencha todos os campos do esquema de resposta em português de forma rica e detalhada, como se você tivesse assistido e compreendido perfeitamente o vídeo.`;
    }

    console.log(`Iniciando geração de conteúdo via Gemini com método: ${fetchMethod}`);
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "Você é um analista profissional que gera resumos e insights profundos de mídias de vídeo. Suas respostas devem ser sempre ricas, precisas e em português do Brasil.",
        tools: tools.length > 0 ? tools : undefined,
        toolConfig: toolConfig,
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Não foi possível gerar conteúdo. Resposta vazia.");
    }

    const jsonResult = JSON.parse(resultText);

    // If title or author are blank or placeholder, enrich them
    if (!jsonResult.title || jsonResult.title.toLowerCase().includes("video") && jsonResult.title.length < 10) {
      jsonResult.title = isYouTube ? "Vídeo do YouTube" : isInstagram ? "Reel / Vídeo do Instagram" : "Conteúdo Web";
    }

    res.json({
      success: true,
      data: jsonResult,
      source: fetchMethod === "youtube_transcript" ? "Transcrição Direta" : "Análise Inteligente via Busca",
    });
  } catch (error: any) {
    // Check if it's a quota error (RESOURCE_EXHAUSTED or 429) in a bulletproof way
    const errorString = [
      error?.message,
      error?.stack,
      typeof error === "object" ? JSON.stringify(error) : ""
    ].filter(Boolean).join(" ").toLowerCase();

    const currentKey = (process.env.GEMINI_API_KEY || "").trim();
    const isKeyEmpty = currentKey.length === 0;
    const isKeyInvalidFormat = currentKey.length > 0 && currentKey.length < 15;

    const isQuotaError = errorString.includes("429") || 
                         errorString.includes("resource_exhausted") || 
                         errorString.includes("quota") || 
                         errorString.includes("exceeded") ||
                         errorString.includes("limit");

    const isInvalidKeyError = isKeyEmpty || 
                              isKeyInvalidFormat || 
                              errorString.includes("api key not valid") || 
                              errorString.includes("key not valid") || 
                              errorString.includes("invalid key") ||
                              errorString.includes("api_key") ||
                              errorString.includes("invalid_argument");

    if (isInvalidKeyError) {
      console.warn("[Aviso de Chave] Chave de API do Gemini vazia ou em formato incorreto. Chave atual:", currentKey.slice(0, 15) + "...");
    } else if (isQuotaError) {
      console.warn("[Aviso de Cota] O limite de chamadas gratuitas da API do Gemini foi atingido. Ativando o Modo de Fallback de Demonstração Inteligente para o usuário.");
    } else {
      console.warn("[Aviso do Servidor] Erro de rede ou indisponibilidade da API do Gemini. Detalhe:", error?.message || error);
    }
    
    const fallbackData = generateFallbackData(url);
    
    res.json({
      success: true,
      data: fallbackData,
      source: isInvalidKeyError ? "Simulada (Chave Inválida)" : isQuotaError ? "Simulada (Cota Gemini Excedida)" : "Análise Inteligente (Modo de Demonstração)",
      isDemoFallback: true,
      isQuotaError: isQuotaError,
      invalidKey: isInvalidKeyError,
      errorMessage: isInvalidKeyError 
        ? (isKeyEmpty ? "Chave de API do Gemini vazia" : currentKey)
        : (error?.message || String(error))
    });
  }
});

// Setup Vite Dev server middleware or static directory for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
