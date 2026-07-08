import React, { useState, useEffect, useRef } from "react";
import {
  Youtube,
  Instagram,
  Search,
  Sparkles,
  BookOpen,
  Quote,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  ArrowRight,
  Clock,
  ExternalLink,
  FileText,
  Video,
  ListChecks,
  ChevronRight,
  User,
  HeartHandshake,
  MessageSquareShare,
  Compass
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AnalysisData {
  title: string;
  author: string;
  summary: string;
  sentiment: string;
  keyTakeaways: string[];
  topics: {
    title: string;
    description: string;
    importance: string;
  }[];
  memorableQuotes: {
    quote: string;
    context: string;
  }[];
}

interface SavedSearch {
  id: string;
  url: string;
  timestamp: string;
  data: AnalysisData;
  source: string;
}

const LOADING_STAGES = [
  "Validando link do vídeo...",
  "Conectando com o servidor de mídias...",
  "Buscando transcrição e metadados...",
  "Consultando a Inteligência Artificial Gemini...",
  "Estruturando pontos principais...",
  "Refinando tom e extraindo lições...",
  "Finalizando relatório de análise..."
];

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisData | null>(null);
  const [resultSource, setResultSource] = useState<string>("");
  const [analyzedUrl, setAnalyzedUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<SavedSearch[]>([]);
  const [expandedTopic, setExpandedTopic] = useState<number | null>(0);
  const [activeTab, setActiveTab] = useState<"analyzer" | "history">("analyzer");
  const [isDemoFallback, setIsDemoFallback] = useState(false);
  const [fallbackErrorMsg, setFallbackErrorMsg] = useState("");
  const [isInvalidKeyError, setIsInvalidKeyError] = useState(false);

  const stageIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load history on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("video_analyzer_history");
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Erro ao carregar histórico", e);
    }
  }, []);

  // Save search to history helper
  const saveToHistory = (videoUrl: string, data: AnalysisData, source: string) => {
    try {
      const newSearch: SavedSearch = {
        id: Date.now().toString(),
        url: videoUrl,
        timestamp: new Date().toLocaleDateString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit"
        }),
        data,
        source
      };

      // Avoid duplicates of the same URL
      const filtered = history.filter((h) => h.url.trim().toLowerCase() !== videoUrl.trim().toLowerCase());
      const updated = [newSearch, ...filtered].slice(0, 10); // Keep last 10 searches
      setHistory(updated);
      localStorage.setItem("video_analyzer_history", JSON.stringify(updated));
    } catch (e) {
      console.error("Erro ao salvar histórico", e);
    }
  };

  // Delete from history
  const deleteFromHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = history.filter((item) => item.id !== id);
      setHistory(updated);
      localStorage.setItem("video_analyzer_history", JSON.stringify(updated));
    } catch (err) {
      console.error("Erro ao deletar histórico", err);
    }
  };

  // Start analysis
  const handleAnalyze = async (targetUrl: string = url) => {
    const cleanUrl = targetUrl.trim();
    if (!cleanUrl) {
      setError("Por favor, cole um link válido do YouTube ou Instagram.");
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentStage(0);
    setResult(null);

    // Dynamic loading stages animation
    stageIntervalRef.current = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev < LOADING_STAGES.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 3000);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: cleanUrl })
      });

      const resData = await response.json();

      if (stageIntervalRef.current) {
        clearInterval(stageIntervalRef.current);
      }

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || "Ocorreu um erro desconhecido ao processar.");
      }

      setResult(resData.data);
      setResultSource(resData.source);
      setIsDemoFallback(!!resData.isDemoFallback);
      setFallbackErrorMsg(resData.errorMessage || "");
      setIsInvalidKeyError(!!resData.invalidKey);
      setAnalyzedUrl(cleanUrl);
      saveToHistory(cleanUrl, resData.data, resData.source);
      setActiveTab("analyzer");
    } catch (err: any) {
      if (stageIntervalRef.current) {
        clearInterval(stageIntervalRef.current);
      }
      setError(err.message || "Erro de conexão com o servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Pre-set link triggers
  const runExample = (exampleUrl: string) => {
    setUrl(exampleUrl);
    handleAnalyze(exampleUrl);
  };

  // Load from history click
  const loadFromHistory = (item: SavedSearch) => {
    setResult(item.data);
    setResultSource(item.source);
    setIsDemoFallback(item.source.includes("Simulada") || item.source.includes("Demonstração"));
    setFallbackErrorMsg("");
    setIsInvalidKeyError(false);
    setAnalyzedUrl(item.url);
    setUrl(item.url);
    setError(null);
    setActiveTab("analyzer");
  };

  // Format link for paste button
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
      }
    } catch (e) {
      setError("Não foi possível acessar a área de transferência automaticamente. Por favor, cole usando Ctrl+V.");
      setTimeout(() => setError(null), 4000);
    }
  };

  // Format and copy reports
  const handleCopyReport = () => {
    if (!result) return;

    const report = `# 📊 Relatório de Análise: ${result.title}
*Autor/Criador:* ${result.author}
*Link do Vídeo:* ${analyzedUrl}
*Método:* ${resultSource}

---

## 📝 Resumo do Conteúdo
${result.summary}

---

## 🎭 Sentimento e Tom Geral
**${result.sentiment}**

---

## 💡 Principais Lições Aprendidas (Takeaways)
${result.keyTakeaways.map((item) => `- ${item}`).join("\n")}

---

## 🔍 Tópicos Detalhados
${result.topics.map((topic) => `### 📌 ${topic.title}
*O que foi abordado:* ${topic.description}
*Por que importa:* ${topic.importance}`).join("\n\n")}

---

## 💬 Frases Marcantes & Insights
${result.memorableQuotes.map((q) => `> "${q.quote}"
> *— ${q.context || "No vídeo"}*`).join("\n\n")}

---
*Gerado com VideoLens AI*`;

    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getUrlPlatform = (link: string) => {
    if (link.includes("youtube.com") || link.includes("youtu.be")) return "youtube";
    if (link.includes("instagram.com")) return "instagram";
    return null;
  };

  const platform = getUrlPlatform(url);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col justify-between">
      {/* Header Navigation */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-6 sm:px-10 h-20 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm shadow-indigo-600/10">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
          </div>
          <div>
            <span className="font-bold text-lg sm:text-xl tracking-tight text-slate-800 block">VideoLens AI</span>
            <span className="font-mono text-[9px] text-indigo-600 font-bold uppercase tracking-widest block -mt-1">
              Gemini 3.5 Engine
            </span>
          </div>
        </div>

        <nav className="flex gap-6 sm:gap-8 text-sm font-semibold text-slate-500">
          <button
            onClick={() => {
              setActiveTab("analyzer");
              setError(null);
            }}
            className={`transition-colors pb-1 border-b-2 ${
              activeTab === "analyzer"
                ? "text-indigo-600 border-indigo-600"
                : "border-transparent hover:text-slate-800"
            }`}
          >
            Analisador
          </button>
          <button
            onClick={() => {
              setActiveTab("history");
              setError(null);
            }}
            className={`transition-colors pb-1 border-b-2 ${
              activeTab === "history"
                ? "text-indigo-600 border-indigo-600"
                : "border-transparent hover:text-slate-800"
            }`}
          >
            Histórico ({history.length})
          </button>
        </nav>

        <div className="hidden md:block">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            AI Core Online
          </span>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col items-center px-4 sm:px-10 py-8 max-w-7xl w-full mx-auto">
        
        {/* Active Tab: HISTORY */}
        {activeTab === "history" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Histórico de Análises</h2>
              <p className="text-slate-500 text-sm">Visualize análises feitas anteriormente nesta sessão.</p>
            </div>

            {history.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-700 mb-1">Nenhum vídeo analisado ainda</h3>
                <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
                  Insira o link de um vídeo do YouTube ou do Instagram na aba Analisador para iniciar seu histórico de relatórios inteligentes.
                </p>
                <button
                  onClick={() => setActiveTab("analyzer")}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors"
                >
                  Ir para o Analisador
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => loadFromHistory(item)}
                    className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          item.url.includes("instagram")
                            ? "bg-pink-50 text-pink-700 ring-1 ring-pink-700/10"
                            : "bg-red-50 text-red-700 ring-1 ring-red-700/10"
                        }`}>
                          {item.url.includes("instagram") ? "Instagram" : "YouTube"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.timestamp}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-800 text-base line-clamp-2 group-hover:text-indigo-600 transition-colors mb-1.5">
                        {item.data.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mb-3">
                        Autor: {item.data.author}
                      </p>
                      <p className="text-xs text-slate-600 line-clamp-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                        &ldquo;{item.data.summary}&rdquo;
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                        Ver Análise Completa <ArrowRight className="h-3 w-3" />
                      </span>
                      <button
                        onClick={(e) => deleteFromHistory(item.id, e)}
                        className="text-xs font-semibold text-slate-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Active Tab: ANALYZER */}
        {activeTab === "analyzer" && (
          <div className="w-full flex flex-col items-center">
            
            {/* Input Section */}
            <section className="w-full max-w-3xl mb-10">
              <div className="text-center mb-6">
                <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
                  O que o vídeo está dizendo?
                </h1>
                <p className="text-slate-500 text-sm sm:text-base">
                  Insira um link do YouTube ou Instagram para gerar um relatório inteligente completo em segundos.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 p-2 bg-white border border-slate-200 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all">
                <div className="flex-1 flex items-center relative pl-3">
                  <div className="shrink-0 text-slate-400">
                    {platform === "youtube" ? (
                      <Youtube className="h-5 w-5 text-red-500" />
                    ) : platform === "instagram" ? (
                      <Instagram className="h-5 w-5 text-pink-500" />
                    ) : (
                      <Search className="h-5 w-5" />
                    )}
                  </div>
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=... ou Reels..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full px-3 py-3 outline-none text-slate-800 text-sm placeholder:text-slate-400 bg-transparent"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAnalyze();
                    }}
                  />
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-indigo-600 bg-slate-100/80 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-slate-200/50 transition-colors"
                  >
                    Colar
                  </button>
                </div>
                <button
                  onClick={() => handleAnalyze()}
                  disabled={loading || !url.trim()}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shrink-0 shadow-sm flex items-center justify-center gap-2"
                >
                  {loading ? "Processando..." : "Analisar Vídeo"} <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {error && (
                <div className="mt-4 flex items-start gap-2 text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-500" />
                  <span>{error}</span>
                </div>
              )}
            </section>

            <AnimatePresence mode="wait">
              {loading && (
                /* Loading State Widget */
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col items-center justify-center text-center"
                >
                  <div className="relative mb-6 h-16 w-16">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                    <div className="absolute inset-2 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                      <Sparkles className="h-6 w-6 animate-pulse" />
                    </div>
                  </div>

                  <h3 className="font-display text-lg font-bold text-slate-900 mb-1">
                    Análise Inteligente Ativa
                  </h3>
                  <p className="text-xs text-slate-400 mb-6 font-mono max-w-xs uppercase tracking-wider">
                    {LOADING_STAGES[currentStage]}
                  </p>

                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-4">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-500 rounded-full"
                      style={{ width: `${((currentStage + 1) / LOADING_STAGES.length) * 100}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-slate-400 font-medium">
                    <span className={currentStage >= 1 ? "text-indigo-600 font-semibold" : ""}>✓ Transcrição</span>
                    <span className={currentStage >= 3 ? "text-indigo-600 font-semibold" : ""}>• Tradução</span>
                    <span className={currentStage >= 5 ? "text-indigo-600 font-semibold" : ""}>• Extração de insights</span>
                  </div>
                </motion.div>
              )}

              {!loading && !result && (
                /* Landing Guide / Help cards */
                <motion.div
                  key="landing-guide"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full max-w-4xl"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                      <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-sm mb-4">
                        01
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm mb-1.5 uppercase tracking-wider">Cole o link</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Copie a URL de qualquer vídeo do YouTube, Shorts ou Reels do Instagram e cole no campo acima.
                      </p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                      <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-sm mb-4">
                        02
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm mb-1.5 uppercase tracking-wider">Processamento AI</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Nossa IA Gemini processará a transcrição de áudio, legenda e contexto para analisar o que está sendo dito.
                      </p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                      <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-sm mb-4">
                        03
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm mb-1.5 uppercase tracking-wider">Insights Ricos</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Obtenha um resumo executivo estruturado, tópicos minuto a minuto, frases marcantes e sentimentos do autor.
                      </p>
                    </div>
                  </div>

                  {/* Examples Quick trigger list */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Compass className="h-4 w-4 text-indigo-600" />
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Vídeos Recomendados para Teste</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      <button
                        onClick={() => runExample("https://www.youtube.com/watch?v=kYVsnPiaN2E")}
                        className="flex items-center justify-between text-left p-3.5 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-slate-50/50 transition-all text-xs group"
                      >
                        <div className="flex items-center gap-3">
                          <Youtube className="h-5 w-5 text-red-500 shrink-0" />
                          <div>
                            <span className="font-bold block text-slate-800 group-hover:text-indigo-600 transition-colors">O que é Inteligência Artificial?</span>
                            <span className="text-slate-400 font-mono text-[9px]">YouTube Vídeo</span>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => runExample("https://youtube.com/shorts/dQw4w9WgXcQ")}
                        className="flex items-center justify-between text-left p-3.5 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-slate-50/50 transition-all text-xs group"
                      >
                        <div className="flex items-center gap-3">
                          <Video className="h-5 w-5 text-indigo-500 shrink-0" />
                          <div>
                            <span className="font-bold block text-slate-800 group-hover:text-indigo-600 transition-colors">Tecnologia & Programação</span>
                            <span className="text-slate-400 font-mono text-[9px]">YouTube Shorts</span>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => runExample("https://www.instagram.com/reel/C8v9z_8AxKz/")}
                        className="flex items-center justify-between text-left p-3.5 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-slate-50/50 transition-all text-xs group"
                      >
                        <div className="flex items-center gap-3">
                          <Instagram className="h-5 w-5 text-pink-500 shrink-0" />
                          <div>
                            <span className="font-bold block text-slate-800 group-hover:text-indigo-600 transition-colors">Desenvolvimento Web</span>
                            <span className="text-slate-400 font-mono text-[9px]">Instagram Reels</span>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* RESULTS GRID - Structured side-by-side Layout based on Clean Minimalism instructions */}
              {!loading && result && (
                <motion.div
                  key="results-dashboard"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0"
                >
                  {isDemoFallback && (
                    <div className="lg:col-span-12 bg-amber-50 border border-amber-200/60 rounded-2xl p-4 flex items-start gap-3 text-amber-800 shadow-xs mb-2">
                      <Sparkles className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        {isInvalidKeyError ? (
                          <>
                            <p className="font-bold">⚠️ Erro na Chave de API do Gemini</p>
                            <p className="mt-1 text-amber-700 leading-relaxed">
                              A chave fornecida (que inicia com <code>{fallbackErrorMsg && fallbackErrorMsg.length > 5 ? fallbackErrorMsg.slice(0, 10) : "AQ."}</code>) retornou um erro de validação ou de permissão ao se conectar ao serviço do Google Gemini.
                            </p>
                            <p className="mt-1 text-amber-700 leading-relaxed font-semibold">
                              Por favor, verifique se a chave de API está correta, ativa, e com o faturamento regularizado no <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="underline text-indigo-700 hover:text-indigo-900">Google AI Studio</a>. Se houver alguma falha, os resultados continuarão em modo de demonstração.
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-bold">⚠️ Demonstração do Relatório Inteligente</p>
                            <p className="mt-0.5 text-amber-700 leading-relaxed">
                              {fallbackErrorMsg ? (
                                <span>A chamada ao Gemini retornou uma falha de cota ou rede ({fallbackErrorMsg}). </span>
                              ) : (
                                <span>A cota gratuita do Gemini API foi temporariamente excedida para este ambiente. </span>
                              )}
                              Exibimos uma <strong>Análise Inteligente Simulada</strong> em tempo real para que você possa visualizar o design minimalista, os tópicos interativos e o resumo completo sem interrupções.
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Left: Video Metadata Card */}
                  <div className="lg:col-span-4 flex flex-col gap-4">
                    {/* Media Thumbnail/Platform Card */}
                    <div className="aspect-video w-full bg-slate-100 rounded-xl overflow-hidden relative border border-slate-200 flex items-center justify-center text-slate-400">
                      {analyzedUrl.includes("instagram") ? (
                        <div className="flex flex-col items-center gap-2">
                          <Instagram className="w-12 h-12 text-pink-500/85" />
                          <span className="text-[10px] font-bold text-pink-600/80 tracking-widest font-mono uppercase">Instagram Reel</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Youtube className="w-12 h-12 text-red-500/85" />
                          <span className="text-[10px] font-bold text-red-600/80 tracking-widest font-mono uppercase">YouTube Video</span>
                        </div>
                      )}
                      <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 text-white text-xs rounded font-mono">
                        Link Ativo
                      </div>
                    </div>

                    {/* Meta Card */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                      <h3 className="font-bold text-slate-800 text-lg mb-1">{result.title}</h3>
                      <p className="text-xs text-slate-400 mb-4 uppercase tracking-widest font-semibold">
                        Postado por: <span className="text-indigo-600">{result.author}</span>
                      </p>

                      <div className="border-t border-slate-100 pt-4 space-y-3.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500 text-xs">Análise de Sentimento:</span>
                          <span className="text-xs font-bold text-emerald-600 px-2 py-0.5 bg-emerald-50 rounded-md">
                            {result.sentiment || "Inspirador / Educativo"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500 text-xs">Fonte dos Dados:</span>
                          <span className="text-xs font-semibold text-slate-600">
                            {resultSource}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions and Reset */}
                    <div className="mt-2 space-y-2.5">
                      <button
                        onClick={handleCopyReport}
                        className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4 text-emerald-400" /> Relatório Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" /> Copiar em Markdown
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setResult(null);
                          setUrl("");
                        }}
                        className="w-full py-3 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-50/25 transition-all flex items-center justify-center gap-2"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Analisar outro vídeo
                      </button>
                    </div>
                  </div>

                  {/* Right: AI Analysis & Summary Cards */}
                  <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    
                    {/* Header Banner */}
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> Relatório Inteligente
                      </span>
                      <a
                        href={analyzedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded transition-colors flex items-center gap-1"
                      >
                        Abrir Mídia <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    {/* Scrollable insights panel */}
                    <div className="p-6 sm:p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                      
                      {/* Executive Summary */}
                      <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-2">Resumo Executivo</h2>
                        <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                          {result.summary}
                        </p>
                      </div>

                      {/* Key Insights (Bullet style with custom bullet points) */}
                      <div className="space-y-4 pt-4 border-t border-slate-100">
                        <h2 className="text-lg font-bold text-slate-800">Principais Conclusões e Lições</h2>
                        <ul className="space-y-3">
                          {result.keyTakeaways.map((takeaway, idx) => (
                            <li key={idx} className="flex gap-3">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0"></span>
                              <p className="text-slate-600 text-sm leading-relaxed">
                                {takeaway}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Detailed Topic Breakdown (Interactive accordion) */}
                      <div className="space-y-3 pt-4 border-t border-slate-100">
                        <h2 className="text-lg font-bold text-slate-800 mb-1">Tópicos Abordados</h2>
                        <p className="text-xs text-slate-400 mb-3">Clique nos títulos para ler o detalhamento de cada seção do vídeo.</p>

                        <div className="space-y-2.5">
                          {result.topics.map((topic, idx) => {
                            const isExpanded = expandedTopic === idx;
                            return (
                              <div
                                key={idx}
                                className={`border rounded-xl transition-all ${
                                  isExpanded
                                    ? "border-indigo-200 bg-indigo-50/5"
                                    : "border-slate-100 hover:border-slate-200"
                                }`}
                              >
                                <button
                                  onClick={() => setExpandedTopic(isExpanded ? null : idx)}
                                  className="w-full text-left p-3.5 flex items-center justify-between gap-3 text-sm font-semibold text-slate-700"
                                >
                                  <span className="truncate">{topic.title}</span>
                                  <ChevronRight className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${
                                    isExpanded ? "rotate-90 text-indigo-600" : ""
                                  }`} />
                                </button>
                                {isExpanded && (
                                  <div className="px-3.5 pb-4 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100/50 space-y-2">
                                    <p>{topic.description}</p>
                                    {topic.importance && (
                                      <p className="text-[11px] text-indigo-600 font-medium bg-indigo-50/40 p-2 rounded-lg border border-indigo-100/30">
                                        💡 <strong>Importância:</strong> {topic.importance}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Quotes and Highlights */}
                      {result.memorableQuotes && result.memorableQuotes.length > 0 && (
                        <div className="pt-4 border-t border-slate-100">
                          <h2 className="text-lg font-bold text-slate-800 mb-4">Citações e Momentos Marcantes</h2>
                          <div className="grid grid-cols-1 gap-4">
                            {result.memorableQuotes.map((q, idx) => (
                              <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-150 relative">
                                <Quote className="absolute top-3 right-4 h-8 w-8 text-slate-200/60 pointer-events-none" />
                                <p className="text-slate-700 text-sm italic pr-6 leading-relaxed mb-2">
                                  &ldquo;{q.quote}&rdquo;
                                </p>
                                {q.context && (
                                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                    — {q.context}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tag list pills */}
                      <div className="pt-4 border-t border-slate-100">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Tópicos e Tags</h2>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                            #{resultSource === "Transcrição Direta" ? "Transcrição" : "AnáliseBusca"}
                          </span>
                          <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                            #{analyzedUrl.includes("instagram") ? "Reels" : "YouTube"}
                          </span>
                          {result.sentiment && (
                            <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                              #{result.sentiment.replace(/\s+/g, "")}
                            </span>
                          )}
                          <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                            #VideoLensAI
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>

          </div>
        )}
      </main>

      {/* Footer Navigation bar with status metrics */}
      <footer className="px-6 sm:px-10 h-14 flex flex-col sm:flex-row items-center justify-between text-[10px] uppercase tracking-widest text-slate-400 border-t border-slate-200 bg-white mt-12 gap-2 py-3 sm:py-0">
        <span>© {new Date().getFullYear()} VideoLens Intelligence Systems</span>
        <div className="flex gap-4">
          <span>Status: Pronto para Análise</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            AI Core Online
          </span>
        </div>
      </footer>
    </div>
  );
}
