// app/utils/expertEngine.ts
import { SiswaData, AnalysisResult } from "../types";

function getMode(array: string[]): string {
  if (array.length === 0) return "-";
  return array.sort((a,b) =>
        array.filter(v => v===a).length - array.filter(v => v===b).length
    ).pop() || "Cukup";
}

export const analyzeCategory = (data: SiswaData[], category: string): AnalysisResult => {
  // 1. FILTERING (Mengambil fakta berdasarkan kategori)
  const categoryData = data.filter((d) => d.kategori_buku === category);
  
  if (categoryData.length === 0) {
    return {
      category,
      avgInterest: 0,
      dominanAvailability: '-',
      totalRequests: 0,
      recommendation: "TIDAK ADA DATA",
      priority: "Low",
      reason: "Tidak ditemukan data siswa untuk kategori ini dalam file CSV."
    };
  }

  // 2. KALKULASI FAKTA (Rata-rata & Modus)
  const totalInterest = categoryData.reduce((acc, curr) => acc + Number(curr.minat_siswa), 0);
  const avgInterest = totalInterest / categoryData.length;
  const dominanAvailability = getMode(categoryData.map((d) => d.ketersediaan));

  // 3. RULES ENGINE (Forward Chaining)
  // Aturan sesuai tabel keputusan di Laporan
  let recommendation = "";
  let priority: 'High' | 'Medium' | 'Low' = "Low";
  let reason = "";

  if (avgInterest >= 75 && (dominanAvailability === "Kurang" || dominanAvailability === "Cukup")) {
    recommendation = "SANGAT PRIORITAS: TAMBAH KOLEKSI";
    priority = "High";
    reason = "Minat siswa Sangat Tinggi tetapi ketersediaan buku Kurang/Terbatas.";
  } else if (avgInterest >= 50 && avgInterest < 75 && dominanAvailability === "Kurang") {
    recommendation = "PRIORITAS: TAMBAH KOLEKSI";
    priority = "Medium";
    reason = "Minat siswa Stabil (Sedang) namun stok buku kritis.";
  } else if (avgInterest >= 75 && dominanAvailability === "Lengkap") {
    recommendation = "PEMBARUAN EDISI (UPDATE)";
    priority = "Medium";
    reason = "Minat Tinggi dan stok Lengkap. Fokus pada kualitas/edisi terbaru.";
  } else if (avgInterest < 50 && dominanAvailability === "Lengkap") {
    recommendation = "TIDAK PERLU PENAMBAHAN";
    priority = "Low";
    reason = "Minat Rendah meski stok Lengkap. Evaluasi jenis buku.";
  } else {
    recommendation = "MONITORING BERKALA";
    priority = "Low";
    reason = "Kondisi seimbang atau data belum menunjukkan urgensi.";
  }

  return {
    category,
    avgInterest: parseFloat(avgInterest.toFixed(1)),
    dominanAvailability,
    totalRequests: categoryData.length,
    recommendation,
    priority,
    reason
  };
};