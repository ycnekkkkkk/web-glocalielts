"use client";
import { BookOpen, GraduationCap, Wallet, CreditCard, Receipt } from "lucide-react";

interface StudentFeeDetails {
  levelIn: string;
  levelOut: string;
  tuitionFee: number;
  paidFee: number;
}

interface StudentFeeCardProps {
  details: StudentFeeDetails;
  onUpdate: (field: keyof StudentFeeDetails, value: string | number) => void;
}

export default function StudentFeeCard({ details, onUpdate }: StudentFeeCardProps) {
  const remaining = details.tuitionFee - details.paidFee;

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + " VNĐ";
  };

  return (
    <div className="bg-brand-50/50 border border-brand-100 rounded-2xl p-4 mt-2 animate-in zoom-in-95 duration-200">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
            <BookOpen className="w-3 h-3" /> Trình độ đầu vào
          </label>
          <input
            type="text"
            value={details.levelIn}
            onChange={(e) => onUpdate("levelIn", e.target.value)}
            placeholder="VD: 4.5"
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500 transition-all"
          />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
            <GraduationCap className="w-3 h-3" /> Mục tiêu đầu ra
          </label>
          <input
            type="text"
            value={details.levelOut}
            onChange={(e) => onUpdate("levelOut", e.target.value)}
            placeholder="VD: 6.5"
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
            <Wallet className="w-3 h-3" /> Học phí
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={details.tuitionFee ? new Intl.NumberFormat("vi-VN").format(details.tuitionFee) : ""}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              onUpdate("tuitionFee", Number(val) || 0);
            }}
            placeholder="8.000.000"
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-black text-gray-900 focus:outline-none focus:border-brand-500 transition-all text-right"
          />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
            <CreditCard className="w-3 h-3" /> Đã đóng
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={details.paidFee ? new Intl.NumberFormat("vi-VN").format(details.paidFee) : ""}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              onUpdate("paidFee", Number(val) || 0);
            }}
            placeholder="2.000.000"
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-black text-emerald-600 focus:outline-none focus:border-brand-500 transition-all text-right"
          />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider text-amber-600">
            <Receipt className="w-3 h-3" /> Còn lại
          </label>
          <div className="w-full px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl text-sm font-black text-amber-700 text-right">
            {new Intl.NumberFormat("vi-VN").format(remaining)}
          </div>
        </div>
      </div>
      
      {details.paidFee > details.tuitionFee && (
        <p className="text-[10px] text-red-500 mt-2 font-medium">
          ⚠️ Số tiền đã đóng không được lớn hơn tổng học phí
        </p>
      )}
    </div>
  );
}
