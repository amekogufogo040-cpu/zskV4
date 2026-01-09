
import React, { useState, useRef } from 'react';
import { analyzeDocument, generateCardHTML } from './services/geminiService';
import { DesignBlueprint, WorkflowState, GeneratedCard } from './types';
import * as htmlToImage from 'html-to-image';

const STYLES = [
  { id: 'Auto', name: '智能匹配', icon: 'fa-wand-sparkles', desc: 'AI 自动分析' },
  { id: 'Academic', name: '学术典雅', icon: 'fa-book-open', desc: '严谨、稳重' },
  { id: 'Modern', name: '现代知识', icon: 'fa-shapes', desc: '极简、有力' },
  { id: 'Tech', name: '科技简约', icon: 'fa-microchip', desc: '硬核、前卫' },
  { id: 'Handwritten', name: '手绘笔记', icon: 'fa-pen-fancy', desc: '温度、灵动' },
  { id: 'Business', name: '商务专业', icon: 'fa-briefcase', desc: '高效、克制' }
];

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('Auto');
  const [workflow, setWorkflow] = useState<WorkflowState>('IDLE');
  const [blueprint, setBlueprint] = useState<DesignBlueprint | null>(null);
  const [currentCard, setCurrentCard] = useState<GeneratedCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const formatErrorMessage = (err: any) => {
    console.error("Detailed Error:", err);
    if (err?.message?.includes('API_KEY')) return err.message;
    
    try {
      const errorObj = typeof err === 'string' ? JSON.parse(err) : err;
      if (errorObj?.error?.message?.includes('API key not valid')) {
        return 'API Key 无效。请确认已在 Vercel 环境变量中正确设置 API_KEY，且该 Key 适用于 sg.uiuiapi.com。';
      }
      return errorObj?.error?.message || errorObj?.message || '生成请求被拒绝，请检查网络或配置。';
    } catch {
      return err?.message || '发生未知错误，请重试。';
    }
  };

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setWorkflow('ANALYZING');
    setError(null);
    try {
      const result = await analyzeDocument(inputText, selectedStyle);
      setBlueprint(result);
      setWorkflow('BLUEPRINT_READY');
    } catch (err: any) {
      setError(formatErrorMessage(err));
      setWorkflow('IDLE');
    }
  };

  const handleGenerateCard = async (index: number) => {
    if (!blueprint) return;
    setWorkflow('GENERATING_CARD');
    setError(null);
    try {
      const html = await generateCardHTML(blueprint, index);
      setCurrentCard({ index, html, title: blueprint.cardOutlines[index].title });
      setWorkflow('CARD_READY');
    } catch (err: any) {
      setError(formatErrorMessage(err));
      setWorkflow('BLUEPRINT_READY');
    }
  };

  const handleDownloadImage = async () => {
    if (!currentCard) return;
    setIsDownloading(true);
    try {
      // 创建一个隐藏容器来渲染 HTML，以便捕获图片
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '700px';
      container.style.height = '1160px';
      container.innerHTML = currentCard.html;
      document.body.appendChild(container);

      // 等待图片和字体加载的微小延迟
      await new Promise(resolve => setTimeout(resolve, 500));

      const dataUrl = await htmlToImage.toPng(container, {
        width: 700,
        height: 1160,
        pixelRatio: 2, // 提高清晰度
      });

      const link = document.createElement('a');
      link.download = `知识卡-${currentCard.title || currentCard.index + 1}.png`;
      link.href = dataUrl;
      link.click();

      document.body.removeChild(container);
    } catch (err) {
      console.error('下载图片失败:', err);
      alert('下载图片失败，请尝试复制代码手动保存。');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleNext = () => {
    if (blueprint && currentCard && currentCard.index < blueprint.cardOutlines.length - 1) {
      handleGenerateCard(currentCard.index + 1);
    }
  };

  const handleReset = () => {
    setWorkflow('IDLE');
    setBlueprint(null);
    setCurrentCard(null);
    setInputText('');
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      <aside className="w-full md:w-[400px] bg-white border-r border-slate-200 flex flex-col h-screen overflow-y-auto shrink-0 z-20">
        <header className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <i className="fas fa-layer-group text-sm"></i>
            </div>
            <h1 className="font-bold text-slate-800 tracking-tight">AI 知识卡设计师</h1>
          </div>
          {workflow !== 'IDLE' && <button onClick={handleReset} className="text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-wider">重置</button>}
        </header>

        <div className="p-6 space-y-6 flex-1">
          {workflow === 'IDLE' || workflow === 'ANALYZING' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map((s) => (
                  <button key={s.id} onClick={() => setSelectedStyle(s.id)} className={`p-3 rounded-xl border text-left transition-all ${selectedStyle === s.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'}`}>
                    <div className="text-xs font-bold mb-1 flex items-center gap-2">
                      <i className={`fas ${s.icon} ${selectedStyle === s.id ? 'text-white' : 'text-indigo-500'}`}></i>
                      {s.name}
                    </div>
                    <div className={`text-[9px] font-medium leading-tight ${selectedStyle === s.id ? 'text-indigo-100' : 'text-slate-400'}`}>{s.desc}</div>
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">原始文本内容</label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="在此输入您的学习笔记、文章或灵感..."
                  className="w-full h-72 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none resize-none text-sm leading-relaxed"
                />
              </div>
              <button
                disabled={workflow === 'ANALYZING' || !inputText.trim()}
                onClick={handleAnalyze}
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-slate-800 disabled:bg-slate-300 transition-all flex items-center justify-center gap-3"
              >
                {workflow === 'ANALYZING' ? <><i className="fas fa-spinner fa-spin"></i>AI 分析中...</> : <><i className="fas fa-wand-magic-sparkles"></i>生成设计蓝图</>}
              </button>
              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs border border-red-100 flex items-start gap-3 leading-relaxed shadow-sm">
                  <i className="fas fa-exclamation-circle mt-1"></i>
                  <span>{error}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-500">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-4">卡片序列 ({blueprint?.cardOutlines.length})</h3>
              {blueprint && blueprint.cardOutlines.map((card, idx) => (
                <button
                  key={idx}
                  onClick={() => handleGenerateCard(idx)}
                  className={`w-full text-left p-4 rounded-xl border flex items-center gap-4 transition-all group ${currentCard?.index === idx ? 'bg-slate-900 text-white border-slate-900 shadow-lg translate-x-1' : 'bg-white text-slate-600 border-slate-100 hover:border-indigo-200 shadow-sm'}`}
                >
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${currentCard?.index === idx ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-400'}`}>{idx + 1}</span>
                  <span className="text-xs font-bold truncate flex-1">{idx === 0 && <span className="text-indigo-500 mr-1">[封面]</span>}{card.title}</span>
                  <i className={`fas fa-chevron-right text-[10px] opacity-0 transition-opacity ${currentCard?.index === idx ? '' : 'group-hover:opacity-100'}`}></i>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-12 flex items-center justify-center bg-[#F1F5F9] relative overflow-hidden">
        {currentCard ? (
          <div className="flex flex-col items-center gap-8 w-full animate-in zoom-in-95 duration-500">
            <div className="flex flex-wrap justify-center gap-4 bg-white p-2.5 rounded-2xl shadow-xl shadow-slate-200 border border-slate-200">
              <button 
                onClick={() => {navigator.clipboard.writeText(currentCard.html); alert('代码已复制！')}} 
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-colors"
              >
                <i className="fas fa-code text-indigo-500"></i>
                复制代码
              </button>
              
              <button 
                onClick={handleDownloadImage}
                disabled={isDownloading}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <i className={`fas ${isDownloading ? 'fa-spinner fa-spin' : 'fa-image'} text-emerald-500`}></i>
                {isDownloading ? '正在导出...' : '导出图片'}
              </button>

              <div className="hidden sm:block w-px h-6 bg-slate-100 my-auto"></div>
              
              <button 
                onClick={handleNext} 
                disabled={currentCard.index === (blueprint?.cardOutlines.length || 0) - 1} 
                className="px-8 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"
              >
                下一张卡片
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
            
            <div className="bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] rounded-2xl overflow-hidden origin-top scale-[0.45] sm:scale-[0.55] lg:scale-[0.7] xl:scale-[0.8] transition-transform duration-700">
              <iframe 
                ref={iframeRef}
                title="preview" 
                className="w-[700px] h-[1160px] border-none" 
                srcDoc={currentCard.html} 
              />
            </div>
          </div>
        ) : workflow === 'GENERATING_CARD' ? (
           <div className="text-center space-y-4 animate-in fade-in duration-300">
             <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
             <p className="text-slate-400 text-sm font-medium">AI 正在进行像素级排版设计...</p>
           </div>
        ) : workflow === 'BLUEPRINT_READY' ? (
          <div className="text-center p-12 bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 space-y-6 max-w-sm animate-in zoom-in-95 duration-500 border border-slate-100">
            <div className="w-20 h-20 bg-green-50 text-green-500 rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-inner shadow-green-100/50">
              <i className="fas fa-check-double"></i>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-800">蓝图构建成功</h2>
              <p className="text-slate-400 text-sm leading-relaxed">文档已智能解构为 <strong>{blueprint?.cardOutlines.length}</strong> 张模块化卡片。现在可以开始生成第一张封面。</p>
            </div>
            <button onClick={() => handleGenerateCard(0)} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-slate-800 transition-all">
              生成封面卡片
            </button>
          </div>
        ) : (
          <div className="text-center space-y-6 opacity-40 select-none">
            <div className="w-24 h-24 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto text-slate-200 text-4xl">
              <i className="fas fa-wand-magic"></i>
            </div>
            <div className="space-y-1">
              <p className="text-lg font-bold text-slate-400">尚未开始设计</p>
              <p className="text-xs text-slate-300 font-medium">在左侧输入内容并点击“构建设计蓝图”</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
