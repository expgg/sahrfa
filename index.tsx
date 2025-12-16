import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import { Subject, AIResponse, ChatMessage, Question, CategoryData } from './types';
import { AVAILABLE_SUBJECTS, DEFAULT_SUBJECT } from './subjects/registry';

// ==========================================
//               GEMINI SERVICE
// ==========================================

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_NAME = "gemini-2.5-flash";

// Base instruction for persona and tone
const BASE_INSTRUCTION = `
    You are "Coach Rifat", a friendly and intelligent Bengali private tutor.
    
    GUIDELINES:
    1. LANGUAGE: You MUST communicate primarily in Bengali (Bangla).
    2. TONE: Be encouraging, slightly informal (use 'tumi'). Act like a helpful senior brother (Bhaiya).
    3. NO TECHNICAL JARGON: Do not give textbook definitions. Explain things using DAILY LIFE EXAMPLES (e.g., Traffic Jams, Rickshaws, Cooking, Farming, Cricket).
    4. GOAL: Make the student UNDERSTAND the concept intuitively.
`;

const askExamCoach = async (question: string, context: string): Promise<AIResponse> => {
    const prompt = `
        Context: ${context}
        Question: ${question}
        
        Provide a structured breakdown for exam preparation in Bengali.
        REMEMBER: NO ROBOTIC TEXTBOOK LANGUAGE. USE REAL LIFE ANALOGIES.
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                // Specific instruction for JSON structure
                systemInstruction: BASE_INSTRUCTION + "\nFORMAT: Output valid JSON only. The content VALUES must be in Bengali.",
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        concept: {
                            type: Type.STRING,
                            description: "A simple, real-life analogy explaining the concept in Bengali (No technical jargon)."
                        },
                        shortAnswer: {
                            type: Type.STRING,
                            description: "A functional, formal, and precise one-sentence answer that directly answers the question. Do NOT use rhymes or mnemonics. Just the direct answer."
                        },
                        keywords: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "3 to 5 key terms (English/Bengali) needed for the exam."
                        }
                    },
                    required: ["concept", "shortAnswer", "keywords"]
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("Empty response from AI");
        return JSON.parse(text) as AIResponse;
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
};

const askCoachCustom = async (question: string, context: string, userQuery: string): Promise<string> => {
    const prompt = `
        Context of the original problem: ${context}
        Original Question: ${question}
        
        Student's Follow-up Question: "${userQuery}"
        
        Answer the student's question in Bengali using simple, real-life examples.
        
        LENGTH CONSTRAINT: Provide a MEDIUM length answer (3-5 sentences). It should be detailed enough to understand but not an essay. 
        Only provide a long answer if the student explicitly asks for details.
        
        IMPORTANT: Output PLAIN TEXT only. Do NOT output JSON. Do NOT use markdown code blocks unless writing code.
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                systemInstruction: BASE_INSTRUCTION,
            }
        });

        return response.text || "দুঃখিত, আমি এখন উত্তর দিতে পারছি না। আবার চেষ্টা করো।";
    } catch (error) {
        console.error("Gemini Chat Error:", error);
        throw error;
    }
};

const askGlobalCoach = async (history: ChatMessage[], newMessage: string): Promise<string> => {
    const historyText = history.slice(-6).map(m => `${m.sender === 'user' ? 'Student' : 'Coach Rifat'}: ${m.text}`).join('\n');
    
    const prompt = `
        Conversation History:
        ${historyText}
        
        Student: "${newMessage}"
        
        INSTRUCTIONS:
        1. CHECK TOPIC: Is this related to studies, exams, career, technology, or motivation?
        2. IF NO (Gossip/Random): You MUST strictly say (in Bengali): "আমি পড়ালেখার কোচ, গল্পের জন্য নই। পড়তে বসো।"
        3. IF YES: Answer helpfully in Bengali using "tumi". Use analogies.
        
        LENGTH CONSTRAINT: Provide a MEDIUM length answer (3-5 sentences). Concise but complete. Do not write an essay unless asked.
        
        IMPORTANT: Output PLAIN TEXT only. Do NOT output JSON.
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                systemInstruction: BASE_INSTRUCTION,
            }
        });

        return response.text || "সমস্যা হচ্ছে, পরে চেষ্টা করো।";
    } catch (error) {
        console.error("Gemini Global Chat Error:", error);
        throw error;
    }
};

// ==========================================
//               COMPONENTS
// ==========================================

// --- Toast ---
const Toast: React.FC<{ message: string | null; onClose: () => void }> = ({ message, onClose }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (message) {
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
                setTimeout(onClose, 300); // Wait for fade out animation
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [message, onClose]);

    return (
        <div 
            className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[35] transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${
                visible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
            }`}
        >
            <div className="glass-panel px-8 py-4 rounded-2xl text-white font-medium shadow-[0_0_40px_rgba(100,210,255,0.2)] flex items-center justify-center gap-3 border border-cyber-cyan/30 min-w-[320px] max-w-[90vw]">
                <span className="text-cyber-success text-xl">✅</span>
                <span className="text-center tracking-wide">{message}</span>
            </div>
        </div>
    );
};

// --- QuestionItem ---
const QuestionItem: React.FC<{ question: Question; onAskAI: (question: string, context: string) => void; onCopy: (text: string) => void; }> = ({ question, onAskAI, onCopy }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Subtle Tier Indicator Color
    const getTierColor = (tier: string) => {
        switch (tier) {
            case 'mythic': return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]';
            case 'legendary': return 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]';
            case 'epic': return 'bg-purple-500 shadow-[0_0_8px_rgba(191,90,242,0.6)]';
            default: return 'bg-gray-600';
        }
    };

    return (
        <div 
            className={`
                border-b border-white/5 transition-all duration-300
                ${isOpen ? 'bg-white/[0.03]' : 'hover:bg-white/[0.01]'}
            `}
        >
            {/* Header - Click to Expand */}
            <div 
                className="py-5 px-5 flex items-start gap-4 cursor-pointer select-none group"
                onClick={() => setIsOpen(!isOpen)}
            >
                {/* Status Dot */}
                <div className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-500 ${getTierColor(question.tier)} ${isOpen ? 'scale-125' : 'scale-100 group-hover:scale-110'}`} />

                <div className="flex-1 min-w-0">
                    <h3 className={`text-[17px] leading-relaxed transition-colors duration-300 ${isOpen ? 'text-white font-medium' : 'text-gray-300 font-normal group-hover:text-gray-100'}`}>
                        {question.text}
                    </h3>
                </div>

                {/* Chevron */}
                <div className={`text-gray-600 transition-transform duration-300 mt-1 ${isOpen ? 'rotate-180 text-cyber-cyan' : ''}`}>
                     <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
            </div>

            {/* Content Area - Slides Open */}
            <div 
                className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
            >
                <div className="overflow-hidden">
                    <div className="px-5 pb-8 space-y-6">
                        
                        {/* Main Answer - Big, Readable Text */}
                        <div className="prose prose-invert max-w-none">
                            <p className="text-lg md:text-xl text-gray-100 leading-relaxed font-light tracking-wide border-l-2 border-cyber-cyan/30 pl-4">
                                {question.answer}
                            </p>
                        </div>

                        {/* Extended Context - Clean Layout */}
                        <div className="relative pt-2">
                            <h4 className="text-xs font-bold text-cyber-cyan/70 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                <span className="w-4 h-px bg-cyber-cyan/50"></span>
                                বিস্তারিত
                            </h4>
                            <p className="text-base text-gray-400 leading-8">
                                {question.extendedAnswer}
                            </p>
                        </div>

                        {/* Actions Toolbar */}
                        <div className="flex flex-wrap gap-3 pt-4 border-t border-white/5">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onAskAI(question.text, question.answer); }}
                                className="flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-lg bg-cyber-blue/10 hover:bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/20 hover:border-cyber-blue/40 transition-all active:scale-95 group/btn"
                            >
                                <div className="w-6 h-6 rounded-md bg-cyber-blue/20 flex items-center justify-center group-hover/btn:bg-cyber-blue/30 transition-colors">
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z"></path><path d="M12 12 2.1 12a10.1 10.1 0 0 0 16.2 5.5"></path><circle cx="12" cy="12" r="10"></circle></svg>
                                </div>
                                <span className="text-xs font-bold tracking-wide">COACH RIFAT</span>
                            </button>

                            <button 
                                onClick={(e) => { e.stopPropagation(); onCopy(`Q: ${question.text}\n\nA: ${question.answer}\n\n${question.extendedAnswer}`); }}
                                className="flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 hover:border-white/20 transition-all active:scale-95"
                            >
                                <svg className="w-4 h-4 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                <span className="text-xs font-bold tracking-wide">COPY</span>
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Dock ---
const Dock: React.FC<{ onSave: () => void; onFocus: () => void; onAI: () => void; onTop: () => void }> = ({ onSave, onFocus, onAI, onTop }) => {
    const [scrollProgress, setScrollProgress] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const totalHeight = document.body.scrollHeight - window.innerHeight;
            if (totalHeight > 0) {
                const progress = Math.min(Math.max(window.scrollY / totalHeight, 0), 1);
                setScrollProgress(progress);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const dashOffset = 1 - scrollProgress;

    return (
        <div className="fixed bottom-6 left-0 w-full flex justify-center z-40 pointer-events-none">
            <div className="relative pointer-events-auto group">
                {/* Glass Container */}
                <div className="relative bg-[#161618]/80 backdrop-blur-2xl px-6 py-3 rounded-2xl flex items-center gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5">
                    
                    {/* Progress SVG Overlay */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none rounded-2xl overflow-visible" style={{ padding: '-2px' }}>
                        <rect 
                            x="1" y="1" 
                            width="calc(100% - 2px)" height="calc(100% - 2px)" 
                            rx="14" ry="14" 
                            fill="none" 
                            stroke="url(#dockGradient)" 
                            strokeWidth="2"
                            strokeDasharray="1"
                            strokeDashoffset={dashOffset}
                            pathLength="1"
                            strokeLinecap="round"
                            className="transition-[stroke-dashoffset] duration-100 ease-linear"
                        />
                        <defs>
                            <linearGradient id="dockGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#64D2FF" />
                                <stop offset="100%" stopColor="#BF5AF2" />
                            </linearGradient>
                        </defs>
                    </svg>

                    {/* Profile Button */}
                    <a 
                        href="https://sahrfa.top" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-white transition-colors duration-200"
                    >
                         <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                             <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                             <circle cx="12" cy="7" r="4"></circle>
                         </svg>
                    </a>

                    <div className="w-px h-8 bg-white/10"></div>

                    <DockItem 
                        icon={<polyline points="7 10 12 15 17 10"></polyline>}
                        extra={<line x1="12" y1="15" x2="12" y2="3"></line>}
                        base={<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>}
                        onClick={onSave}
                    />

                    {/* AI Coach Button */}
                    <DockItem 
                        icon={<path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 12 2z"></path>}
                        onClick={onAI}
                        activeColor="text-cyber-cyan"
                    />

                    <DockItem 
                        icon={<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>}
                        onClick={onFocus}
                    />
                    
                    <div className="w-px h-8 bg-white/10"></div>
                    
                    {/* Scroll Top */}
                    <DockItem 
                        icon={<polyline points="18 15 12 9 6 15"></polyline>}
                        onClick={onTop}
                    />

                </div>
            </div>
        </div>
    );
};

const DockItem: React.FC<{ 
    icon: React.ReactNode; 
    base?: React.ReactNode; 
    extra?: React.ReactNode;
    onClick: () => void;
    activeColor?: string;
}> = ({ icon, base, extra, onClick, activeColor = "text-gray-400" }) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center gap-1 ${activeColor} hover:text-white transition-colors duration-200`}
    >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {icon}
            {base}
            {extra}
        </svg>
    </button>
);

// --- AIModal ---
const AIModal: React.FC<{ isOpen: boolean; onClose: () => void; isLoading: boolean; data: AIResponse | null; questionText: string; context: string; onRefresh: () => void; }> = ({ isOpen, onClose, isLoading, data, questionText, context, onRefresh }) => {
    const [chatInput, setChatInput] = useState("");
    const [chatResponse, setChatResponse] = useState<string | null>(null);
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) {
            setChatResponse(null);
            setChatInput("");
        }
    }, [isOpen, questionText]);

    useEffect(() => {
        if (chatResponse && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatResponse]);

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        setChatLoading(true);
        const query = chatInput;
        setChatInput("");

        try {
            const answer = await askCoachCustom(questionText, context, query);
            setChatResponse(answer);
        } catch (error) {
            setChatResponse("দুঃখিত, সংযোগে সমস্যা হচ্ছে।");
        } finally {
            setChatLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
            <div 
                className="absolute inset-0 bg-black/90 backdrop-blur-md transition-opacity duration-300" 
                onClick={onClose}
            ></div>
            
            <div className="relative w-full max-w-2xl bg-[#121214] border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-h-[85vh] animate-scale-up">
                
                {/* Header */}
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyber-blue/20 to-cyber-purple/20 flex items-center justify-center border border-cyber-blue/30 shadow-[0_0_15px_rgba(10,132,255,0.2)]">
                            <span className="text-xl">👨‍🏫</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white tracking-wide">Coach Rifat</h3>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Online • Bengali</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                         <button 
                            onClick={onRefresh}
                            disabled={isLoading}
                            className="w-9 h-9 rounded-full bg-white/5 hover:bg-cyber-blue/20 flex items-center justify-center transition-colors text-white/40 hover:text-cyber-blue"
                            title="Refresh Answer"
                        >
                            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg>
                        </button>
                        <button 
                            onClick={onClose}
                            className="w-9 h-9 rounded-full bg-white/5 hover:bg-red-500/20 flex items-center justify-center transition-colors text-white/40 hover:text-red-400"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-[#0a0a0a]">
                    
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-6">
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 border-4 border-cyber-blue/20 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-cyber-blue border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <p className="text-cyber-blue animate-pulse text-sm font-medium tracking-wide">Coach Rifat is thinking...</p>
                        </div>
                    ) : data ? (
                        <div className="flex flex-col h-full">
                            <div className="p-6 space-y-8 pb-12">
                                {/* Question Context */}
                                <div className="bg-white/5 rounded-lg p-4 border-l-2 border-white/20">
                                    <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Question</p>
                                    <p className="text-gray-200 font-medium">{questionText}</p>
                                </div>

                                {/* Concept */}
                                <section>
                                    <h4 className="flex items-center gap-2 text-cyber-cyan text-xs font-bold uppercase tracking-wider mb-3">
                                        <span className="w-1 h-4 bg-cyber-cyan rounded-full"></span>
                                        সহজ ব্যাখ্যা (Simple Explanation)
                                    </h4>
                                    <p className="text-gray-100 text-lg leading-relaxed font-light">
                                        {data.concept}
                                    </p>
                                </section>

                                {/* Short Answer */}
                                <section className="bg-cyber-purple/5 border border-cyber-purple/10 rounded-xl p-5 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl select-none">✍️</div>
                                    <h4 className="text-cyber-purple text-xs font-bold uppercase tracking-wider mb-2 relative z-10">সংক্ষিপ্ত উত্তর (Short Answer)</h4>
                                    <p className="text-white font-medium text-lg leading-relaxed relative z-10">{data.shortAnswer}</p>
                                </section>

                                {/* Keywords */}
                                <section>
                                    <h4 className="text-cyber-blue text-xs font-bold uppercase tracking-wider mb-3">📝 মূল শব্দ (Keywords)</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {data.keywords.map((kw, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-[#0A84FF]/10 text-[#0A84FF] text-xs font-medium rounded-md border border-[#0A84FF]/20">
                                                {kw}
                                            </span>
                                        ))}
                                    </div>
                                </section>

                                {/* Dynamic Chat Response Area */}
                                {chatResponse && (
                                    <div className="mt-8 pt-8 border-t border-white/10 animate-[float_0.3s_ease-out]">
                                        <div className="flex gap-4">
                                            <div className="w-8 h-8 rounded-full bg-cyber-cyan/20 flex items-center justify-center shrink-0">
                                                👨‍🏫
                                            </div>
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-bold text-cyber-cyan">Coach Rifat's Answer</h4>
                                                <div className="text-gray-200 leading-relaxed bg-white/5 p-4 rounded-xl rounded-tl-none border border-white/10">
                                                    {chatResponse}
                                                </div>
                                            </div>
                                        </div>
                                        <div ref={chatEndRef}></div>
                                    </div>
                                )}

                                {chatLoading && (
                                    <div className="mt-8 pt-8 border-t border-white/10">
                                        <div className="flex gap-4">
                                            <div className="w-8 h-8 rounded-full bg-cyber-cyan/20 flex items-center justify-center shrink-0 animate-pulse">
                                                ...
                                            </div>
                                            <div className="text-sm text-gray-500 py-2">Coach Rifat লিখছেন...</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20 text-white/30">
                            Connection interrupted.
                        </div>
                    )}
                </div>

                {/* Chat Input Area */}
                <div className="p-4 bg-[#161618] border-t border-white/10">
                    <form onSubmit={handleChatSubmit} className="relative">
                        <input 
                            type="text" 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Coach Rifat কে প্রশ্ন করুন..." 
                            className="w-full bg-black/50 text-white placeholder-gray-500 rounded-xl py-3.5 pl-4 pr-12 border border-white/10 focus:border-cyber-blue/50 focus:ring-1 focus:ring-cyber-blue/50 outline-none transition-all"
                        />
                        <button 
                            type="submit"
                            disabled={!chatInput.trim() || chatLoading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-cyber-blue text-white rounded-lg flex items-center justify-center hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

// --- GlobalChatModal ---
const GlobalChatModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Load from Local Storage on mount
    useEffect(() => {
        const saved = localStorage.getItem('examforge_chat_history');
        if (saved) {
            setMessages(JSON.parse(saved));
        } else {
            // Initial Welcome Message
            const welcomeMsg: ChatMessage = {
                id: 'init-1',
                sender: 'ai',
                text: 'হ্যালো! আমি কোচ রিফাত। তোমার পড়াশোনা বিষয়ক কোনো প্রশ্ন থাকলে করতে পারো। মনে রাখবে, আমি একটি AI, তাই মাঝে মাঝে ভুল হতে পারে। পড়ালেখার বাইরে কোনো গল্প আমি করি না! 📚',
                timestamp: Date.now()
            };
            setMessages([welcomeMsg]);
            localStorage.setItem('examforge_chat_history', JSON.stringify([welcomeMsg]));
        }
    }, []);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            sender: 'user',
            text: input,
            timestamp: Date.now()
        };

        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        localStorage.setItem('examforge_chat_history', JSON.stringify(updatedMessages));
        setInput("");
        setLoading(true);

        try {
            const responseText = await askGlobalCoach(messages, userMsg.text);
            
            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                text: responseText,
                timestamp: Date.now()
            };
            
            const finalMessages = [...updatedMessages, aiMsg];
            setMessages(finalMessages);
            localStorage.setItem('examforge_chat_history', JSON.stringify(finalMessages));
        } catch (error) {
            const errorMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                text: "দুঃখিত, এখন সার্ভারে সমস্যা হচ্ছে।",
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-6">
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
                onClick={onClose}
            ></div>
            
            <div className="relative w-full md:max-w-md h-[85vh] md:h-[600px] bg-[#121214] border-t md:border border-white/10 md:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col animate-scale-up overflow-hidden">
                
                {/* Header */}
                <div className="p-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyber-cyan to-cyber-blue flex items-center justify-center text-black font-bold text-lg shadow-[0_0_15px_rgba(100,210,255,0.4)]">
                                R
                            </div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#121214] rounded-full"></div>
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Coach Rifat</h3>
                            <p className="text-[10px] text-gray-400">AI Tutor • Study Only</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#0a0a0a]">
                    {messages.map((msg) => (
                        <div 
                            key={msg.id} 
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div 
                                className={`
                                    max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed
                                    ${msg.sender === 'user' 
                                        ? 'bg-cyber-blue/20 text-cyber-cyan border border-cyber-blue/20 rounded-tr-sm' 
                                        : 'bg-white/5 text-gray-200 border border-white/10 rounded-tl-sm'}
                                `}
                            >
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-white/5 px-4 py-3 rounded-2xl rounded-tl-sm border border-white/10 flex gap-1">
                                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-75"></span>
                                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150"></span>
                            </div>
                        </div>
                    )}
                    <div ref={scrollRef}></div>
                </div>

                {/* Input Area */}
                <form onSubmit={handleSend} className="p-4 border-t border-white/10 bg-[#121214]">
                    <div className="relative">
                        <input 
                            type="text" 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="পড়াশোনা বিষয়ক প্রশ্ন করুন..." 
                            className="w-full bg-black/50 text-white placeholder-gray-600 rounded-xl py-3 pl-4 pr-12 border border-white/10 focus:border-cyber-cyan/50 focus:ring-1 focus:ring-cyber-cyan/50 outline-none transition-all"
                        />
                        <button 
                            type="submit" 
                            disabled={!input.trim() || loading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-cyber-cyan/10 text-cyber-cyan rounded-lg hover:bg-cyber-cyan/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ==========================================
//               MAIN APP
// ==========================================

const App: React.FC = () => {
    // --- State ---
    const [currentSubject, setCurrentSubject] = useState<Subject>(DEFAULT_SUBJECT);
    const [subjectMenuOpen, setSubjectMenuOpen] = useState(false);
    const [openCategories, setOpenCategories] = useState<string[]>(['very-short', 'short', 'essay', 'physics-vs', 'physics-short']);
    
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [globalChatOpen, setGlobalChatOpen] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiData, setAiData] = useState<AIResponse | null>(null);
    const [currentQuestionText, setCurrentQuestionText] = useState("");
    const [currentContext, setCurrentContext] = useState("");

    // --- Handlers ---
    
    // Close subject menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.subject-dropdown-container')) {
                setSubjectMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleCategory = (id: string) => {
        setOpenCategories(prev => 
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setToastMsg("Copied to clipboard!");
    };

    const handleAskAI = useCallback(async (text: string, context: string) => {
        setAiModalOpen(true);
        setAiLoading(true);
        setCurrentQuestionText(text);
        setCurrentContext(context);
        setAiData(null);

        try {
            const result = await askExamCoach(text, context);
            setAiData(result);
        } catch (error) {
            setToastMsg("AI connection failed. Try again.");
            setAiModalOpen(false);
        } finally {
            setAiLoading(false);
        }
    }, []);

    const handleFocusMode = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
            setToastMsg("Focus Mode: ON");
        } else {
            document.exitFullscreen();
            setToastMsg("Focus Mode: OFF");
        }
    };

    const handleScrollTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    const handleDownload = () => {
        // Generate Offline HTML content
        const htmlContent = `
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ExamForge Offline Preview - ${currentSubject.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background-color: #050505; color: #f5f5f7; font-family: sans-serif; }
    </style>
</head>
<body class="p-6 max-w-2xl mx-auto pb-40">
    <header class="mb-12 text-center">
        <h1 class="text-4xl font-black mb-3 text-white">${currentSubject.name}</h1>
        <p class="text-gray-700 font-mono text-[10px] mt-2">${currentSubject.name} Suggestions By Rifat</p>
    </header>
    ${currentSubject.data.map(category => `
        <div class="mb-8">
            <h2 class="text-[#64D2FF] font-bold text-lg uppercase tracking-widest mb-4">${category.title}</h2>
            <div class="bg-[#1c1c1e66] border border-white/10 rounded-2xl overflow-hidden">
                ${category.questions.map(q => `
                    <div class="border-b border-white/5 p-5">
                        <h3 class="text-white font-medium text-lg mb-4">${q.text}</h3>
                        <p class="text-gray-300 border-l-2 border-[#64D2FF]/30 pl-4 mb-4 text-lg">${q.answer}</p>
                        <div class="text-gray-400 text-sm bg-white/5 p-4 rounded-lg">
                            <strong class="text-[#64D2FF] block mb-2 text-xs uppercase">Details</strong>
                            ${q.extendedAnswer}
                        </div>
                        <div class="mt-4 flex gap-2">
                            <button onclick="alert('Please go to the website to use AI features.')" class="bg-[#0A84FF]/10 text-[#0A84FF] px-4 py-2 rounded text-xs font-bold border border-[#0A84FF]/20">COACH RIFAT (OFFLINE)</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('')}
    <div class="fixed bottom-0 left-0 w-full bg-[#161618] p-4 text-center text-gray-500 text-xs border-t border-white/10">
        Offline Preview Generated by ExamForge
    </div>
</body>
</html>`;

        const element = document.createElement("a");
        const file = new Blob([htmlContent], {type: 'text/html'});
        element.href = URL.createObjectURL(file);
        element.download = `${currentSubject.name.replace(/\s+/g, '_')}_Offline.html`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        setToastMsg("Offline Preview Downloaded!");
    };
    
    // Dynamic Font Size
    const getHeaderFontSize = (text: string) => {
        if (text.length < 10) return "text-5xl";
        if (text.length < 20) return "text-3xl";
        return "text-2xl";
    };

    // --- Render ---

    return (
        <div className="min-h-screen pb-40 relative text-gray-100 font-sans selection:bg-cyber-cyan/30 selection:text-white">
            
            {/* Ambient Background */}
            <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[#050505]"></div>
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyber-blue/10 rounded-full blur-[120px] animate-float opacity-40"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyber-purple/10 rounded-full blur-[120px] animate-float opacity-40" style={{ animationDelay: '-5s' }}></div>
            </div>

            <Toast message={toastMsg} onClose={() => setToastMsg(null)} />
            
            {/* Modal for specific question AI */}
            <AIModal 
                isOpen={aiModalOpen} 
                onClose={() => setAiModalOpen(false)} 
                isLoading={aiLoading} 
                data={aiData}
                questionText={currentQuestionText}
                context={currentContext}
                onRefresh={() => handleAskAI(currentQuestionText, currentContext)}
            />

            {/* Global Chat Modal */}
            <GlobalChatModal 
                isOpen={globalChatOpen}
                onClose={() => setGlobalChatOpen(false)}
            />

            <main className="max-w-2xl mx-auto px-4 md:px-6 py-10">
                {/* Header with Subject Switcher */}
                <header className="mb-12 text-center relative z-20 subject-dropdown-container">
                     <div className="relative inline-block w-full max-w-sm">
                        <div className="glass-panel rounded-2xl p-6 relative group transition-all duration-300 hover:border-white/20">
                            
                            <button 
                                onClick={() => setSubjectMenuOpen(!subjectMenuOpen)}
                                className={`font-black tracking-tighter text-white w-full text-center hover:opacity-90 transition-opacity mb-4 ${getHeaderFontSize(currentSubject.name)}`}
                            >
                                {currentSubject.name}
                            </button>
                            
                            {/* Bottom Center Dropdown Trigger */}
                            <button 
                                onClick={() => setSubjectMenuOpen(!subjectMenuOpen)}
                                className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-8 h-8 rounded-full bg-[#1c1c1e] border border-white/10 flex items-center justify-center text-gray-400 hover:text-cyber-cyan hover:border-cyber-cyan/50 transition-all z-10 shadow-lg"
                            >
                                <svg 
                                    className={`w-4 h-4 transition-transform duration-300 ${subjectMenuOpen ? 'rotate-180' : ''}`} 
                                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                >
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </button>
                        </div>

                        {/* Dropdown Menu */}
                        {subjectMenuOpen && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-6 w-64 glass-panel rounded-xl shadow-2xl border border-white/10 overflow-hidden animate-scale-up z-50">
                                <div className="p-2 space-y-1">
                                    {AVAILABLE_SUBJECTS.map((subject) => (
                                        <button
                                            key={subject.id}
                                            onClick={() => {
                                                setCurrentSubject(subject);
                                                setSubjectMenuOpen(false);
                                                setToastMsg(`Switched to ${subject.name}`);
                                            }}
                                            className={`
                                                w-full text-left px-4 py-3 rounded-lg text-sm font-bold transition-all
                                                ${currentSubject.id === subject.id 
                                                    ? 'bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/20' 
                                                    : 'text-gray-400 hover:text-white hover:bg-white/5'}
                                            `}
                                        >
                                            {subject.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                     </div>

                     <a 
                        href="https://sahrfa.top" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block mt-6 group"
                     >
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] animate-cyber-glow transition-all duration-300 hover:scale-105 cursor-pointer">
                            {currentSubject.name} Suggestions By Rifat
                        </p>
                     </a>
                </header>

                {/* Categories */}
                <div className="space-y-6">
                    {currentSubject.data.map((category) => {
                        const isExpanded = openCategories.includes(category.id);
                        return (
                            <section key={category.id} className="relative group">
                                {/* Category Label */}
                                <div 
                                    className="flex items-center justify-between mb-3 px-2 cursor-pointer opacity-80 hover:opacity-100 transition-opacity select-none"
                                    onClick={() => toggleCategory(category.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-1 h-4 bg-cyber-cyan rounded-full transition-all duration-300 ${isExpanded ? 'h-4 bg-cyber-cyan' : 'h-2 bg-gray-600'}`}></div>
                                        <h2 className={`font-bold text-sm tracking-widest uppercase transition-colors duration-300 ${isExpanded ? 'text-gray-100' : 'text-gray-400'}`}>
                                            {category.title}
                                        </h2>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-mono text-gray-600 bg-white/5 px-2 py-1 rounded border border-white/5">
                                            {category.questions.length} QUESTIONS
                                        </span>
                                        <svg 
                                            className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-cyber-cyan' : ''}`} 
                                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                        >
                                            <polyline points="6 9 12 15 18 9"></polyline>
                                        </svg>
                                    </div>
                                </div>

                                {/* Unified List Panel with Grid Animation */}
                                <div 
                                    className={`
                                        glass-panel rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a0a]/40 
                                        grid transition-[grid-template-rows,opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
                                        ${isExpanded ? 'grid-rows-[1fr] opacity-100 translate-y-0' : 'grid-rows-[0fr] opacity-0 -translate-y-2'}
                                    `}
                                >
                                    <div className="overflow-hidden min-h-0">
                                        <div className="flex flex-col">
                                            {category.questions.map((q) => (
                                                <QuestionItem 
                                                    key={q.id} 
                                                    question={q} 
                                                    onAskAI={handleAskAI}
                                                    onCopy={handleCopy}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        );
                    })}
                </div>
            </main>

            <Dock 
                onSave={handleDownload} 
                onFocus={handleFocusMode} 
                onAI={() => setGlobalChatOpen(true)} 
                onTop={handleScrollTop}
            />
        </div>
    );
};

// ==========================================
//               ROOT RENDER
// ==========================================

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element not found");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);