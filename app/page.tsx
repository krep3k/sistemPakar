// app/page.tsx
import { useState, useMemo, useRef } from "react";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SiswaData } from "./types";
import { analyzeCategory } from "./utils/expertEngine";
import { 
  BookOpen, AlertCircle, CheckCircle, BarChart3, Upload, 
  FileText, Trash2, Download, Filter, Settings, ArrowRight 
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

// Definisi kebutuhan kolom sistem
const REQUIRED_FIELDS = [
  { key: 'kategori_buku', label: 'Kategori Buku (Misal: Sains, Novel)' },
  { key: 'minat_siswa', label: 'Skor Minat (Angka 0-100)' },
  { key: 'ketersediaan', label: 'Status Stok (Lengkap/Kurang)' },
  { key: 'kelas', label: 'Kelas (10/11/12)' }
];

export default function Home() {
  // State Utama
  const [data, setData] = useState<SiswaData[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("Semua");

  // State untuk Mapping Kolom
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 1. HANDLE UPLOAD & DETEKSI AWAL ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true, 
      complete: (results) => {
        const parsedData = results.data as any[];
        const headers = results.meta.fields || [];

        if (parsedData.length === 0) {
            alert("File kosong!"); 
            return;
        }

        // Cek apakah kolom standar SUDAH ADA semua?
        const isStandardFormat = REQUIRED_FIELDS.every(field => headers.includes(field.key));

        if (isStandardFormat) {
            // Jika format pas, langsung pakai
            setData(parsedData as SiswaData[]);
            setSelectedCategory(parsedData[0].kategori_buku);
        } else {
            // Jika beda, simpan data mentah & buka Modal Mapping
            setRawData(parsedData);
            setRawHeaders(headers);
            // Inisialisasi mapping kosong
            const initialMap: Record<string, string> = {};
            REQUIRED_FIELDS.forEach(f => initialMap[f.key] = "");
            setColumnMapping(initialMap);
            setShowMappingModal(true);
        }
      },
      error: (error) => alert(`Error: ${error.message}`)
    });
  };

  // --- 2. PROSES MAPPING DATA ---
  const handleApplyMapping = () => {
    // Validasi: Pastikan semua kolom sistem sudah dipilihkan pasangannya
    const allMapped = REQUIRED_FIELDS.every(f => columnMapping[f.key] !== "");
    if (!allMapped) {
        alert("Mohon pilih kolom CSV untuk semua data yang dibutuhkan sistem.");
        return;
    }

    // Transformasi Data: Raw CSV -> Standar Sistem
    const standardizedData: SiswaData[] = rawData.map((row, index) => ({
        id_siswa: String(index + 1), // Generate ID baru
        kelas: String(row[columnMapping['kelas']]),
        kategori_buku: String(row[columnMapping['kategori_buku']]),
        minat_siswa: Number(row[columnMapping['minat_siswa']]) || 0, // Pastikan jadi Number
        jumlah_buku: 0, // Dummy jika tidak ada
        status_minat: 'Sedang', // Dummy, akan dihitung ulang logic expert engine
        ketersediaan: String(row[columnMapping['ketersediaan']]) as any
    }));

    setData(standardizedData);
    if (standardizedData.length > 0) setSelectedCategory(standardizedData[0].kategori_buku);
    setShowMappingModal(false);
  };

  const handleReset = () => {
    setData([]);
    setFileName("");
    setRawData([]);
    setShowMappingModal(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- 3. LOGIC UTAMA (Sama seperti sebelumnya) ---
  const filteredData = useMemo(() => {
    if (selectedClass === "Semua") return data;
    return data.filter((d) => String(d.kelas) === selectedClass);
  }, [data, selectedClass]);

  const categories = useMemo(() => {
    return Array.from(new Set(filteredData.map((d) => d.kategori_buku))).filter(Boolean);
  }, [filteredData]);

  const result = useMemo(() => {
    if (!selectedCategory || filteredData.length === 0) return null;
    return analyzeCategory(filteredData, selectedCategory);
  }, [filteredData, selectedCategory]);

  const availabilityChartData = useMemo(() => {
    if (!result) return [];
    const categoryData = filteredData.filter(d => d.kategori_buku === selectedCategory);
    const counts: Record<string, number> = {};
    categoryData.forEach(d => {
        counts[d.ketersediaan] = (counts[d.ketersediaan] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [filteredData, selectedCategory, result]);

  const generatePDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text("Laporan Analisis Sistem Pakar", 14, 20);
    doc.setFontSize(10); doc.text(`Dataset: ${fileName}`, 14, 28);
    
    autoTable(doc, {
      startY: 45,
      head: [['Parameter', 'Hasil']],
      body: [
        ['Kategori', result.category],
        ['Skor Minat', result.avgInterest],
        ['Rekomendasi', result.recommendation],
        ['Prioritas', result.priority],
      ],
      theme: 'grid'
    });
    doc.save(`Analisis_${result.category}.pdf`);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900 relative">
      
      {/* --- MODAL MAPPING KOLOM (Hanya muncul jika format CSV beda) --- */}
      {showMappingModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in duration-300">
                <div className="flex items-center gap-3 mb-6 border-b pb-4">
                    <div className="bg-amber-100 p-2 rounded-full text-amber-600">
                        <Settings className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">Sesuaikan Data CSV</h3>
                        <p className="text-sm text-slate-500">Nama kolom di file Anda berbeda dengan sistem. Mohon pasangkan.</p>
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    {REQUIRED_FIELDS.map((field) => (
                        <div key={field.key} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center">
                            <label className="text-sm font-semibold text-slate-700">{field.label}</label>
                            <div className="flex items-center gap-2">
                                <ArrowRight className="h-4 w-4 text-slate-400 hidden md:block" />
                                <select title="columnMapping"
                                    className="w-full p-2 border rounded-lg bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500"
                                    value={columnMapping[field.key] || ""}
                                    onChange={(e) => setColumnMapping({...columnMapping, [field.key]: e.target.value})}
                                >
                                    <option value="">-- Pilih Kolom CSV --</option>
                                    {rawHeaders.map(h => (
                                        <option key={h} value={h}>{h}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-3">
                    <button onClick={handleReset} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Batal</button>
                    <button 
                        onClick={handleApplyMapping}
                        className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition shadow-lg"
                    >
                        Proses Data
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- KONTEN UTAMA (Dashboard) --- */}
      <div className={`max-w-6xl mx-auto transition-all ${showMappingModal ? 'blur-sm grayscale' : ''}`}>
        
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-600">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-lg text-white">
              <BookOpen className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Sistem Pakar Pustaka AI</h1>
              <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Multi-Dataset Support</p>
            </div>
          </div>
          {data.length > 0 && (
             <div className="flex gap-2 mt-4 md:mt-0">
               <button onClick={generatePDF} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 text-sm transition">
                 <Download className="h-4 w-4" /> PDF
               </button>
               <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm transition border border-red-200">
                 <Trash2 className="h-4 w-4" /> Reset
               </button>
             </div>
          )}
        </header>

        {/* AREA UPLOAD */}
        {data.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border-2 border-dashed border-slate-300 p-16 text-center hover:border-blue-400 transition-colors cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
            <div className="flex flex-col items-center gap-4 group-hover:scale-105 transition-transform">
              <div className="bg-blue-50 p-5 rounded-full">
                <Upload className="h-10 w-10 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-700">Upload Dataset CSV</h2>
              <p className="text-slate-500 max-w-lg mx-auto">
                Sistem mendukung format fleksibel. Jika nama kolom berbeda, sistem akan meminta Anda mencocokkannya secara otomatis.
              </p>
              <input type="file" accept=".csv" onChange={handleFileUpload} ref={fileInputRef} className="hidden" id="csvUpload" title="Upload CSV file" />
              <button className="mt-2 px-8 py-3 bg-blue-600 text-white font-bold rounded-full shadow-lg hover:bg-blue-700 hover:shadow-blue-200 transition-all">
                Pilih File Komputer
              </button>
            </div>
          </div>
        ) : (
          /* DASHBOARD HASIL */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* SIDEBAR */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white p-4 rounded-xl shadow-sm border">
                <div className="flex items-center gap-2 mb-3 text-slate-700 font-bold text-sm uppercase tracking-wide">
                    <Filter className="h-4 w-4" /> Filter Data
                </div>
                <label className="text-xs text-slate-400 mb-1 block">Tingkatan Kelas</label>
                <select title="selectedClass" 
                    value={selectedClass} 
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                >
                    <option value="Semua">Semua Kelas</option>
                    <option value="10">Kelas 10</option>
                    <option value="11">Kelas 11</option>
                    <option value="12">Kelas 12</option>
                </select>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border h-fit max-h-[500px] overflow-y-auto custom-scrollbar">
                <h3 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wide px-2">Kategori Buku</h3>
                <div className="space-y-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex justify-between items-center ${
                        selectedCategory === cat
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="lg:col-span-9 space-y-6">
              {result ? (
                <>
                {/* REKOMENDASI BOX */}
                <div className={`p-8 rounded-xl border relative overflow-hidden ${
                      result.priority === 'High' ? 'bg-red-50 border-red-200 text-red-900' :
                      result.priority === 'Medium' ? 'bg-amber-50 border-amber-200 text-amber-900' :
                      'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}>
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        {result.priority === 'High' ? <AlertCircle className="h-32 w-32"/> : <CheckCircle className="h-32 w-32"/>}
                    </div>
                    
                    <div className="relative z-10">
                        <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-white/60 mb-4 inline-block border ${
                             result.priority === 'High' ? 'border-red-200 text-red-600' :
                             result.priority === 'Medium' ? 'border-amber-200 text-amber-600' :
                             'border-emerald-200 text-emerald-600'
                        }`}>Prioritas: {result.priority}</span>
                        
                        <h2 className="text-3xl font-extrabold mb-3 leading-tight">{result.recommendation}</h2>
                        <p className="text-lg opacity-90 max-w-2xl leading-relaxed">"{result.reason}"</p>
                    </div>
                </div>

                {/* VISUALISASI CHART */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                        <h4 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-blue-500"/> Rata-Rata Minat
                        </h4>
                        <div className="flex items-end gap-2 mb-4">
                            <span className="text-5xl font-bold text-slate-800">{result.avgInterest}</span>
                            <span className="text-sm text-slate-400 mb-2 font-medium">dari 100 Poin</span>
                        </div>
                        <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-1000 ease-out ${result.avgInterest > 75 ? 'bg-emerald-500' : result.avgInterest > 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${result.avgInterest}%` }} />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border flex flex-col">
                        <h4 className="font-bold text-slate-700 mb-2">Komposisi Stok</h4>
                        <div className="flex-1 min-h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={availabilityChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                        {availabilityChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                    <Legend verticalAlign="bottom" height={36}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 min-h-[400px]">
                    <BarChart3 className="h-16 w-16 mb-4 opacity-20" />
                    <p className="font-medium">Pilih kategori buku di samping untuk memulai analisis.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}