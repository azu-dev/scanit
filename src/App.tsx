import Scanner from './components/Scanner';

function App() {
  return (
    <div className="min-h-screen w-full bg-surface text-white overflow-x-hidden">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-green-400/3 rounded-full blur-3xl" />
      </div>

      {/* App content */}
      <div className="relative z-10">
        <Scanner />
      </div>
    </div>
  );
}

export default App;
