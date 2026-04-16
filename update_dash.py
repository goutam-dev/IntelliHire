import re

file_path = 'c:/Users/keswa/Desktop/Intellihire/IntelliHire/frontend/src/pages/employer/Dashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

stat_card_replacement = '''const StatCard = ({ label, value, subtext, gradient = "from-blue-500 to-cyan-400" }) => (
  <motion.div
    variants={itemVariants}
    whileHover={{ y: -4, scale: 1.01 }}
    className="group relative flex flex-col justify-between rounded-2xl border border-slate-100/60 bg-white/80 backdrop-blur-md p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden"
  >
    <div className={bsolute top-0 left-0 h-1 w-full bg-gradient-to-r  opacity-80} />
    <div className="relative z-10">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-4xl font-light tracking-tight text-slate-900">{value}</h3>
      </div>
    </div>
    {subtext && (
      <div className="mt-4 flex items-center gap-2">
        <div className={h-1.5 w-1.5 rounded-full bg-gradient-to-r } />
        <p className="text-xs font-medium text-slate-500">{subtext}</p>
      </div>
    )}
    <div className={bsolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-gradient-to-br  opacity-[0.05] blur-2xl transition-all duration-500 group-hover:opacity-[0.15] group-hover:scale-110} />
  </motion.div>
);'''

# Using specific replace to safely grab StatCard
code = re.sub(r'const StatCard.*?</motion\.div>\s*\n\);', stat_card_replacement, code, flags=re.DOTALL)

code = code.replace('color="bg-emerald-500"', 'gradient="from-emerald-400 to-teal-500"')
code = code.replace('color="bg-blue-500"', 'gradient="from-blue-500 to-indigo-500"')
code = code.replace('color="bg-indigo-500"', 'gradient="from-indigo-400 to-purple-500"')

code = code.replace('bg-[#FAFAFA]', 'bg-slate-50 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/40 via-slate-50/20 to-slate-50')
code = code.replace('bg-slate-900 p-6 text-white shadow-lg', 'bg-gradient-to-br from-slate-900 to-indigo-950 p-6 text-white shadow-xl ring-1 ring-white/10')
code = code.replace('bg-white text-slate-600 border border-slate-200', 'bg-white/80 backdrop-blur text-slate-600 border border-slate-200/50')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("UI updated.")
