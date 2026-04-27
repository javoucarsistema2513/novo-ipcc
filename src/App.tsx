import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { 
  Church, 
  UserPlus, 
  FileText, 
  LogOut, 
  Phone, 
  MapPin, 
  User, 
  Download,
  Search,
  Loader2,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';
import { visitorService } from './services/visitorService';
import { Visitor } from './types';
import { User as SupabaseUser } from '@supabase/supabase-js';

// Extended jsPDF type for autotable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const PDFReportGenerator = (visitors: Visitor[]) => {
  const doc = new jsPDF() as jsPDFWithAutoTable;
  
  doc.setFontSize(20);
  doc.text('Relatório de Visitantes - Igreja', 14, 22);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);
  
  const tableData = visitors.map((v, i) => [
    i + 1,
    v.name,
    v.phone,
    v.invitedBy || '-',
    v.address,
    v.createdAt ? new Date(v.createdAt.seconds * 1000).toLocaleDateString('pt-BR') : '-'
  ]);
  
  doc.autoTable({
    startY: 35,
    head: [['#', 'Nome', 'Telefone', 'Convidado por', 'Endereço', 'Data']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 138] }
  });
  
  doc.save('relatorio-visitantes.pdf');
};

export default function App() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'register' | 'list'>('register');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Auth form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Visitor form states
  const [formData, setFormData] = useState({ name: '', phone: '', address: '', invitedBy: '' });

  useEffect(() => {
    // Check active sessions and sets up the observer
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        visitorService.testConnection();
        fetchVisitors();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        visitorService.testConnection();
        fetchVisitors();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchVisitors = async () => {
    try {
      const data = await visitorService.getVisitors();
      if (data) setVisitors(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
            }
          }
        });
        if (error) throw error;
        setAuthError('Verifique seu e-mail para confirmar o cadastro!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      console.error(error);
      setAuthError(error.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => supabase.auth.signOut();

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const { data } = await visitorService.addVisitor(formData);
      setMessage({ type: 'success', text: 'Visitante cadastrado com sucesso!' });
      setFormData({ name: '', phone: '', address: '', invitedBy: '' });
      fetchVisitors();
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao cadastrar visitante.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-900 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
        >
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <Church className="text-blue-600 w-8 h-8" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Portal do Visitante</h1>
          <p className="text-gray-500 text-center mb-8 text-sm">Entre com suas credenciais para acessar o sistema.</p>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {authError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100 italic">
                {authError}
              </div>
            )}

            {authMode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1 ml-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input 
                    required
                    type="text" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Seu nome"
                    className="input-field pl-10 py-2.5 text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1 ml-1">E-mail</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  required
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@igreja.com"
                  className="input-field pl-10 py-2.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1 ml-1">Senha</label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  required
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-10 py-2.5 text-sm"
                />
              </div>
            </div>

            <button 
              disabled={authLoading}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2 rounded-xl font-bold shadow-lg shadow-blue-200"
            >
              {authLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (authMode === 'login' ? 'Entrar Agora' : 'Criar Conta')}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3 text-xs text-gray-400 uppercase font-bold px-2">
            <hr className="flex-1 border-gray-100" />
            <span>ou continue com</span>
            <hr className="flex-1 border-gray-100" />
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="w-full mt-6 flex items-center justify-center gap-3 bg-white border border-gray-200 px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
            Google Workspace
          </button>

          <p className="mt-8 text-center text-sm text-gray-500">
            {authMode === 'login' ? 'Não tem uma conta?' : 'Já possui uma conta?'}
            <button 
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'signup' : 'login');
                setAuthError(null);
              }}
              className="ml-1 text-blue-600 font-bold hover:underline"
            >
              {authMode === 'login' ? 'Cadastre-se' : 'Faça Login'}
            </button>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row h-screen h-[100dvh] overflow-hidden bg-slate-50 font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden sm:flex flex-col w-20 lg:w-64 bg-white border-r border-slate-200 shrink-0 z-30">
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-50">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
            <Church className="w-6 h-6" />
          </div>
          <h1 className="font-black text-lg text-slate-800 hidden lg:block truncate">Sistema</h1>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button 
            onClick={() => setView('register')}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${view === 'register' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
          >
            <UserPlus className="w-6 h-6 shrink-0" />
            <span className="font-bold text-sm hidden lg:block">Novo Visitante</span>
          </button>
          <button 
            onClick={() => setView('list')}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${view === 'list' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
          >
            <FileText className="w-6 h-6 shrink-0" />
            <span className="font-bold text-sm hidden lg:block">Relatórios</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-50 shrink-0">
          <div className="bg-slate-50 p-3 rounded-2xl mb-3 hidden lg:block">
            <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Usuário Logado</p>
            <p className="text-xs font-bold text-slate-700 truncate">{user.user_metadata?.display_name || user.email || 'Usuário'}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
          >
            <LogOut className="w-6 h-6 shrink-0" />
            <span className="font-bold text-sm hidden lg:block">Sair do App</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header - Mobile */}
        <header className="sm:hidden flex bg-white/80 backdrop-blur-md border-b border-slate-100 h-14 shrink-0 z-20 px-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <Church className="w-5 h-5" />
            </div>
            <h1 className="font-black text-lg text-slate-900">Visitantes</h1>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-slate-400"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Content Scroll Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-10 sm:py-12 pb-24 sm:pb-12">
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              {view === 'register' ? (
                <motion.div 
                  key="register"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-8"
                >
                  <div className="mb-2">
                    <h2 className="text-3xl font-black text-slate-900 mb-2">Cadastrar Visitante</h2>
                    <p className="text-slate-500 font-medium tracking-tight">Registre as informações para o banco de dados da igreja.</p>
                  </div>

                  <div className="card-native transform transition-all duration-500 hover:shadow-2xl hover:shadow-blue-900/5">
                    {message && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className={`mb-8 p-5 rounded-2xl flex items-center gap-4 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}
                      >
                        {message.type === 'success' && <CheckCircle2 className="w-6 h-6 shrink-0" />}
                        <span className="font-bold text-sm">{message.text}</span>
                        <button onClick={() => setMessage(null)} className="ml-auto p-1 bg-white/20 rounded-lg hover:bg-white/40">×</button>
                      </motion.div>
                    )}

                    <form onSubmit={handleFormSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Visitante</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                          <input 
                            required
                            type="text" 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            placeholder="Nome completo do visitante"
                            className="input-field pl-12 h-14"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone Principal</label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                            <input 
                              required
                              type="tel" 
                              value={formData.phone}
                              onChange={(e) => setFormData({...formData, phone: e.target.value})}
                              placeholder="(00) 00000-0000"
                              className="input-field pl-12 h-14"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Quem Convidou?</label>
                          <div className="relative">
                            <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                            <input 
                              type="text" 
                              value={formData.invitedBy}
                              onChange={(e) => setFormData({...formData, invitedBy: e.target.value})}
                              placeholder="Nome da pessoa"
                              className="input-field pl-12 h-14"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Efetiva</label>
                          <input 
                            disabled
                            type="text" 
                            className="input-field bg-slate-50 text-slate-500 font-bold h-14 cursor-not-allowed"
                            value={new Date().toLocaleDateString('pt-BR')}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço Completo</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-4 text-slate-300 w-5 h-5" />
                          <textarea 
                            required
                            rows={3}
                            value={formData.address}
                            onChange={(e) => setFormData({...formData, address: e.target.value})}
                            placeholder="Rua, Número, Bairro e Cidade"
                            className="input-field pl-12 pt-4 resize-none"
                          />
                        </div>
                      </div>

                      <button 
                        disabled={isSubmitting}
                        className="w-full btn-primary h-16 flex items-center justify-center gap-3 text-lg"
                      >
                        {isSubmitting ? (
                          <Loader2 className="animate-spin w-6 h-6" />
                        ) : (
                          <>
                            <UserPlus className="w-6 h-6" />
                            <span>Confirmar Cadastro</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="list"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-8"
                >
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 mb-2">Histórico de Visitas</h2>
                      <p className="text-slate-500 font-medium tracking-tight">Total de {visitors.length} visitantes registrados.</p>
                    </div>
                    <button 
                      onClick={() => PDFReportGenerator(visitors)}
                      disabled={visitors.length === 0}
                      className="flex items-center justify-center gap-2 bg-blue-50 text-blue-700 h-14 px-8 rounded-2xl font-black hover:bg-blue-100 transition-all active:scale-95 disabled:opacity-40 shadow-sm"
                    >
                      <Download className="w-5 h-5" />
                      Exportar em PDF
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {visitors.length === 0 ? (
                      <div className="md:col-span-2 py-20 text-center flex flex-col items-center justify-center bg-white rounded-[40px] border-2 border-dashed border-slate-100">
                        <div className="bg-slate-50 p-6 rounded-full mb-4">
                          <Search className="w-12 h-12 text-slate-200" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">Vazio por aqui</h3>
                        <p className="text-slate-400 mt-1 max-w-[240px]">Os cadastros realizados aparecerão listados aqui.</p>
                      </div>
                    ) : (
                      visitors.map((v, i) => (
                        <motion.div 
                          key={v.id} 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
                              <User className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 bg-slate-50 px-3 py-1.5 rounded-full">
                              ID: {v.id?.slice(-4)}
                            </span>
                          </div>
                          
                          <h3 className="text-lg font-black text-slate-900 leading-tight mb-2 uppercase">{v.name}</h3>
                          
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 text-slate-600">
                              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <Phone className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-bold">{v.phone}</span>
                            </div>
                            {v.invitedBy && (
                              <div className="flex items-center gap-3 text-slate-600">
                                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                  <UserPlus className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-slate-500 italic">Convidado por {v.invitedBy}</span>
                              </div>
                            )}
                            <div className="flex items-start gap-3 text-slate-400">
                              <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                                <MapPin className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-medium leading-relaxed">{v.address}</span>
                            </div>
                          </div>
                          
                          <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center bg-slate-50/50 -mx-6 -mb-6 px-6 py-3 rounded-b-[32px]">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registrado em</span>
                            <span className="text-xs font-black text-slate-900">
                              {v.createdAt ? new Date(v.createdAt.seconds * 1000).toLocaleDateString('pt-BR') : '...'}
                            </span>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Mobile Navbar */}
        <nav className="sm:hidden bottom-nav fixed bottom-0 left-0 right-0 z-50">
          <button 
            onClick={() => setView('register')}
            className={`flex flex-col items-center gap-1 transition-all ${view === 'register' ? 'text-blue-600' : 'text-slate-300'}`}
          >
            <div className={`p-2 rounded-2xl transition-all ${view === 'register' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-transparent'}`}>
              <UserPlus className="w-6 h-6" />
            </div>
          </button>
          <button 
            onClick={() => setView('list')}
            className={`flex flex-col items-center gap-1 transition-all ${view === 'list' ? 'text-blue-600' : 'text-slate-300'}`}
          >
            <div className={`p-2 rounded-2xl transition-all ${view === 'list' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-transparent'}`}>
              <FileText className="w-6 h-6" />
            </div>
          </button>
        </nav>
      </div>
    </div>
  );
}
