// ═══════════════════════════════════════════════════════════════════
// LoadingSkeleton.tsx — 加载骨架屏（达尔文进化论：感知性能优化）
// ═══════════════════════════════════════════════════════════════════

export default function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-[#EDE6DF] rounded-xl w-1/3" />
      <div className="h-4 bg-[#EDE6DF] rounded-lg w-2/3" />
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-24 bg-[#FBF8F5] rounded-2xl" />
        ))}
      </div>
      <div className="h-64 bg-[#FBF8F5] rounded-2xl" />
    </div>
  );
}
