"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ArrowLeftRight, Copy, Mic, Volume2, X, Loader2, BookOpen, Plus, Trash2, ChevronDown, ChevronUp, Download, Upload } from "lucide-react";
import { translate, learnWord, getUnknownWords, getFullDictionary, clearCustomDictionary, exportDictionaryAsJSON, importDictionaryFromJSON } from "@/lib/translator";

type Direction = "en-con" | "con-en";

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [direction, setDirection] = useState<Direction>("en-con");
  const [isRecording, setIsRecording] = useState(false);
  const [showDict, setShowDict] = useState(false);
  const [dictSearch, setDictSearch] = useState("");
  const [newEn, setNewEn] = useState("");
  const [newCon, setNewCon] = useState("");
  const [dictEntries, setDictEntries] = useState<{ english: string; concordian: string; isCustom: boolean }[]>([]);
  const [editingWord, setEditingWord] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  
  const recognitionRef = useRef<any>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const worker = useRef<Worker | null>(null);

  const labels = useMemo(() => {
    return direction === "en-con"
      ? { left: "English", right: "Concordian" }
      : { left: "Concordian", right: "English" };
  }, [direction]);

  const applyConcordianPronunciation = (text: string) => {
    return text
      .replace(/e/g, "ay")
      .replace(/E/g, "Ay")
      .replace(/z/g, "zh")
      .replace(/Z/g, "Zh")
      .replace(/x/g, "sh")
      .replace(/X/g, "Sh");
  };

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsRecording(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      if (!recognitionRef.current) {
        alert("Speech recognition is not supported in this browser.");
        return;
      }
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const handleSpeak = (text: string, isConcordian: boolean) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      
      const processedText = isConcordian
        ? applyConcordianPronunciation(text)
        : text;

      const utterance = new SpeechSynthesisUtterance(processedText);
      if (isConcordian) {
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.startsWith("it") || v.lang.startsWith("es")) || voices[0];
        if (preferredVoice) utterance.voice = preferredVoice;
        utterance.rate = 0.9;
      } else {
        utterance.lang = "en-US";
      }
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleTranslate = useCallback((text: string, dir: Direction) => {
    if (!text.trim()) {
      setOutputText("");
      return;
    }

    // Step 1: Instant dictionary-based translation (hash fallback for unknowns)
    const result = translate(text, dir);
    setOutputText(result);
  }, []);

  // Auto-translate on input change (debounced)
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (inputText) {
      debounceTimer.current = setTimeout(() => {
        handleTranslate(inputText, direction);
      }, 300);
    } else {
      setOutputText("");
    }

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [inputText, direction, handleTranslate]);

  const swapDirection = () => {
    setDirection((d) => (d === "en-con" ? "con-en" : "en-con"));
    setInputText(outputText);
    setOutputText(inputText);
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-bottom border-[#dadce0] py-3 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-[#5f6368]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"></path>
            </svg>
          </div>
          <span className="text-[22px] text-[#5f6368] font-google">Translate</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
            W
          </div>
        </div>
      </header>

       {/* Main Content */}
       <div className="translate-container">

        {/* Translation Card */}
        <div className="card shadow-sm">
          {/* Left Panel */}
          <div className="panel panel-left bg-white">
            <div className="lang-header">
              <button className="lang-tab active">
                {labels.left}
              </button>
              <button className="swap-button" onClick={swapDirection}>
                <ArrowLeftRight size={18} />
              </button>
              <button className="lang-tab active">
                {labels.right}
              </button>
            </div>

            <div className="text-area-container">
              <textarea
                className="text-area"
                placeholder="Type to translate"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <div className="absolute top-2 right-2 flex gap-2">
                {inputText && (
                  <button 
                    className="p-1 hover:bg-gray-100 rounded-full"
                    onClick={() => setInputText("")}
                  >
                    <X size={20} className="text-[#5f6368]" />
                  </button>
                )}
              </div>
              <div className="absolute bottom-4 right-4">
                <button 
                  className="px-6 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium rounded-md transition-colors"
                  onClick={() => handleTranslate(inputText, direction)}
                >
                  Translate
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-2">
                <button 
                  className={`p-2 hover:bg-gray-100 rounded-full text-[#5f6368] ${isRecording ? "text-red-500 animate-pulse bg-red-50" : ""}`}
                  onClick={toggleRecording}
                  title="Translate by voice"
                >
                  <Mic size={20} />
                </button>
                <button 
                  className="p-2 hover:bg-gray-100 rounded-full text-[#5f6368]"
                  onClick={() => handleSpeak(inputText, direction === "con-en")}
                  title="Listen"
                >
                  <Volume2 size={20} />
                </button>
              </div>
              <span className="text-xs text-[#5f6368]">{inputText.length} / 5000</span>
            </div>
          </div>

          {/* Right Panel */}
          <div className="panel bg-[#f5f5f5]">
            <div className="lang-header border-none">
              <button className="lang-tab active">
                {labels.right}
              </button>
            </div>

            <div className="text-area-container">
              <div className="translation-result text-[#3c4043]">
                {outputText || (
                  <span className="text-[#70757a]">Translation will appear here...</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-2">
                <button 
                  className="p-2 hover:bg-gray-200 rounded-full text-[#5f6368]" 
                  onClick={() => handleSpeak(outputText, direction === "en-con")}
                  title="Listen"
                >
                  <Volume2 size={20} />
                </button>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-200 rounded-full text-[#5f6368]" onClick={() => navigator.clipboard.writeText(outputText)}>
                  <Copy size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Dictionary Editor */}
        <div className="mt-6 border border-[#dadce0] rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-3 bg-white hover:bg-[#f8f9fa] transition-colors"
            onClick={() => {
              setShowDict(!showDict);
              if (!showDict) setDictEntries(getFullDictionary().map(e => ({
                ...e,
                isCustom: e.concordian.endsWith("(generated)"),
              })));
            }}
          >
            <span className="flex items-center gap-2 text-sm font-medium text-[#3c4043]">
              <BookOpen size={16} /> Dictionary Editor
            </span>
            {showDict ? <ChevronUp size={16} className="text-[#5f6368]" /> : <ChevronDown size={16} className="text-[#5f6368]" />}
          </button>

          {showDict && (
            <div className="border-t border-[#dadce0] bg-white">
              {/* Add new word */}
              <div className="flex gap-2 p-4 border-b border-[#dadce0] bg-[#f8f9fa]">
                <input
                  className="flex-1 px-3 py-2 text-sm border border-[#dadce0] rounded-md outline-none focus:border-[#1a73e8]"
                  placeholder="English word"
                  value={newEn}
                  onChange={(e) => setNewEn(e.target.value)}
                />
                <input
                  className="flex-1 px-3 py-2 text-sm border border-[#dadce0] rounded-md outline-none focus:border-[#1a73e8]"
                  placeholder="Concordian word"
                  value={newCon}
                  onChange={(e) => setNewCon(e.target.value)}
                />
                <button
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-md transition-colors disabled:opacity-50"
                  disabled={!newEn.trim() || !newCon.trim()}
                  onClick={() => {
                    learnWord(newEn.trim(), newCon.trim());
                    setNewEn("");
                    setNewCon("");
                    setDictEntries(getFullDictionary().map(e => ({
                      ...e,
                      isCustom: e.concordian.endsWith("(generated)"),
                    })));
                  }}
                >
                  <Plus size={14} /> Add
                </button>
              </div>

              {/* Search */}
              <div className="px-4 py-2 border-b border-[#dadce0]">
                <input
                  className="w-full px-3 py-2 text-sm border border-[#dadce0] rounded-md outline-none focus:border-[#1a73e8]"
                  placeholder="Search dictionary..."
                  value={dictSearch}
                  onChange={(e) => setDictSearch(e.target.value)}
                />
              </div>

              {/* Entries */}
              <div className="max-h-[400px] overflow-y-auto">
                {dictEntries
                  .filter((e) => {
                    if (!dictSearch) return true;
                    const q = dictSearch.toLowerCase();
                    return e.english.toLowerCase().includes(q) || e.concordian.toLowerCase().includes(q);
                  })
                  .map((entry) => {
                    const cleanCon = entry.concordian.replace(" (generated)", "");
                    return (
                      <div key={entry.english} className="flex items-center gap-3 px-4 py-2 border-b border-[#f1f3f4] hover:bg-[#f8f9fa] text-sm">
                        <span className="flex-1 text-[#3c4043] font-medium">{entry.english}</span>
                        <span className="text-[#5f6368]">→</span>
                        {editingWord === entry.english ? (
                          <input
                            className="flex-1 px-2 py-1 text-sm border border-[#1a73e8] rounded outline-none"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && editValue.trim()) {
                                learnWord(entry.english, editValue.trim());
                                setEditingWord(null);
                                setDictEntries(getFullDictionary().map(en => ({
                                  ...en,
                                  isCustom: en.concordian.endsWith("(generated)"),
                                })));
                              }
                              if (e.key === "Escape") setEditingWord(null);
                            }}
                            autoFocus
                          />
                        ) : (
                          <span
                            className={`flex-1 ${entry.isCustom ? "text-blue-600 cursor-pointer hover:underline" : "text-[#3c4043]"}`}
                            onClick={() => {
                              if (entry.isCustom) {
                                setEditingWord(entry.english);
                                setEditValue(cleanCon);
                              }
                            }}
                            title={entry.isCustom ? "Click to edit" : "Core dictionary (read-only)"}
                          >
                            {cleanCon}
                          </span>
                        )}
                        {entry.isCustom && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-500">custom</span>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2 bg-[#f8f9fa] border-t border-[#b0bec5] text-xs text-[#5f6368]">
                <span>
                  {dictEntries.length} entries · <span className="font-bold text-amber-600">Save often just in case! 🎮</span>
                </span>
                <div className="flex items-center gap-3">
                  <button
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    onClick={() => {
                      const json = exportDictionaryAsJSON();
                      const blob = new Blob([json], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "concordian_save.json";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download size={14} /> Export Save File
                  </button>
                  <label className="text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer">
                    <Upload size={14} /> Import Save File
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const contents = event.target?.result as string;
                            if (importDictionaryFromJSON(contents)) {
                              setDictEntries(getFullDictionary().map(en => ({
                                ...en,
                                isCustom: en.concordian.endsWith("(generated)"),
                              })));
                              alert("Save file imported successfully!");
                            } else {
                               alert("Invalid save file format.");
                            }
                          };
                          reader.readAsText(file);
                        }
                        // clear input
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <button
                    className="text-red-500 hover:text-red-700 ml-2 border-l border-[#dadce0] pl-3"
                    onClick={() => {
                      if (confirm("Clear all custom/generated words? Core dictionary will remain.")) {
                        clearCustomDictionary();
                        setDictEntries(getFullDictionary().map(e => ({
                          ...e,
                          isCustom: e.concordian.endsWith("(generated)"),
                        })));
                      }
                    }}
                  >
                    Erase Custom Words
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
