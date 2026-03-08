/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Sparkles, 
  Dog, 
  User, 
  MessageSquare, 
  Image as ImageIcon, 
  HelpCircle, 
  Send,
  Loader2,
  CheckCircle2,
  Upload,
  X,
  FileText,
  Key,
  Copy,
  ExternalLink
} from 'lucide-react';
import { generateEduToon, generateComicImage, EduToonResult } from './services/geminiService';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function App() {
  const [sourceText, setSourceText] = useState('');
  const [file, setFile] = useState<{ data: string; mimeType: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [result, setResult] = useState<EduToonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showQuizAnswer, setShowQuizAnswer] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [manualKeyInput, setManualKeyInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const checkApiKey = async () => {
      const manualKey = localStorage.getItem('manual_api_key');
      if (manualKey) {
        setHasApiKey(true);
        return;
      }

      if (window.aistudio) {
        try {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(hasKey);
        } catch (e) {
          console.error("Error checking API key:", e);
        }
      }
    };
    checkApiKey();
  }, []);

  const handleOpenKeyDialog = async () => {
    if (window.aistudio) {
      try {
        // Try platform dialog first
        await window.aistudio.openSelectKey();
        // Check if key was actually selected
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (hasKey) {
          setHasApiKey(true);
          localStorage.removeItem('manual_api_key'); // Clear manual key if platform key is used
          return;
        }
      } catch (err) {
        console.error("Platform key dialog failed:", err);
      }
    }
    // Fallback to custom modal
    setIsKeyModalOpen(true);
  };

  const handleSaveManualKey = () => {
    if (manualKeyInput.trim()) {
      localStorage.setItem('manual_api_key', manualKeyInput.trim());
      setHasApiKey(true);
      setIsKeyModalOpen(false);
      setManualKeyInput('');
    }
  };

  const handleClearKey = () => {
    localStorage.removeItem('manual_api_key');
    setHasApiKey(false);
    setIsKeyModalOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setFile({
        data: base64String,
        mimeType: selectedFile.type,
        name: selectedFile.name
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleGenerateImage = async (prompt: string) => {
    setImageLoading(true);
    setImageError(null);
    try {
      const imageUrl = await generateComicImage(prompt);
      setResult(prev => prev ? { ...prev, imageUrl } : null);
    } catch (imgErr: any) {
      console.error("Image generation failed:", imgErr);
      setImageError(imgErr.message || "이미지를 그리는 데 실패했습니다.");
    } finally {
      setImageLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!sourceText.trim() && !file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setShowQuizAnswer(false);
    try {
      const data = await generateEduToon(sourceText, file || undefined);
      setResult(data);
      
      // Start generating image
      await handleGenerateImage(data.imagePrompt);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '에듀툰을 만드는 중에 문제가 생겼어요. 다시 시도해볼까요?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#4A4A40] font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E5DF] py-6 px-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#5A5A40] p-2 rounded-2xl">
              <BookOpen className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#1A1A1A]">초등 문법 툰 생성기</h1>
              <p className="text-xs text-[#8A8A7A]">파일 분석 전문 멀티모달 에듀툰</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-[#5A5A40]">
              <span className="bg-[#F5F5F0] px-3 py-1 rounded-full border border-[#E5E5DF]">박꽝 & 알지</span>
            </div>
            <button
              onClick={handleOpenKeyDialog}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-xs font-bold ${
                hasApiKey 
                ? 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]' 
                : 'bg-[#FFF9E6] text-[#856404] border-[#FFE082] hover:bg-[#FFF2C2]'
              }`}
              title="API 키 설정"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{hasApiKey ? 'API 키 연결됨' : 'API 키 추가'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        {!hasApiKey && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-white rounded-[32px] border-2 border-dashed border-[#E5E5DF] flex flex-col items-center text-center space-y-4"
          >
            <div className="bg-[#FFF9E6] p-3 rounded-2xl">
              <Sparkles className="w-6 h-6 text-[#FFB300]" />
            </div>
            <div>
              <h3 className="font-bold text-[#1A1A1A]">더 정교한 만화 이미지가 필요하신가요?</h3>
              <p className="text-sm text-[#8A8A7A] mt-1">
                대사가 정확하게 적힌 고화질 이미지를 그리려면 API 키 설정이 필요합니다.
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleOpenKeyDialog}
                className="px-8 py-3 bg-[#5A5A40] hover:bg-[#4A4A30] text-white font-bold rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                API 키 설정하고 고화질로 그리기
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.origin);
                  alert('앱 URL이 복사되었습니다! 구글 클라우드 콘솔 설정 시 사용하세요.');
                }}
                className="flex items-center gap-2 text-xs text-[#8A8A7A] hover:text-[#5A5A40] transition-colors"
              >
                <Copy className="w-3 h-3" />
                앱 URL 복사하기 (설정용)
              </button>
            </div>
            <p className="text-[10px] text-[#A58B3D]">
              * 유료 프로젝트의 API 키가 필요하며, <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline">결제 설정</a>이 완료되어야 합니다.
            </p>
          </motion.div>
        )}

        {/* Input Section */}
        <section className="bg-white rounded-[32px] p-6 shadow-sm border border-[#E5E5DF] mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-[#5A5A40]" />
            <h2 className="font-bold text-lg">문법 소스 (텍스트 또는 파일)</h2>
          </div>
          
          <div className="space-y-4">
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="문법 내용을 입력하거나 아래에서 파일을 업로드하세요."
              className="w-full h-32 p-4 rounded-2xl bg-[#F9F9F7] border border-[#E5E5DF] focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all resize-none"
            />

            {/* File Upload Area */}
            <div className="flex flex-wrap gap-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,application/pdf,text/plain"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-[#F5F5F0] hover:bg-[#E5E5DF] text-[#5A5A40] font-bold rounded-xl border border-[#E5E5DF] transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>파일 업로드 (이미지/PDF)</span>
              </button>

              {file && (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-xl border border-blue-100">
                  {file.mimeType.startsWith('image/') ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  <span className="max-w-[150px] truncate">{file.name}</span>
                  <button onClick={() => setFile(null)} className="hover:text-blue-800">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || (!sourceText.trim() && !file)}
            className="mt-6 w-full bg-[#5A5A40] hover:bg-[#4A4A30] disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#5A5A40]/10 active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>파일 분석 및 에듀툰 생성 중...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>에듀툰 만들기!</span>
              </>
            )}
          </button>
        </section>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl mb-8 text-center font-medium"
          >
            {error}
          </motion.div>
        )}

        {/* Result Section */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-8"
            >
              {/* Title & Summary */}
              <div className="text-center space-y-3">
                <h2 className="text-3xl font-black text-[#1A1A1A] tracking-tight">
                  {result.title}
                </h2>
                <div className="inline-block bg-[#F5F5F0] px-6 py-3 rounded-2xl border border-[#E5E5DF]">
                  <p className="text-[#5A5A40] font-medium leading-relaxed italic">
                    " {result.summary} "
                  </p>
                </div>
              </div>

              {/* Generated Comic Image */}
              <div className="bg-white rounded-[32px] p-4 border border-[#E5E5DF] shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 mb-4 px-4">
                  <ImageIcon className="w-5 h-5 text-[#5A5A40]" />
                  <h3 className="font-bold text-lg text-[#1A1A1A]">오늘의 4컷 만화</h3>
                </div>
                
                <div className="aspect-square w-full bg-[#F9F9F7] rounded-2xl flex items-center justify-center relative overflow-hidden border border-[#E5E5DF]">
                  {imageLoading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-10 h-10 animate-spin text-[#5A5A40]" />
                      <p className="text-sm font-bold text-[#8A8A7A]">만화를 그리는 중이에요...</p>
                    </div>
                  ) : result.imageUrl ? (
                    <img 
                      src={result.imageUrl} 
                      alt="Generated Comic" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 p-6 text-center">
                      <p className="text-sm text-[#8A8A7A] mb-2">
                        {imageError || "이미지를 불러오지 못했습니다."}
                      </p>
                      <button 
                        onClick={() => handleGenerateImage(result.imagePrompt)}
                        className="px-6 py-2 bg-[#5A5A40] hover:bg-[#4A4A30] text-white font-bold rounded-xl transition-all text-xs shadow-sm"
                      >
                        이미지 다시 그리기
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 4-Panel Comic Scenario (Hidden or Collapsible if needed, but keeping for context) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[result.scenario.panel1, result.scenario.panel2, result.scenario.panel3, result.scenario.panel4].map((panel, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white rounded-[32px] p-6 border border-[#E5E5DF] shadow-sm flex flex-col h-full relative overflow-hidden"
                  >
                    <div className="absolute top-4 right-4 bg-[#F5F5F0] w-8 h-8 rounded-full flex items-center justify-center font-bold text-[#5A5A40] border border-[#E5E5DF]">
                      {idx + 1}
                    </div>
                    
                    <div className="mb-4 flex-1">
                      <div className="flex items-center gap-2 mb-2 text-[#8A8A7A] text-xs font-bold uppercase tracking-wider">
                        <ImageIcon className="w-3 h-3" />
                        <span>장면 묘사</span>
                      </div>
                      <p className="text-sm leading-relaxed text-[#4A4A40]">
                        {panel.description}
                      </p>
                    </div>

                    <div className="bg-[#F9F9F7] p-4 rounded-2xl border-l-4 border-[#5A5A40]">
                      <div className="flex items-center gap-2 mb-1 text-[#5A5A40] text-xs font-bold uppercase tracking-wider">
                        <MessageSquare className="w-3 h-3" />
                        <span>대사</span>
                      </div>
                      <p className="font-medium text-[#1A1A1A]">
                        {panel.dialogue}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Quiz Section */}
              <div className="bg-[#E6E6DF] rounded-[32px] p-8 border border-[#D5D5CF]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-[#5A5A40] p-2 rounded-xl">
                    <HelpCircle className="text-white w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-xl text-[#1A1A1A]">오늘의 1초 퀴즈!</h3>
                </div>
                
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#D5D5CF]">
                  <p className="text-lg font-bold text-[#1A1A1A] mb-6">
                    {result.quiz.question}
                  </p>
                  
                  {!showQuizAnswer ? (
                    <button
                      onClick={() => setShowQuizAnswer(true)}
                      className="w-full py-3 border-2 border-dashed border-[#5A5A40] text-[#5A5A40] font-bold rounded-xl hover:bg-[#5A5A40]/5 transition-colors"
                    >
                      정답 확인하기
                    </button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-xl text-green-700 font-bold"
                    >
                      <CheckCircle2 className="w-6 h-6" />
                      <span>{result.quiz.answer}</span>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Character Intro */}
              <div className="flex flex-wrap gap-4 justify-center pt-8">
                <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-full border border-[#E5E5DF] shadow-sm">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <User className="text-orange-500 w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#8A8A7A]">주인공</p>
                    <p className="font-bold text-[#1A1A1A]">박꽝</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-full border border-[#E5E5DF] shadow-sm">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Dog className="text-blue-500 w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#8A8A7A]">조력자</p>
                    <p className="font-bold text-[#1A1A1A]">알지</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!result && !loading && (
          <div className="text-center py-20 opacity-40">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-[#5A5A40]" />
            <p className="font-medium">문법 소스를 입력하거나 파일을 업로드해보세요!</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 text-center text-[#8A8A7A] text-sm pb-10">
        <p>© 2024 초등 문법 툰 생성기 (멀티모달)</p>
      </footer>

      {/* API Key Modal */}
      <AnimatePresence>
        {isKeyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-[#E5E5DF]"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="bg-[#FFF9E6] p-3 rounded-2xl">
                  <Key className="w-6 h-6 text-[#856404]" />
                </div>
                <button 
                  onClick={() => setIsKeyModalOpen(false)}
                  className="p-2 hover:bg-[#F5F5F0] rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-[#8A8A7A]" />
                </button>
              </div>

              <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">API 키 직접 입력</h3>
              <p className="text-sm text-[#8A8A7A] mb-6">
                자동 선택 창이 작동하지 않을 경우, 아래에 Gemini API 키를 직접 입력해 주세요. 
                입력된 키는 브라우저에만 안전하게 저장됩니다.
              </p>

              <div className="space-y-4">
                <input
                  type="password"
                  value={manualKeyInput}
                  onChange={(e) => setManualKeyInput(e.target.value)}
                  placeholder="AI_Studio_API_Key_Here..."
                  className="w-full p-4 rounded-2xl bg-[#F9F9F7] border border-[#E5E5DF] focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all"
                />
                
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveManualKey}
                    disabled={!manualKeyInput.trim()}
                    className="flex-1 bg-[#5A5A40] hover:bg-[#4A4A30] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all"
                  >
                    저장하기
                  </button>
                  {hasApiKey && (
                    <button
                      onClick={handleClearKey}
                      className="px-4 py-3 bg-red-50 text-red-600 font-bold rounded-xl border border-red-100 hover:bg-red-100 transition-all"
                    >
                      초기화
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-6 border-top border-[#F5F5F0]">
                <p className="text-[10px] text-[#A58B3D] leading-relaxed">
                  * API 키는 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline font-bold">Google AI Studio</a>에서 발급받을 수 있습니다.
                  <br />* 유료 프로젝트(Paid Project)의 키여야 고화질 이미지 생성이 가능합니다.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

