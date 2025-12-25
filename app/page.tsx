// app/page.tsx
"use client";

import { useState, useMemo, useRef } from "react";
import Papa from "papaparse";
import { SiswaData } from "./types";
import { analyzeCategory } from "./utils/expertEngine";
import { BookOpen, AlertCircle, CheckCircle, BarChart3, Upload, FileText, Trash2 } from "lucide-react";

export default function Home() {
  const [data, setData] = useState<SiswaData[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fungsi menangani Upload File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        // Konversi hasil parse ke tipe SiswaData
        const parsedData = results.data as SiswaData[];
        setData(parsedData);
        
        // Otomatis pilih kategori pertama yang ditemukan
        if (parsedData.length > 0) {
          setSelectedCategory(parsedData[0].kategori_buku);
        }
      },
      error: (error) => {
        console.error("Error parsing CSV:", error);
        alert("Gagal membaca file CSV. Pastikan formatnya benar.");
      }
    });
  };

  const handleReset = () => {
    setData([]);
    setFileName("");
    setSelectedCategory("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Mendapatkan list unik kategori dari data yang diupload
  const categories = useMemo(() => {
    return Array.from(new Set(data.map((d) => d.kategori_buku))).filter(Boolean);
  }, [data]);

  // Jalankan analisis
  const result = useMemo(() => {
    if (!selectedCategory || data.length === 0) return null;
    return analyzeCategory(data, selectedCategory);
  }, [data, selectedCategory]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <header className="mb-10 text-center md:text-left border-b pb-6 bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <BookOpen className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">Sistem Pakar Pustaka</h1>
          </div>
          <p className="text-slate-600 ml-0 md:ml-14 max-w-2xl">
            Aplikasi pendukung keputusan untuk rekomendasi penambahan koleksi buku berdasarkan analisis minat baca siswa (Metode Forward Chaining).
          </p>
        </header>

        {/* AREA UPLOAD (Tampil jika belum ada data) */}
        {data.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border-2 border-dashed border-slate-300 p-12 text-center hover:border-blue-400 transition-colors">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-blue-50 p-4 rounded-full">
                <Upload className="h-10 w-10 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-slate-700">Upload Dataset CSV</h2>
              <p className="text-slate-500 max-w-md">
                Silakan upload file <code>data_minat_baca_100.csv</code> Anda di sini untuk memulai analisis.
              </p>
              
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileUpload} 
                ref={fileInputRef}
                className="hidden"
                id="csvUpload"
              />
              <label 
                htmlFor="csvUpload" 
                className="mt-4 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
              >
                Pilih File CSV
              </label>
            </div>
          </div>
        ) : (
          /* DASHBOARD ANALISIS (Tampil setelah upload) */
          <div className="space-y-6">
            
            {/* Info File & Reset */}
            <div className="flex justify-between items-center bg-blue-900 text-white p-4 rounded-lg shadow-md">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 opacity-80" />
                <span className="font-medium">{fileName}</span>
                <span className="text-xs bg-blue-700 px-2 py-1 rounded-full ml-2">
                  {data.length} Data Siswa
                </span>
              </div>
              <button 
                onClick={handleReset}
                className="flex items-center gap-1 text-sm bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded transition-colors"
              >
                <Trash2 className="h-4 w-4" /> Reset
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Sidebar Kategori */}
              <div className="md:col-span-4 lg:col-span-3 bg-white p-4 rounded-xl shadow-sm border h-fit">
                <h3 className="font-semibold text-slate-700 mb-3 px-2">Pilih Kategori Buku</h3>
                <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex justify-between items-center ${
                        selectedCategory === cat
                          ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Panel Utama Hasil Analisis */}
              <div className="md:col-span-8 lg:col-span-9 bg-white p-6 rounded-xl shadow-sm border min-h-[400px]">
                {result ? (
                  <div className="animate-in fade-in duration-500">
                    <div className="flex items-center gap-2 mb-6 border-b pb-4">
                      <BarChart3 className="h-6 w-6 text-blue-600" />
                      <h2 className="text-2xl font-bold text-slate-800">
                        Analisis: <span className="text-blue-600">{result.category}</span>
                      </h2>
                    </div>

                    {/* Kartu Statistik */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                      <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
                        <p className="text-sm text-slate-500 font-medium mb-1">Rata-rata Minat Siswa</p>
                        <div className="flex items-end gap-2">
                          <span className="text-3xl font-bold text-slate-900">{result.avgInterest}</span>
                          <span className="text-sm text-slate-400 mb-1">/ 100</span>
                        </div>
                        {/* Progress Bar Visual */}
                        <div className="w-full bg-slate-200 h-2 mt-3 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${result.avgInterest > 70 ? 'bg-green-500' : result.avgInterest > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                            style={{ width: `${result.avgInterest}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
                        <p className="text-sm text-slate-500 font-medium mb-1">Ketersediaan Saat Ini</p>
                        <p className="text-3xl font-bold text-slate-900">{result.dominanAvailability}</p>
                        <p className="text-xs text-slate-400 mt-2">Berdasarkan data {result.totalRequests} siswa</p>
                      </div>
                    </div>

                    {/* Kotak Rekomendasi (Highlight) */}
                    <div className={`p-6 rounded-xl border mb-6 relative overflow-hidden ${
                      result.priority === 'High' ? 'bg-red-50 border-red-200 text-red-900' :
                      result.priority === 'Medium' ? 'bg-amber-50 border-amber-200 text-amber-900' :
                      'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}>
                      <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
                        <div className={`p-3 rounded-full shrink-0 ${
                          result.priority === 'High' ? 'bg-red-100 text-red-600' :
                          result.priority === 'Medium' ? 'bg-amber-100 text-amber-600' :
                          'bg-emerald-100 text-emerald-600'
                        }`}>
                          {result.priority === 'High' || result.priority === 'Medium' ? 
                            <AlertCircle className="h-8 w-8" /> : 
                            <CheckCircle className="h-8 w-8" />
                          }
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider border px-2 py-0.5 rounded bg-white/50">
                              Prioritas: {result.priority}
                            </span>
                          </div>
                          <h3 className="text-xl md:text-2xl font-extrabold leading-tight">
                            {result.recommendation}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Penjelasan Logis */}
                    <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                      <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">Alasan Sistem Pakar:</h4>
                      <p className="text-slate-700 leading-relaxed">
                        "{result.reason}"
                      </p>
                    </div>

                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[300px]">
                    <BarChart3 className="h-12 w-12 mb-2 opacity-20" />
                    <p>Pilih kategori di samping untuk melihat analisis.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}